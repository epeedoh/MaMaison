import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthResult } from '../../core/models/auth.model';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let router: Router;
  let params: Record<string, string>;
  let result: Subject<AuthResult>;
  let auth: { login: jasmine.Spy; estAdmin: jasmine.Spy };

  beforeEach(async () => {
    params = {};
    result = new Subject<AuthResult>();
    auth = { login: jasmine.createSpy().and.returnValue(result), estAdmin: jasmine.createSpy().and.returnValue(false) };
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(params); } } } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  function create() {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.telephone = '  +2250000000000  ';
    component.motDePasse = 'synthetic-test-password';
  }

  afterEach(() => fixture?.destroy());

  it('preserves a property destination including query and fragment', fakeAsync(() => {
    params = { returnUrl: '/locations/test-bien?source=favoris#visite', reason: 'visite' };
    create();
    expect(fixture.nativeElement.textContent).toContain('la fiche du bien');
    component.soumettre();
    component.soumettre();
    expect(auth.login.calls.count()).toBe(1);
    expect(auth.login.calls.mostRecent().args[0].telephone).toBe('+2250000000000');
    result.next({} as AuthResult);
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/locations/test-bien?source=favoris#visite');
  }));

  for (const destination of ['https://example.invalid', '//example.invalid', '/\\example.invalid', '/login', '/register', '/unknown', '/locations/%2F%2Fevil', '/profil(aux:admin)']) {
    it('rejects unsupported or unsafe return destination ' + destination, () => {
      params = { returnUrl: destination };
      create();
      expect(component.returnUrl).toBeNull();
    });
  }

  it('returns a normal account to its profile by default', fakeAsync(() => {
    create();
    component.soumettre();
    result.next({} as AuthResult);
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profil');
  }));

  it('keeps the administration default for administrators', fakeAsync(() => {
    auth.estAdmin.and.returnValue(true);
    create();
    component.soumettre();
    result.next({} as AuthResult);
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
  }));

  for (const [status, message] of [[0, 'serveur impossible'], [401, 'Téléphone ou mot de passe'], [403, 'pas autorisé'], [429, 'Trop de tentatives'], [500, 'indisponible']] as const) {
    it('explains login failure ' + status + ' without leaking server details', () => {
      auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status, error: { message: 'internal diagnostic' } })));
      create();
      component.soumettre();
      expect(component.etat()).toBe('erreur');
      expect(component.erreurMsg).toContain(message);
      expect(component.erreurMsg).not.toContain('internal diagnostic');
    });
  }

  it('reports navigation failure after successful authentication', fakeAsync(() => {
    (router.navigateByUrl as jasmine.Spy).and.resolveTo(false);
    create();
    component.soumettre();
    result.next({} as AuthResult);
    tick();
    expect(component.erreurMsg).toContain('Connexion réussie');
    expect(component.etat()).toBe('erreur');
  }));
});
