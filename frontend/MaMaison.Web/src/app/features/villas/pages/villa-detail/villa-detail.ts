import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VillaService } from '../../../../core/services/villa.service';
import { StatistiquesService } from '../../../../core/services/statistiques.service';
import { VillaDetail as VillaDetailModel, TypeVillaLabels } from '../../../../core/models/villa.model';
import { AnalysePrixBien } from '../../../../core/models/statistiques.model';
import { environment } from '../../../../../environments/environment';
import { DemandeVisiteModalComponent, ModalMode } from '../../../../shared/components/demande-visite-modal/demande-visite-modal.component';

@Component({
  selector: 'app-villa-detail',
  imports: [RouterLink, DemandeVisiteModalComponent],
  templateUrl: './villa-detail.html',
  styleUrl: './villa-detail.scss'
})
export class VillaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly villaService = inject(VillaService);
  private readonly statsService = inject(StatistiquesService);

  villa: VillaDetailModel | null = null;
  analyse: AnalysePrixBien | null = null;
  loading = true;
  error = false;
  readonly TypeVillaLabels = TypeVillaLabels;

  modalOuvert = signal(false);
  modalMode = signal<ModalMode>('visite');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.villaService.obtenirDetail(id).subscribe({
      next: v => {
        this.villa = v;
        this.loading = false;
        // Charge l'analyse prix après le bien
        this.statsService.analyserBien(id).subscribe(a => this.analyse = a);
      },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  get prixM2(): string {
    if (!this.villa || this.villa.surfaceHabitable === 0) return '—';
    return this.formatPrix(this.villa.prix / this.villa.surfaceHabitable) + '/m²';
  }

  ouvrirModal(mode: ModalMode) {
    this.modalMode.set(mode);
    this.modalOuvert.set(true);
  }

  fermerModal() {
    this.modalOuvert.set(false);
  }

  ouvrirVisite3D() {
    window.location.href = `${environment.viewer3dUrl}?villaId=${this.villa!.id}`;
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }
}
