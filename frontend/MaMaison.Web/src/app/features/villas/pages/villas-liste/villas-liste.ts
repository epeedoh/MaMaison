import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { catalogueErrorMessage, catalogueTimeoutMs } from '../../../../shared/catalogue-request';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PropertyPhotoComponent } from '../../../../shared/components/property-photo.component';
import { HttpClient, HttpParams } from '@angular/common/http';
import { VillaListe, TypeVilla, TypeVillaLabels } from '../../../../core/models/villa.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { FavorisService } from '../../../../core/services/favoris.service';
import { environment } from '../../../../../environments/environment';

interface VillaPage { items: VillaListe[]; total: number; page: number; pageSize: number; totalPages: number; }

@Component({
  selector: 'app-villas-liste',
  imports: [FormsModule, RouterLink, PaginationComponent, PropertyPhotoComponent],
  templateUrl: './villas-liste.html',
  styleUrl: './villas-liste.scss'
})
export class VillasListeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private pending?: Subscription;
  constructor() { inject(DestroyRef).onDestroy(() => this.pending?.unsubscribe()); }
  readonly favoris = inject(FavorisService);

  villas:     VillaListe[] = [];
  total      = 0;
  page       = 1;
  pageSize   = 12;
  totalPages = 0;
  loading    = true;
  error      = '';

  filtreType: TypeVilla | '' = '';
  filtreQuartier     = '';
  filtrePrixMax:    number | null = null;
  filtreSurfaceMin: number | null = null;
  filtrePiecesMin:  number | null = null;

  readonly TypeVilla = TypeVilla;
  readonly TypeVillaLabels = TypeVillaLabels;
  readonly typeVillaOptions = Object.entries(TypeVillaLabels).map(([k, v]) => ({ value: +k as TypeVilla, label: v }));

  ngOnInit() { this.charger(); }

  charger(p = this.page) {
    this.loading = true;
    this.pending?.unsubscribe();
    this.error   = '';
    this.page    = p;

    let params = new HttpParams().set('page', p).set('pageSize', this.pageSize);
    if (this.filtreType !== '')   params = params.set('type', this.filtreType as number);
    if (this.filtreQuartier)      params = params.set('quartier', this.filtreQuartier);
    if (this.filtrePrixMax)       params = params.set('prixMax', this.filtrePrixMax);
    if (this.filtreSurfaceMin)    params = params.set('surfaceMin', this.filtreSurfaceMin);
    if (this.filtrePiecesMin)     params = params.set('piecesMin', this.filtrePiecesMin);

    this.pending = this.http.get<VillaPage>(`${environment.apiUrl}/villas`, { params, timeout: catalogueTimeoutMs }).subscribe({
      next: r => { this.villas = r.items; this.total = r.total; this.totalPages = r.totalPages; this.loading = false; },
      error: err => { this.error = catalogueErrorMessage(err); this.loading = false; }
    });
  }

  allerPage(p: number) { this.charger(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  ouvrirVisite3D(villa: VillaListe, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = `${environment.viewer3dUrl}?villaId=${villa.id}`;
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  resetFiltres() {
    this.filtreType     = '';
    this.filtreQuartier = '';
    this.filtrePrixMax  = null;
    this.filtreSurfaceMin = null;
    this.filtrePiecesMin  = null;
    this.charger(1);
  }
}
