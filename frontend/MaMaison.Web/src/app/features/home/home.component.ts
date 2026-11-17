import { Component, DestroyRef, OnInit, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { VillaListe } from '../../core/models/villa.model';
import { LocationListe } from '../../core/models/location.model';
import { TerrainListe } from '../../core/models/terrain.model';
import { AuthService } from '../../core/services/auth.service';
import { FonctionnalitesService } from '../../core/services/fonctionnalites.service';
import { environment } from '../../../environments/environment';

type Category = 'villas' | 'locations' | 'terrains';
type Listing = VillaListe | LocationListe | TerrainListe;
interface ListingPage { items: Listing[]; total: number; }
interface PropertyPreview { id: string; title: string; place: string; price: number; image: string | null; specs: string; }

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  readonly fonctionnalites = inject(FonctionnalitesService);
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly category$ = new BehaviorSubject<Category>('villas');
  private readonly currency = new Intl.NumberFormat('fr-CI', {
    style: 'currency', currency: 'XOF', maximumFractionDigits: 0
  });
  category: Category = 'villas';
  properties: PropertyPreview[] = [];
  total = 0;
  loading = true;
  error = false;
  cityPhotoAvailable = true;
  readonly options = computed<{ value: Category; label: string }[]>(() => [
    { value: 'villas', label: 'Acheter' },
    { value: 'locations', label: 'Louer' },
    ...(this.fonctionnalites.terrainsActifs() ? [{ value: 'terrains' as const, label: 'Terrains' }] : [])
  ]);

  constructor() {
    effect(() => {
      // A feature refresh can disable terrains while its catalogue is open.
      if (!this.fonctionnalites.terrainsActifs() && this.category === 'terrains') this.choisir('villas');
    });
  }

  ngOnInit() {
    this.category$.pipe(
      tap(() => { this.loading = true; this.error = false; this.properties = []; this.total = 0; }),
      switchMap(category => this.http.get<ListingPage>(`${environment.apiUrl}/${category}`, {
        params: { page: 1, pageSize: 6 }
      }).pipe(
        map(result => ({
          total: result.total,
          properties: result.items.map(item => ({
            id: item.id, title: item.titre, image: item.imagePrincipaleUrl,
            place: [item.quartier, 'ville' in item ? item.ville : item.commune].filter(Boolean).join(', '),
            price: 'loyer' in item ? item.loyer : item.prix,
            specs: 'surfaceHabitable' in item ? `${item.surfaceHabitable} m² · ${item.nombrePieces} pièces`
              : 'surface' in item ? `${item.surface} m²` : `${item.nombrePieces} pièces`
          }))
        })),
        catchError(() => { this.error = true; return of({ properties: [], total: 0 }); })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.total = result.total;
      this.properties = result.properties;
      this.loading = false;
    });
  }

  choisir(category: Category) {
    if (category === this.category || (category === 'terrains' && !this.fonctionnalites.terrainsActifs())) return;
    this.category = category;
    this.category$.next(category);
  }

  charger() { this.category$.next(this.category); }
  prix(value: number) { return this.currency.format(value); }
}
