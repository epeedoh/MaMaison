import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TerrainService } from '../../../../core/services/terrain.service';
import { TerrainListe, NiveauVerificationTerrain, NiveauVerificationLabels } from '../../../../core/models/terrain.model';

@Component({
  selector: 'app-terrains-liste',
  imports: [FormsModule],
  templateUrl: './terrains-liste.html',
  styleUrl: './terrains-liste.scss'
})
export class TerrainsListeComponent implements OnInit {
  private readonly terrainService = inject(TerrainService);

  terrains: TerrainListe[] = [];
  loading = true;
  error = false;
  filtreCommune = '';
  readonly NiveauVerificationLabels = NiveauVerificationLabels;
  readonly NiveauVerificationTerrain = NiveauVerificationTerrain;

  ngOnInit() { this.charger(); }

  charger() {
    this.loading = true;
    this.error = false;
    this.terrainService.rechercher(this.filtreCommune || undefined).subscribe({
      next: (t: TerrainListe[]) => { this.terrains = t; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  niveauLabel(n: NiveauVerificationTerrain) {
    return NiveauVerificationLabels[n];
  }
}
