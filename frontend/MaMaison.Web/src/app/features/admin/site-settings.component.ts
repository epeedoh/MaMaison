import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { SiteConfigService } from '../../core/services/site-config.service';

interface Settings { demo3dEnabled: boolean; version: string; updatedAt: string | null; }

@Component({
  selector: 'app-site-settings',
  imports: [FormsModule],
  template: `
    <section class="site-settings" style="max-width:720px;padding:24px 0">
      <h2>Visite guidée 3D</h2>
      <p>Ce réglage active la villa témoin de démonstration sur le site. Elle ne représente pas les biens annoncés et ne remplace pas une visite physique.</p>
      @if (loading()) { <p role="status">Chargement des réglages…</p> }
      @if (settings()) {
        <p>État enregistré : <strong>{{ settings()!.demo3dEnabled ? 'Activée' : 'Désactivée' }}</strong></p>
        <label style="display:flex;gap:12px;align-items:center;margin:20px 0">
          <input type="checkbox" [(ngModel)]="enabled" [disabled]="saving() || loading()" />
          Afficher la visite guidée 3D de démonstration
        </label>
        <button class="btn btn-navy" (click)="save()" [disabled]="saving() || loading() || enabled === settings()!.demo3dEnabled">
          {{ saving() ? 'Enregistrement…' : 'Enregistrer le réglage' }}
        </button>
        <p style="margin-top:16px">Le changement s’applique aux prochains chargements de page et à l’accès direct au viewer. Une scène déjà ouverte n’est pas arrêtée à distance.</p>
      }
      @if (message()) { <p role="status" aria-live="polite">{{ message() }}</p> }
      @if (failed()) { <button class="btn btn-ghost" (click)="load()" [disabled]="loading() || saving()">Recharger les réglages</button> }
    </section>
  `,
})
export class SiteSettingsComponent {
  private readonly http = inject(HttpClient);
  private readonly publicConfig = inject(SiteConfigService);
  private readonly url = `${environment.apiUrl}/admin/site-config`;
  readonly settings = signal<Settings | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly failed = signal(false);
  readonly message = signal('');
  enabled = false;

  constructor() { this.load(); }

  load() {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.failed.set(false);
    this.message.set('');
    this.http.get<Settings>(this.url).subscribe({
      next: value => { this.settings.set(value); this.enabled = value.demo3dEnabled; this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); this.message.set('Impossible de lire les réglages. Aucun changement effectué.'); },
    });
  }

  save() {
    const value = this.settings();
    if (!value || this.saving() || this.loading() || this.enabled === value.demo3dEnabled) return;
    this.saving.set(true);
    this.message.set('');
    this.http.put<Settings>(this.url, { demo3dEnabled: this.enabled, version: value.version }).subscribe({
      next: saved => {
        this.settings.set(saved); this.enabled = saved.demo3dEnabled; this.saving.set(false); this.failed.set(false);
        this.publicConfig.reload();
        this.message.set(saved.demo3dEnabled ? 'Visite 3D activée et enregistrée.' : 'Visite 3D désactivée et enregistrée.');
      },
      error: error => {
        this.saving.set(false); this.failed.set(true);
        this.message.set(error.status === 409 ? 'Une autre session a changé les réglages. Rechargez avant de réessayer.' : 'Enregistrement non confirmé. Rechargez les réglages pour vérifier leur état.');
      },
    });
  }
}
