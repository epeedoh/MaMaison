import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-search-bar',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="search-wrap" [class.open]="ouvert()">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input #inp type="text" [(ngModel)]="terme" (ngModelChange)="recherche$.next($event)"
               placeholder="Rechercher une villa, location, terrain…"
               (focus)="ouvert.set(true)"
               (blur)="fermerApresDelai()"
               class="search-input">
        @if (terme) {
          <button class="search-clear" (click)="effacer()">✕</button>
        }
      </div>

      @if (ouvert() && (resultats() || chargement())) {
        <div class="search-dropdown">
          @if (chargement()) {
            <div class="search-loading"><div class="spinner-sm"></div> Recherche…</div>
          }

          @if (resultats() && !chargement()) {
            @if (resultats()!.total === 0) {
              <div class="search-empty">Aucun résultat pour "{{ terme }}"</div>
            } @else {
              @if (resultats()!.villas.length > 0) {
                <div class="search-section">
                  <div class="search-section-title">🏠 Villas</div>
                  @for (v of resultats()!.villas; track v.id) {
                    <a [routerLink]="['/villas', v.id]" class="search-item" (click)="effacer()">
                      <span class="search-item-title">{{ v.titre }}</span>
                      <span class="search-item-sub">{{ v.soustitre }}</span>
                    </a>
                  }
                </div>
              }
              @if (resultats()!.locations.length > 0) {
                <div class="search-section">
                  <div class="search-section-title">🔑 Locations</div>
                  @for (l of resultats()!.locations; track l.id) {
                    <a [routerLink]="['/locations', l.id]" class="search-item" (click)="effacer()">
                      <span class="search-item-title">{{ l.titre }}</span>
                      <span class="search-item-sub">{{ l.soustitre }}</span>
                    </a>
                  }
                </div>
              }
              @if (resultats()!.terrains.length > 0) {
                <div class="search-section">
                  <div class="search-section-title">📍 Terrains</div>
                  @for (t of resultats()!.terrains; track t.id) {
                    <a [routerLink]="['/terrains', t.id]" class="search-item" (click)="effacer()">
                      <span class="search-item-title">{{ t.titre }}</span>
                      <span class="search-item-sub">{{ t.soustitre }}</span>
                    </a>
                  }
                </div>
              }
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .search-wrap { position:relative; flex:1; max-width:420px; }
    .search-input-wrap { position:relative; display:flex; align-items:center; }
    .search-icon { position:absolute; left:12px; width:16px; height:16px; color:rgba(255,255,255,.4); flex-shrink:0; }
    .search-input { width:100%; height:36px; padding:0 36px 0 38px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); border-radius:20px; color:white; font-size:.83rem; font-family:inherit; outline:none; transition:all .2s; }
    .search-input::placeholder { color:rgba(255,255,255,.4); }
    .search-input:focus { background:rgba(255,255,255,.14); border-color:rgba(255,255,255,.3); }
    .search-clear { position:absolute; right:10px; background:none; border:none; color:rgba(255,255,255,.5); cursor:pointer; font-size:.85rem; padding:2px; }
    .search-dropdown { position:absolute; top:calc(100% + 8px); left:0; right:0; background:white; border-radius:var(--r-lg); box-shadow:0 16px 48px rgba(5,13,26,.2); overflow:hidden; z-index:500; max-height:400px; overflow-y:auto; }
    .search-loading { padding:16px 18px; font-size:.82rem; color:var(--text-soft); display:flex; align-items:center; gap:10px; }
    .search-empty { padding:20px 18px; font-size:.85rem; color:var(--text-soft); text-align:center; }
    .search-section { border-bottom:1px solid var(--border-soft); }
    .search-section:last-child { border-bottom:none; }
    .search-section-title { padding:10px 16px 4px; font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:var(--text-soft); }
    .search-item { display:flex; flex-direction:column; gap:2px; padding:9px 16px; text-decoration:none; transition:background .15s; }
    .search-item:hover { background:var(--cream); }
    .search-item-title { font-size:.85rem; font-weight:600; color:var(--text); }
    .search-item-sub { font-size:.75rem; color:var(--text-soft); }
    .spinner-sm { width:14px; height:14px; border:2px solid var(--border); border-top-color:var(--navy-mid); border-radius:50%; animation:spin .7s linear infinite; }
  `]
})
export class SearchBarComponent {
  private readonly http = inject(HttpClient);

  terme     = '';
  ouvert    = signal(false);
  chargement = signal(false);
  resultats = signal<any | null>(null);

  readonly recherche$ = new Subject<string>();

  constructor() {
    this.recherche$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) { this.resultats.set(null); return of(null); }
        this.chargement.set(true);
        return this.http.get(`${environment.apiUrl}/recherche?q=${encodeURIComponent(q)}&limit=4`)
          .pipe(catchError(() => of(null)));
      })
    ).subscribe(r => { this.resultats.set(r); this.chargement.set(false); });
  }

  effacer() { this.terme = ''; this.resultats.set(null); this.ouvert.set(false); }

  fermerApresDelai() {
    setTimeout(() => this.ouvert.set(false), 200);
  }
}
