import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VillasListeComponent } from './villas/pages/villas-liste/villas-liste';
import { LocationsListeComponent } from './locations/pages/locations-liste/locations-liste';
import { TerrainsListeComponent } from './terrains/pages/terrains-liste/terrains-liste';

const pages: [string, Type<{ charger(page?: number): void }>][] = [
  ['villas', VillasListeComponent], ['locations', LocationsListeComponent], ['terrains', TerrainsListeComponent]
];

for (const [category, component] of pages) {
  describe('Catalogue public : ' + category, () => {
    beforeEach(() => TestBed.configureTestingModule({
      imports: [component], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }));

    it('recovers from an unavailable service without losing filters or fabricating results', () => {
      const fixture = TestBed.createComponent(component);
      const el: HTMLElement = fixture.nativeElement;
      const http = TestBed.inject(HttpTestingController);
      const request = () => http.expectOne(r => r.url === '/api/' + category);
      fixture.detectChanges();
      const stale = request();
      fixture.componentInstance.charger(2);
      expect(stale.cancelled).toBeTrue();
      request().flush(null, { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('ne répond pas');
      expect(el.querySelector('.results-count')).toBeNull();
      el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
      const retry = request();
      expect(retry.request.params.get('page')).toBe('2');
      retry.flush({ items: [{
        id: 'exemple', titre: 'Bien témoin', imagePrincipaleUrl: '/test-property.webp',
        nombrePieces: 3, quartier: 'Riviera', commune: 'Cocody', ville: 'Abidjan',
        prix: 20000000, loyer: 150000, totalAPrevoir: 450000, surface: 300, usage: 1,
        typeVilla: 0, typeBien: 0, niveauVerification: 1, surfaceHabitable: 80, scoreMaMaison: 50
      }], total: 13, page: 2, pageSize: 12, totalPages: 2 });
      fixture.detectChanges();
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(el.querySelector('.results-count')?.textContent).toContain('13');
      expect(el.querySelector('.card-footer')?.textContent).not.toContain('Vérifié');
      if (category === 'terrains') expect(el.querySelector('.card-specs')?.textContent).toContain('Commercial');
      const photo = el.querySelector<HTMLImageElement>('img.property-photo')!;
      expect(photo.getAttribute('src')).toBe('/test-property.webp');
      photo.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(el.querySelector('.photo-pending')).not.toBeNull();
      http.verify();
    });
  });
}
