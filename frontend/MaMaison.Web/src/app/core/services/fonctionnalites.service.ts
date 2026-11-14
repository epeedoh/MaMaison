import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class FonctionnalitesService {
  private http = inject(HttpClient);
  terrainsActifs = signal(false);
  constructor() {
    this.actualiser();
    inject(Router).events.subscribe(event => { if (event instanceof NavigationEnd) this.actualiser(); });
  }
  actualiser() { this.http.get<{ terrainsActifs: boolean }>(`${environment.apiUrl}/fonctionnalites`).subscribe({ next: r => this.terrainsActifs.set(r.terrainsActifs), error: () => this.terrainsActifs.set(false) }); }
}
