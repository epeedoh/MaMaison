import { Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-property-photo',
  template: `
    @if (visibleUrl(); as url) {
      <img class="property-photo" [src]="url" [alt]="title()" loading="lazy" (error)="visibleUrl.set(null)">
    } @else {
      <div class="photo-pending"><img src="/viewer-3d/vendor/icons/home.svg" alt=""><span>Photo indisponible</span></div>
    }`
})
export class PropertyPhotoComponent {
  readonly src = input.required<string | null>();
  readonly title = input.required<string>();
  protected readonly visibleUrl = linkedSignal(() => this.src());
}
