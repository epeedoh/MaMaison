import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { FonctionnalitesService } from '../../core/services/fonctionnalites.service';
import { AuthService } from '../../core/services/auth.service';

describe('Home catalogue', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let http: HttpTestingController;
  let terrainsActifs: ReturnType<typeof signal<boolean>>;
  let peutPublier: ReturnType<typeof signal<boolean>>;
  const villa = {
    id: 'villa-1', titre: 'Villa Cocody', quartier: 'Riviera', ville: 'Abidjan',
    prix: 65000000, surfaceHabitable: 180, nombrePieces: 4, imagePrincipaleUrl: null
  };
  const request = (category: string) => http.expectOne(req =>
    req.url === `/api/${category}` && req.params.get('page') === '1' && req.params.get('pageSize') === '6');

  beforeEach(async () => {
    terrainsActifs = signal(false);
    peutPublier = signal(false);
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: FonctionnalitesService, useValue: { terrainsActifs } },
        { provide: AuthService, useValue: { peutPublier } }]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); http.verify(); });

  it('renders the server total, property contract and detail route without fabricated totals', () => {
    request('villas').flush({ items: [villa], total: 7 });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role=status]')?.textContent).toContain('7 annonces');
    expect(el.querySelector('.prop-card')?.getAttribute('href')).toBe('/villas/villa-1');
    expect(el.querySelector('.card-title')?.textContent).toBe(villa.titre);
    expect(el.querySelector('.card-loc')?.textContent).toContain('Riviera, Abidjan');
    expect(el.textContent).not.toMatch(/120\+|60\+|40\+|20\+/);
    expect(el.querySelector('.photo-pending')).not.toBeNull();
  });

  it('cancels the previous request when selecting another category', () => {
    const previous = request('villas');
    fixture.componentInstance.choisir('locations');
    expect(previous.cancelled).toBeTrue();
    request('locations').flush({ items: [{
      id: 'location-1', titre: 'Appartement', quartier: 'Angre', commune: 'Cocody',
      loyer: 150000, nombrePieces: 3, imagePrincipaleUrl: '/image-test.jpg'
    }], total: 1 });
    fixture.detectChanges();
    expect(fixture.componentInstance.properties[0].price).toBe(150000);
    expect(fixture.nativeElement.querySelector('.card-price small').textContent).toContain('/ mois');
    expect(fixture.nativeElement.querySelector('.prop-card').getAttribute('href')).toBe('/locations/location-1');
  });

  it('does not request or expose terrains while the current feature flag is false', () => {
    request('villas').flush({ items: [], total: 0 });
    fixture.componentInstance.choisir('terrains');
    fixture.detectChanges();
    expect(fixture.componentInstance.category).toBe('villas');
    expect(fixture.nativeElement.querySelector('input[value=terrains]')).toBeNull();
    http.expectNone(req => req.url.includes('/terrains'));
  });

  it('returns to villas and cancels a terrain request when the feature is disabled', () => {
    request('villas').flush({ items: [], total: 0 });
    terrainsActifs.set(true);
    fixture.detectChanges();
    fixture.componentInstance.choisir('terrains');
    const pending = request('terrains');
    terrainsActifs.set(false);
    fixture.detectChanges();
    expect(pending.cancelled).toBeTrue();
    expect(fixture.componentInstance.category).toBe('villas');
    request('villas').flush({ items: [], total: 0 });
  });

  it('maps enabled terrain surface, price and commune', () => {
    request('villas').flush({ items: [], total: 0 });
    terrainsActifs.set(true);
    fixture.detectChanges();
    fixture.componentInstance.choisir('terrains');
    request('terrains').flush({ items: [{
      id: 'terrain-1', titre: 'Parcelle', quartier: null, commune: 'Bingerville',
      surface: 500, prix: 15000000, imagePrincipaleUrl: null
    }], total: 1 });
    fixture.detectChanges();
    expect(fixture.componentInstance.properties[0].specs).toBe('500 m\u00b2');
    expect(fixture.componentInstance.properties[0].place).toBe('Bingerville');
    expect(fixture.nativeElement.querySelector('.prop-card').getAttribute('href')).toBe('/terrains/terrain-1');
  });

  it('offers a retry after an error and distinguishes an empty catalogue', () => {
    request('villas').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    fixture.nativeElement.querySelector('.empty-state button').click();
    request('villas').flush({ items: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state h3').textContent).toContain('Aucun bien');
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toBe('0 annonce');
  });

  it('handles broken photos and gates publication with the current auth contract', () => {
    request('villas').flush({ items: [{ ...villa, imagePrincipaleUrl: '/broken.jpg' }], total: 1 });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.property-photo').dispatchEvent(new Event('error'));
    fixture.nativeElement.querySelector('.city-photo').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.photo-pending')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.city-photo')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/publier"]')).toBeNull();
    peutPublier.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/publier"]')).not.toBeNull();
  });

  it('keeps attribution and cancels catalogue loading on destruction', () => {
    const pending = request('villas');
    expect(fixture.nativeElement.querySelector('.photo-credit').textContent).toContain('Sidkumar23');
    expect(fixture.nativeElement.querySelector('.photo-credit a:last-child').getAttribute('href'))
      .toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    fixture.destroy();
    expect(pending.cancelled).toBeTrue();
  });
});
