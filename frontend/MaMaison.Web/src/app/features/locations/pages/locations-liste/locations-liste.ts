import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LocationListe, TypeLocationBien, TypeLocationLabels } from '../../../../core/models/location.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { FavorisService } from '../../../../core/services/favoris.service';
import { environment } from '../../../../../environments/environment';

interface LocationPage { items: LocationListe[]; total: number; page: number; pageSize: number; totalPages: number; }

@Component({
  selector: 'app-locations-liste',
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './locations-liste.html',
  styleUrl: './locations-liste.scss'
})
export class LocationsListeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly favoris = inject(FavorisService);

  locations:  LocationListe[] = [];
  total      = 0;
  page       = 1;
  pageSize   = 12;
  totalPages = 0;
  loading    = true;
  error      = false;

  filtreQuartier     = '';
  filtreCommune      = '';
  filtreLoyerMax:  number | null = null;
  filtreLoyerMin:  number | null = null;
  filtrePiecesMin: number | null = null;

  readonly TypeLocationLabels = TypeLocationLabels;

  ngOnInit() { this.charger(); }

  charger(p = this.page) {
    this.loading = true;
    this.error   = false;
    this.page    = p;

    let params = new HttpParams().set('page', p).set('pageSize', this.pageSize);
    if (this.filtreQuartier)  params = params.set('quartier', this.filtreQuartier);
    if (this.filtreCommune)   params = params.set('commune', this.filtreCommune);
    if (this.filtreLoyerMax)  params = params.set('loyerMax', this.filtreLoyerMax);
    if (this.filtreLoyerMin)  params = params.set('loyerMin', this.filtreLoyerMin!);
    if (this.filtrePiecesMin) params = params.set('nombrePiecesMin', this.filtrePiecesMin!);

    this.http.get<LocationPage>(`${environment.apiUrl}/locations`, { params }).subscribe({
      next: r => { this.locations = r.items; this.total = r.total; this.totalPages = r.totalPages; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  allerPage(p: number) { this.charger(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  resetFiltres() {
    this.filtreQuartier = '';
    this.filtreCommune  = '';
    this.filtreLoyerMax = null;
    this.filtreLoyerMin = null;
    this.filtrePiecesMin = null;
    this.charger();
  }
}
