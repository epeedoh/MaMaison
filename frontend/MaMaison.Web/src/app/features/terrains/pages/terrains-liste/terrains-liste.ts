import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TerrainListe, NiveauVerificationTerrain, NiveauVerificationLabels } from '../../../../core/models/terrain.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { FavorisService } from '../../../../core/services/favoris.service';
import { environment } from '../../../../../environments/environment';

interface TerrainPage { items: TerrainListe[]; total: number; page: number; pageSize: number; totalPages: number; }

@Component({
  selector: 'app-terrains-liste',
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './terrains-liste.html',
  styleUrl: './terrains-liste.scss'
})
export class TerrainsListeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly favoris = inject(FavorisService);

  terrains:  TerrainListe[] = [];
  total     = 0;
  page      = 1;
  pageSize  = 12;
  totalPages = 0;
  loading   = true;
  error     = false;

  filtreCommune   = '';
  filtreSurfaceMin: number | null = null;
  filtrePrixMax:   number | null = null;

  readonly NiveauVerificationLabels = NiveauVerificationLabels;
  readonly NiveauVerificationTerrain = NiveauVerificationTerrain;
  readonly niveauxVerif: NiveauVerificationTerrain[] = [1, 2, 3, 4, 5];

  ngOnInit() { this.charger(); }

  charger(p = this.page) {
    this.loading = true;
    this.error   = false;
    this.page    = p;

    let params = new HttpParams().set('page', p).set('pageSize', this.pageSize);
    if (this.filtreCommune)    params = params.set('commune', this.filtreCommune);
    if (this.filtreSurfaceMin) params = params.set('surfaceMin', this.filtreSurfaceMin!);
    if (this.filtrePrixMax)    params = params.set('prixMax', this.filtrePrixMax!);

    this.http.get<TerrainPage>(`${environment.apiUrl}/terrains`, { params }).subscribe({
      next: r => { this.terrains = r.items; this.total = r.total; this.totalPages = r.totalPages; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  allerPage(p: number) { this.charger(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  niveauLabel(n: NiveauVerificationTerrain) { return NiveauVerificationLabels[n]; }

  resetFiltres() {
    this.filtreCommune   = '';
    this.filtreSurfaceMin = null;
    this.filtrePrixMax   = null;
    this.charger();
  }
}
