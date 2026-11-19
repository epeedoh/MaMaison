import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfilComponent } from './profil.component';
import { AuthService } from '../../core/services/auth.service';
import { AuthResult, Role, RoleLabels } from '../../core/models/auth.model';
import { FavorisService } from '../../core/services/favoris.service';
import { ToastService } from '../../core/services/toast.service';

describe('ProfilComponent', () => {
  let fixture: ComponentFixture<ProfilComponent>;
  let component: ProfilComponent;
  let http: HttpTestingController;
  const user = signal<AuthResult | null>(null);
  const profil = { nom: 'Compte test', telephone: '+2250000000000', email: 'test@example.invalid', role: Role.Visiteur };
  const publishers = [Role.Proprietaire, Role.Promoteur, Role.Demarcheur, Role.AgentImmobilier, Role.Admin, Role.SuperAdmin];

  beforeEach(async () => {
    user.set({ ...profil, token: 'synthetic-test', expiration: '2099-01-01T00:00:00Z', utilisateurId: 'test-user' });
    await TestBed.configureTestingModule({
      imports: [ProfilComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: {
          user: user.asReadonly(),
          peutPublier: computed(() => publishers.includes(user()!.role)),
          estAdmin: computed(() => [Role.Admin, Role.SuperAdmin].includes(user()!.role)),
          deconnecter: jasmine.createSpy(),
          actualiserNom: jasmine.createSpy().and.callFake((nom: string) => user.set({ ...user()!, nom })),
        } },
        { provide: FavorisService, useValue: { count: signal(0), favoris: signal([]), viderFavoris: jasmine.createSpy(), retirerFavori: jasmine.createSpy() } },
        { provide: ToastService, useValue: { succes: jasmine.createSpy() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfilComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/profil').flush(profil);
    http.expectOne('/api/profil/stats').flush({ nbDemandes: 2, nbLocations: 1, nbSignalements: 0 });
    fixture.detectChanges();
  });

  afterEach(() => { http.verify(); fixture.destroy(); });

  for (const role of Object.values(Role).filter((value): value is Role => typeof value === 'number')) {
    it('shows named role and allowed actions for ' + Role[role], () => {
      user.set({ ...user()!, role });
      component.profil.set({ ...profil, role });
      fixture.detectChanges();
      const html: HTMLElement = fixture.nativeElement;
      expect(html.querySelector('.role-label')?.textContent).toContain(RoleLabels[role]);
      expect(html.querySelector('.profile-tabs')?.textContent?.includes('Mes annonces')).toBe(publishers.includes(role));
      expect(!!html.querySelector('a[href="/publier"]')).toBe(publishers.includes(role));
      expect(!!html.querySelector('a[href="/admin"]')).toBe([Role.Admin, Role.SuperAdmin].includes(role));
    });
  }

  it('blocks visitor listing loads even when the method is called directly', () => {
    component.allerOnglet('annonces');
    component.chargerAnnonces();
    expect(component.onglet()).toBe('resume');
    http.expectNone('/api/profil/locations');
    expect(fixture.nativeElement.textContent).not.toContain('Mes annonces');
  });

  it('updates the displayed and account names after save without clearing an unchanged email', () => {
    component.activerEdit();
    expect(component.editEmail).toBe(profil.email);
    component.editNom = '  Nouveau nom  ';
    component.editEmail = '';
    component.sauvegarderProfil();
    component.sauvegarderProfil();
    const request = http.expectOne('/api/profil');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ nom: 'Nouveau nom', email: null });
    request.flush({ message: 'OK', nom: 'Nouveau nom', email: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Nouveau nom');
    expect(component.profil()?.email).toBe(profil.email);
    expect(user()?.nom).toBe('Nouveau nom');
    expect(component.saving()).toBeFalse();
    expect(component.editMode).toBeFalse();
  });

  it('retains the editor and original profile when save fails', () => {
    component.activerEdit();
    component.editNom = 'Nouveau nom';
    component.sauvegarderProfil();
    http.expectOne('/api/profil').flush({}, { status: 500, statusText: 'Failure' });
    expect(component.editMode).toBeTrue();
    expect(component.nomAffiche()).toBe(profil.nom);
    expect(component.editNom).toBe('Nouveau nom');
    expect(component.saveErreur).toContain('pas été enregistré');
    expect(component.saving()).toBeFalse();
  });

  it('does not send invalid profile values', () => {
    component.activerEdit();
    component.editEmail = 'not-an-email';
    component.sauvegarderProfil();
    expect(component.saveErreur).toBeTruthy();
    http.expectNone('/api/profil');
  });

  it('distinguishes request loading, failure and successful empty results', () => {
    component.allerOnglet('demandes');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement des demandes');
    expect(fixture.nativeElement.textContent).not.toContain('Aucune demande');
    http.expectOne('/api/profil/demandes').flush({}, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('pas pu être chargées');
    expect(fixture.nativeElement.textContent).not.toContain('Aucune demande');
    component.chargerDemandes();
    http.expectOne('/api/profil/demandes').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune demande envoyée');
    component.allerOnglet('resume');
    component.allerOnglet('demandes');
    http.expectNone('/api/profil/demandes');
  });

  it('does not replace failed statistics with misleading zero counts', () => {
    component.chargerStats();
    http.expectOne('/api/profil/stats').flush({}, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stats-grid')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('indicateurs sont indisponibles');
  });

  it('offers an explicit login return to the profile after a 401', () => {
    component.allerOnglet('demandes');
    http.expectOne('/api/profil/demandes').flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href^="/login"]');
    expect(link.getAttribute('href')).toContain('returnUrl=%2Fprofil');
    expect(link.textContent).toContain('Se reconnecter');
  });

  it('preserves listing details, status and the existing justificatifs component', () => {
    user.set({ ...user()!, role: Role.Proprietaire });
    component.allerOnglet('annonces');
    http.expectOne('/api/profil/locations').flush([{ id: 'location-test', titre: 'Location test', quartier: 'Quartier', commune: 'Commune', loyer: 150000, statut: 1, proprietaire:true, dateCreation: '2026-11-16' }]);
    fixture.detectChanges();
    const detail=fixture.nativeElement.querySelector('app-dossier-location details') as HTMLDetailsElement;
    detail.open=true;
    detail.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();
    http.expectOne('/api/biens/location-test/justificatifs').flush([]);
    expect(fixture.nativeElement.querySelector('app-justificatifs')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/locations/location-test"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('En vérification');
  });
});
