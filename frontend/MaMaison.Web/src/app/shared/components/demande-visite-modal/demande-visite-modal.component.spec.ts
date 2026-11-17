import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { DemandeVisiteModalComponent } from './demande-visite-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResult, Role } from '../../../core/models/auth.model';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { ToastService } from '../../../core/services/toast.service';

describe('DemandeVisiteModalComponent', () => {
  let fixture: ComponentFixture<DemandeVisiteModalComponent>;
  let component: DemandeVisiteModalComponent;
  let http: HttpTestingController;
  let router: Router;
  let previousOverflow: string;
  const user = signal<AuthResult | null>(null);
  const identity = { nom: 'Compte serveur', telephone: '+2250000000000' };

  beforeEach(async () => {
    previousOverflow = document.body.style.overflow;
    user.set({ ...identity, nom: 'Nom en cache', utilisateurId: 'synthetic-user', token: 'synthetic-test', role: Role.Visiteur, expiration: '2099-01-01T00:00:00Z' });
    await TestBed.configureTestingModule({
      imports: [DemandeVisiteModalComponent],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: { user: user.asReadonly(), getToken: () => user()?.token ?? null } },
        { provide: ToastService, useValue: { succes: jasmine.createSpy() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/locations/bien-test?source=favoris#contact');
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  function create(loadAccount = true) {
    fixture = TestBed.createComponent(DemandeVisiteModalComponent);
    component = fixture.componentInstance;
    component.bienId = 'bien-test';
    component.titreBien = 'Bien de test';
    fixture.detectChanges();
    if (loadAccount) {
      http.expectOne('/api/profil').flush(identity);
      fixture.detectChanges();
    }
  }

  afterEach(() => {
    http.verify();
    fixture?.destroy();
    document.body.style.overflow = previousOverflow;
  });

  it('never submits anonymously and returns login to the exact property URL', fakeAsync(() => {
    user.set(null);
    create(false);
    expect(component.etat()).toBe('connexion');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    http.expectNone('/api/profil');
    component.soumettre();
    http.expectNone('/api/demandesvisite');
    component.seConnecter();
    tick();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/locations/bien-test?source=favoris#contact', reason: 'session-expiree' } });
  }));

  it('uses the visit reason for an anonymous login from the visible button', fakeAsync(() => {
    user.set(null);
    create(false);
    component.seConnecter();
    tick();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/locations/bien-test?source=favoris#contact', reason: 'visite' } });
  }));

  it('shows the current account identity without editable name or phone fields', () => {
    create();
    expect(fixture.nativeElement.textContent).toContain('Compte serveur');
    expect(fixture.nativeElement.querySelector('input[name="nom"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="tel"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/profil"]')).not.toBeNull();
  });

  it('uses the existing payload and bearer interceptor, never a client-supplied user id', () => {
    create();
    component.commentaire = '  Disponible demain  ';
    component.dateSouhaitee = '2099-12-31';
    component.soumettre();
    component.soumettre();
    const request = http.expectOne('/api/demandesvisite');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer synthetic-test');
    expect(request.request.body).toEqual({ bienId: 'bien-test', nom: identity.nom, telephone: identity.telephone, dateSouhaitee: '2099-12-31', commentaire: 'Disponible demain' });
    expect(request.request.body.utilisateurId).toBeUndefined();
    request.flush({ id: 'demande-test', message: 'OK' });
    fixture.detectChanges();
    expect(component.etat()).toBe('succes');
    expect(fixture.nativeElement.textContent).toContain('en attente de confirmation');
    component.soumettre();
    http.expectNone('/api/demandesvisite');
  });

  it('gates expired sessions before loading the account', () => {
    user.set({ ...user()!, expiration: '2000-01-01T00:00:00Z' });
    create(false);
    expect(component.etat()).toBe('connexion');
    expect(component.messageErreur).toContain('session a expiré');
    http.expectNone('/api/profil');
  });

  it('rechecks expiry before submission', () => {
    create();
    user.set({ ...user()!, expiration: '2000-01-01T00:00:00Z' });
    component.soumettre();
    expect(component.etat()).toBe('connexion');
    http.expectNone('/api/demandesvisite');
  });

  it('shows login after an API 401 without automatically resending', fakeAsync(() => {
    create();
    component.soumettre();
    http.expectOne('/api/demandesvisite').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(component.etat()).toBe('connexion');
    component.seConnecter();
    tick();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/locations/bien-test?source=favoris#contact', reason: 'session-expiree' } });
    http.expectNone('/api/demandesvisite');
  }));

  for (const [status, message] of [[400, 'pas été acceptée'], [403, 'pas autorisé'], [404, 'indisponible'], [429, 'Trop de demandes'], [500, 'Consultez vos demandes']] as const) {
    it('explains a visit error ' + status + ' and keeps the draft', () => {
      create();
      component.commentaire = 'Message conservé';
      component.soumettre();
      http.expectOne('/api/demandesvisite').flush({}, { status, statusText: 'Failure' });
      expect(component.etat()).toBe('erreur');
      expect(component.messageErreur).toContain(message);
      expect(component.commentaire).toBe('Message conservé');
    });
  }

  it('offers a retry when account loading fails, without sending unknown identity', () => {
    create(false);
    http.expectOne('/api/profil').error(new ProgressEvent('error'));
    expect(component.messageErreur).toContain('injoignable');
    component.soumettre();
    http.expectNone('/api/demandesvisite');
    component.chargerCompte();
    http.expectOne('/api/profil').flush(identity);
    expect(component.compte()).toEqual(identity);
  });

  it('rejects dates in the past', () => {
    create();
    component.dateSouhaitee = '2000-01-01';
    component.soumettre();
    expect(component.messageErreur).toContain('aujourd’hui');
    http.expectNone('/api/demandesvisite');
  });

  it('preserves callback mode without submitting a hidden date', () => {
    create();
    component.mode = 'rappel';
    component.dateSouhaitee = '2000-01-01';
    component.soumettre();
    const request = http.expectOne('/api/demandesvisite');
    expect(request.request.body.dateSouhaitee).toBeUndefined();
    request.flush({ id: 'demande-test', message: 'OK' });
  });

  it('restores the original body overflow when destroyed by navigation', () => {
    document.body.style.overflow = 'auto';
    create();
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    expect(document.body.style.overflow).toBe('auto');
  });
});
