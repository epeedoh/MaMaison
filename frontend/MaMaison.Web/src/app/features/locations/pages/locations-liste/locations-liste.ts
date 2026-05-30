import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocationService } from '../../../../core/services/location.service';
import { LocationListe, TypeLocationBien, TypeLocationLabels } from '../../../../core/models/location.model';

@Component({
  selector: 'app-locations-liste',
  imports: [FormsModule, RouterLink],
  templateUrl: './locations-liste.html',
  styleUrl: './locations-liste.scss'
})
export class LocationsListeComponent implements OnInit {
  private readonly locationService = inject(LocationService);

  locations: LocationListe[] = [];
  loading = true;
  error = false;

  filtreQuartier = '';
  filtreCommune = '';
  filtreLoyerMax: number | null = null;

  readonly TypeLocationLabels = TypeLocationLabels;
  readonly typeOptions = Object.entries(TypeLocationLabels).map(([k, v]) => ({ value: +k as TypeLocationBien, label: v }));

  ngOnInit() { this.charger(); }

  charger() {
    this.loading = true;
    this.error = false;
    this.locationService.rechercher({
      quartier: this.filtreQuartier || undefined,
      commune: this.filtreCommune || undefined,
      loyerMax: this.filtreLoyerMax ?? undefined,
    }).subscribe({
      next: (l: LocationListe[]) => { this.locations = l; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  resetFiltres() {
    this.filtreQuartier = '';
    this.filtreCommune = '';
    this.filtreLoyerMax = null;
    this.charger();
  }
}
