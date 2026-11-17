import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ContactComponent } from './contact.component';
import { ContactDraftStore } from './contact-draft.store';
import { DiasporaComponent } from '../diaspora/diaspora.component';
import { PartenairesComponent } from '../partenaires/partenaires.component';
import { VillaDetailComponent } from '../villas/pages/villa-detail/villa-detail';
import { LocationDetailComponent } from '../locations/pages/location-detail/location-detail';
import { AuthService } from '../../core/services/auth.service';
import { AuthResult } from '../../core/models/auth.model';
import { SiteConfigService } from '../../core/services/site-config.service';
import { VillaService } from '../../core/services/villa.service';
import { LocationService } from '../../core/services/location.service';
import { StatistiquesService } from '../../core/services/statistiques.service';
import { SeoService } from '../../core/services/seo.service';
import { FavorisService } from '../../core/services/favoris.service';
import { environment } from '../../../environments/environment';

describe('Pilot contact paths', () => {
  const endpoint = `${environment.apiUrl}/demandesvisite`;
  const account: AuthResult = {
    nom: 'Compte test', telephone: '+2250712345678', token: 'synthetic',
    utilisateurId: '11111111-1111-1111-1111-111111111111', role: 1,
    expiration: '2099-01-01T00:00:00Z',
  };
  const user = signal<AuthResult | null>(null);
  let http: HttpTestingController;
  let route: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap>; paramMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(() => {
    user.set(account);
    route = { snapshot: { queryParamMap: convertToParamMap({}), paramMap: convertToParamMap({ id: 'test-property' }) } };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: { user, estConnecte: computed(() => !!user()) } },
        { provide: VillaService, useValue: { obtenirDetail: () => of({
          id: 'test-property', titre: 'Villa test & jardin', quartier: 'Test', ville: 'Test',
          prix: 1000000, surfaceHabitable: 100, nombrePieces: 3, typeVilla: 0,
          latitude: null, longitude: null, pointsVisite: [], modele3DUrl: '/not-this-model.glb',
        }) } },
        { provide: LocationService, useValue: { obtenirDetail: () => of({
          id: 'test-property', titre: 'Location test & jardin', quartier: 'Test', commune: 'Test',
          typeBien: 1, loyer: 100000, caution: 100000, avance: 100000, fraisAgence: 0,
          totalAPrevoir: 300000, nombrePieces: 2, latitude: null, longitude: null,
        }) } },
        { provide: StatistiquesService, useValue: { analyserBien: () => of(null) } },
        { provide: SeoService, useValue: { setPage: jasmine.createSpy('setPage') } },
        { provide: FavorisService, useValue: { estFavori: () => false } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function contact() {
    const fixture = TestBed.createComponent(ContactComponent);
    http.expectOne('/site-config.json').flush({});
    fixture.detectChanges();
    fixture.componentInstance.message = 'Mon projet';
    return fixture;
  }

  it('shows account name and phone as read-only with a profile link', async () => {
    const fixture = contact();
    const component = fixture.componentInstance;
    await fixture.whenStable();
    expect(component.nom).toBe(account.nom);
    expect(component.telephone).toBe(account.telephone);
    const root: HTMLElement = fixture.nativeElement;
    const nom = root.querySelector<HTMLInputElement>('[name="nom"]')!;
    const telephone = root.querySelector<HTMLInputElement>('[name="telephone"]')!;
    expect(nom.value).toBe(account.nom);
    expect(telephone.value).toBe(account.telephone);
    expect(nom.readOnly).toBeTrue();
    expect(telephone.readOnly).toBeTrue();
    expect(root.querySelector('a[href="/profil"]')?.textContent).toBe('Mon compte');
    expect(root.textContent).toContain('Votre demande de contact est rattachée à votre compte');
  });

  it('does not collect unused name and phone before login', () => {
    user.set(null);
    const root: HTMLElement = contact().nativeElement;
    expect(root.querySelector('[name="nom"]')).toBeNull();
    expect(root.querySelector('[name="telephone"]')).toBeNull();
    expect(root.textContent).toContain('Le contact sera rattaché au nom et au téléphone de votre compte');
  });

  it('restores the message but uses the current account after reconnecting', async () => {
    const fixture = contact();
    fixture.componentInstance.email = 'other@example.com';
    fixture.componentInstance.conserverFormulaire();
    expect(TestBed.inject(ContactDraftStore).value).toEqual({
      email: 'other@example.com', sujet: 'Achat villa', message: 'Mon projet',
    });
    fixture.destroy();
    const currentAccount = { ...account, nom: 'Autre compte', telephone: '+2250798765432' };
    user.set(currentAccount);
    const resumed = TestBed.createComponent(ContactComponent);
    resumed.detectChanges();
    await resumed.whenStable();
    expect(resumed.componentInstance.message).toBe('Mon projet');
    expect(resumed.componentInstance.nom).toBe(currentAccount.nom);
    expect(resumed.componentInstance.telephone).toBe(currentAccount.telephone);
    expect(resumed.nativeElement.querySelector('[name="nom"]').value).toBe(currentAccount.nom);
    resumed.componentInstance.soumettre();
    const request = http.expectOne(endpoint);
    expect(request.request.body.nom).toBe(currentAccount.nom);
    expect(request.request.body.telephone).toBe(currentAccount.telephone);
    request.flush({ id: 'saved-request', message: 'OK' });
  });

  it('keeps the optional editable email in the persisted comment', async () => {
    const fixture = contact();
    const component = fixture.componentInstance;
    component.email = 'contact@example.com';
    fixture.detectChanges();
    await fixture.whenStable();
    const email: HTMLInputElement = fixture.nativeElement.querySelector('[name="email"]');
    expect(email.required).toBeFalse();
    expect(email.readOnly).toBeFalse();
    component.soumettre();
    const request = http.expectOne(endpoint);
    expect(request.request.body.email).toBe('contact@example.com');
    expect(request.request.body.commentaire).toBe('[Achat villa] Mon projet | Email: contact@example.com');
    request.flush({ id: 'saved-request', message: 'OK' });
  });

  for (const sujet of ['Mode diaspora / rapport terrain', 'Devenir partenaire', 'Notaires', 'Géomètres', 'Banques & Financement', 'Assurances']) {
    it(`preserves the ${sujet} subject in the complete generic command`, () => {
      route.snapshot.queryParamMap = convertToParamMap({ sujet });
      const component = contact().componentInstance;
      component.soumettre();
      expect(component.etat()).toBe('chargement');
      const request = http.expectOne(endpoint);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        bienId: '00000000-0000-0000-0000-000000000000', nom: account.nom,
        telephone: account.telephone, email: undefined, commentaire: `[${sujet}] Mon projet`,
      });
      request.flush({ id: 'saved-request', message: 'OK' }, { status: 201, statusText: 'Created' });
      expect(component.etat()).toBe('succes');
    });
  }

  it('redirects anonymous users only to login with a generated local return URL and keeps the draft', () => {
    user.set(null);
    route.snapshot.queryParamMap = convertToParamMap({ sujet: 'Notaires', returnUrl: 'https://untrusted.example' });
    const fixture = contact();
    const component = fixture.componentInstance;
    component.email = 'test@example.com';
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.soumettre();
    http.expectNone(endpoint);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/contact?sujet=Notaires' } });
    expect(component.etat()).toBe('form');
    fixture.destroy();
    user.set(account);
    const resumed = TestBed.createComponent(ContactComponent).componentInstance;
    expect(resumed.message).toBe('Mon projet');
    expect(resumed.email).toBe('test@example.com');
    expect(resumed.sujet).toBe('Notaires');
    expect(resumed.nom).toBe(account.nom);
    expect(resumed.telephone).toBe(account.telephone);
  });

  it('ignores unrecognized subject and return URL query parameters', () => {
    route.snapshot.queryParamMap = convertToParamMap({ sujet: '//untrusted.example', returnUrl: '//untrusted.example' });
    const component = contact().componentInstance;
    expect(component.sujet).toBe('Achat villa');
    expect(component.returnUrl).toBe('/contact?sujet=Achat%20villa');
  });

  it('keeps all fields visible on 401 and offers a login link without automatic navigation', async () => {
    const fixture = contact();
    const component = fixture.componentInstance;
    component.email = 'test@example.com';
    component.sujet = 'Assurances';
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.soumettre();
    http.expectOne(endpoint).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.connexionRequise()).toBeTrue();
    expect(component.etat()).toBe('erreur');
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Mon projet');
    expect(root.querySelector<HTMLInputElement>('[name="nom"]')?.value).toBe(account.nom);
    expect(root.querySelector<HTMLInputElement>('[name="telephone"]')?.value).toBe(account.telephone);
    expect(root.querySelector<HTMLInputElement>('[name="nom"]')?.readOnly).toBeTrue();
    expect(root.querySelector<HTMLInputElement>('[name="telephone"]')?.readOnly).toBeTrue();
    expect(root.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('test@example.com');
    expect(root.querySelector<HTMLSelectElement>('select')?.value).toBe('Assurances');
    expect(root.querySelector('a[href^="/login"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Message enregistré');
    component.conserverFormulaire();
    expect(TestBed.inject(ContactDraftStore).value?.message).toBe('Mon projet');
  });

  it('allows retry after a server failure and prevents double submission', () => {
    const component = contact().componentInstance;
    component.soumettre();
    component.soumettre();
    http.expectOne(endpoint).flush({}, { status: 500, statusText: 'Server error' });
    expect(component.etat()).toBe('erreur');
    expect(component.message).toBe('Mon projet');
    component.soumettre();
    http.expectOne(endpoint).flush({ id: 'saved-request', message: 'OK' });
    expect(component.etat()).toBe('succes');
    component.soumettre();
    http.expectNone(endpoint);
  });

  it('does not report success for an empty API response', () => {
    const component = contact().componentInstance;
    component.soumettre();
    http.expectOne(endpoint).flush(null);
    expect(component.etat()).toBe('erreur');
  });

  it('rejects whitespace-only required fields', () => {
    const component = contact().componentInstance;
    component.message = '   ';
    component.soumettre();
    http.expectNone(endpoint);
    expect(component.etat()).toBe('form');
  });

  it('hides contact WhatsApp when unconfigured and exposes only the configured link', () => {
    const fixture = contact();
    expect(fixture.nativeElement.querySelector('a[href^="https://wa.me/"]')).toBeNull();
    TestBed.inject(SiteConfigService).reload();
    http.expectOne('/site-config.json').flush({ whatsappNumber: '+2250712345678' });
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href^="https://wa.me/"]');
    expect(link.href).toContain('https://wa.me/2250712345678?text=');
    expect(link.rel).toBe('noopener noreferrer');
  });

  for (const page of [VillaDetailComponent, LocationDetailComponent]) {
    it(`${page.name}: uses configured WhatsApp and hides it on missing configuration`, () => {
      const fixture = TestBed.createComponent<VillaDetailComponent | LocationDetailComponent>(page);
      http.expectOne('/site-config.json').flush({ whatsappNumber: '2250700000000' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('a[href^="https://wa.me/"]')).toBeNull();
      TestBed.inject(SiteConfigService).reload();
      http.expectOne('/site-config.json').flush({ whatsappNumber: '+2250712345678' });
      fixture.detectChanges();
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href^="https://wa.me/"]');
      expect(link.href).toBe(fixture.componentInstance.whatsappUrl!);
      expect(decodeURIComponent(link.href)).toContain('test & jardin');
      expect(link.rel).toBe('noopener noreferrer');
      expect(fixture.nativeElement.textContent).not.toContain('Vérifié');
    });
  }

  for (const page of [VillaDetailComponent, DiasporaComponent]) {
    for (const enabled of [false, true]) {
      it(`${page.name}: demo3dEnabled=${enabled} controls independent demo links`, () => {
        const fixture = TestBed.createComponent<VillaDetailComponent | DiasporaComponent>(page);
        http.expectOne('/site-config.json').flush({ demo3dEnabled: enabled });
        fixture.detectChanges();
        const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a[href^="/viewer-3d/"]'));
        expect(links.length > 0).toBe(enabled);
        for (const link of links) {
          expect(link.getAttribute('href')).toBe('/viewer-3d/index.html');
          expect(link.textContent).toContain('Villa témoin 3D');
          const notice = fixture.nativeElement.querySelector(`#${link.getAttribute('aria-describedby')}`);
          expect(notice.textContent).toContain('Démonstration distincte du bien');
        }
      });
    }
  }

  it('does not advertise verification or a property-specific 3D tour in villa metadata', () => {
    const fixture = TestBed.createComponent(VillaDetailComponent);
    http.expectOne('/site-config.json').flush({});
    fixture.detectChanges();
    const seo = TestBed.inject(SeoService).setPage as jasmine.Spy;
    const description: string = seo.calls.mostRecent().args[1];
    expect(description).toContain("Informations déclarées dans l'annonce");
    expect(description).not.toContain('vérifié');
    expect(description).not.toContain('3D');
  });

  it('routes diaspora report requests to the contextual contact form', () => {
    const fixture = TestBed.createComponent(DiasporaComponent);
    http.expectOne('/site-config.json').flush({});
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a[href^="/contact"]'));
    expect(links.length).toBe(2);
    for (const link of links) expect(new URL(link.href).searchParams.get('sujet')).toBe('Mode diaspora / rapport terrain');
  });

  it('routes partner categories and applications to distinct contact subjects', () => {
    const fixture = TestBed.createComponent(PartenairesComponent);
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a[href^="/contact"]'));
    expect(links.map(link => new URL(link.href).searchParams.get('sujet'))).toEqual([
      'Notaires', 'Géomètres', 'Banques & Financement', 'Assurances', 'Devenir partenaire',
    ]);
  });
});
