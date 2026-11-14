import { Component, Input, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
@Component({
  selector: 'app-bien-map',
  template: `@if (valide) {
    <section class="detail-section"><h3>Position exacte du bien</h3>
      <iframe title="Position du bien sur la carte" [src]="url" width="100%" height="300" style="border:0;border-radius:12px" loading="lazy" referrerpolicy="no-referrer"></iframe>
      <p>{{ latitude }}, {{ longitude }}</p>
      <a [href]="lien" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps</a>
    </section>
  } @else { <p>La position GPS de ce bien n’a pas encore été renseignée.</p> }`
})
export class BienMapComponent {
  @Input() latitude: number | null | undefined;
  @Input() longitude: number | null | undefined;
  private sanitizer = inject(DomSanitizer);
  get valide() { return typeof this.latitude === 'number' && typeof this.longitude === 'number' && Number.isFinite(this.latitude) && Number.isFinite(this.longitude) && Math.abs(this.latitude) <= 90 && Math.abs(this.longitude) <= 180; }
  get lien() { return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`; }
  get url() { return this.sanitizer.bypassSecurityTrustResourceUrl(this.lien + '&z=17&output=embed'); }
}
