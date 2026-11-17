import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';

/** Public operational settings only: never put credentials in site-config.json. */
@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  private readonly http = inject(HttpClient);
  private readonly demo3d = signal(false);
  private readonly whatsapp = signal('');
  readonly demo3dEnabled = this.demo3d.asReadonly();
  readonly adminSiteSettingsEnabled = signal(false);
  readonly whatsappNumber = this.whatsapp.asReadonly();
  readonly demo3dUrl = '/viewer-3d/index.html';

  constructor() {
    this.reload();
  }

  reload() {
    this.demo3d.set(false);
    this.adminSiteSettingsEnabled.set(false);
    this.whatsapp.set('');
    // A missing/invalid configuration must never activate an optional feature.
    // Do not block the catalogue while fetching operational settings.
    this.http.get<unknown>('/site-config.json', {
      headers: { 'ngsw-bypass': 'true' },
    }).pipe(timeout(3000)).subscribe({
      next: value => {
        if (!value || typeof value !== 'object') return;
        const config = value as Record<string, unknown>;
        this.demo3d.set(config['demo3dEnabled'] === true);
        this.adminSiteSettingsEnabled.set(config['adminSiteSettingsEnabled'] !== false);
        this.whatsapp.set(normalizePublicPhone(config['whatsappNumber']));
      },
      error: () => { /* Safe defaults; the contact form remains available. */ },
    });
  }

  whatsappUrl(message = 'Bonjour, je souhaite contacter MaMaison.'): string | null {
    const number = this.whatsappNumber();
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
  }
}

export function normalizePublicPhone(value: unknown): string {
  if (typeof value !== 'string' || !/^\+?[\d\s().-]+$/.test(value)) return '';
  const digits = value.replace(/\D/g, '');
  // International format, no local prefix; reject known demo placeholders.
  if (!/^[1-9]\d{7,14}$/.test(digits) || /0{6,}$/.test(digits)) return '';
  return digits;
}
