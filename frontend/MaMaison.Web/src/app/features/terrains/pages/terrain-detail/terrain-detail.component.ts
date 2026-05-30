import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TerrainService } from '../../../../core/services/terrain.service';
import { TerrainDetail, NiveauVerificationTerrain, NiveauVerificationLabels } from '../../../../core/models/terrain.model';
import { DemandeVisiteModalComponent, ModalMode } from '../../../../shared/components/demande-visite-modal/demande-visite-modal.component';

@Component({
  selector: 'app-terrain-detail',
  imports: [RouterLink, DemandeVisiteModalComponent, DecimalPipe],
  templateUrl: './terrain-detail.component.html',
})
export class TerrainDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TerrainService);

  terrain: TerrainDetail | null = null;
  loading = true;
  error = false;

  modalOuvert = signal(false);
  modalMode = signal<ModalMode>('visite');

  readonly NiveauVerificationLabels = NiveauVerificationLabels;
  readonly NiveauVerificationTerrain = NiveauVerificationTerrain;
  readonly niveauxVerification: NiveauVerificationTerrain[] = [1, 2, 3, 4, 5];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.obtenirDetail(id).subscribe({
      next: t => { this.terrain = t; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  niveauLabel(n: NiveauVerificationTerrain) { return NiveauVerificationLabels[n]; }

  ouvrirModal(mode: ModalMode) { this.modalMode.set(mode); this.modalOuvert.set(true); }
  fermerModal() { this.modalOuvert.set(false); }

  formatPrix(p: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(p);
  }
}
