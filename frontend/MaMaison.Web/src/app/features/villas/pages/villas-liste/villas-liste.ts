import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VillaService } from '../../../../core/services/villa.service';
import { VillaListe, TypeVilla, TypeVillaLabels } from '../../../../core/models/villa.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-villas-liste',
  imports: [FormsModule, RouterLink],
  templateUrl: './villas-liste.html',
  styleUrl: './villas-liste.scss'
})
export class VillasListeComponent implements OnInit {
  private readonly villaService = inject(VillaService);

  villas: VillaListe[] = [];
  loading = true;
  error = false;

  filtreType: TypeVilla | '' = '';
  filtreQuartier = '';
  filtrePrixMax: number | null = null;

  readonly TypeVilla = TypeVilla;
  readonly TypeVillaLabels = TypeVillaLabels;
  readonly typeVillaOptions = Object.entries(TypeVillaLabels).map(([k, v]) => ({ value: +k as TypeVilla, label: v }));

  ngOnInit() { this.charger(); }

  charger() {
    this.loading = true;
    this.error = false;
    this.villaService.rechercher({
      type: this.filtreType !== '' ? this.filtreType : undefined,
      quartier: this.filtreQuartier || undefined,
      prixMax: this.filtrePrixMax ?? undefined,
    }).subscribe({
      next: (v: VillaListe[]) => { this.villas = v; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  ouvrirVisite3D(villa: VillaListe, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    window.open(`${environment.viewer3dUrl}?villaId=${villa.id}`, '_blank');
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  resetFiltres() {
    this.filtreType = '';
    this.filtreQuartier = '';
    this.filtrePrixMax = null;
    this.charger();
  }
}
