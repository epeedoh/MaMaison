import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VillaService } from '../../../../core/services/villa.service';
import { VillaDetail as VillaDetailModel, TypeVillaLabels } from '../../../../core/models/villa.model';
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

  villa: VillaDetailModel | null = null;
  loading = true;
  error = false;
  readonly TypeVillaLabels = TypeVillaLabels;

  modalOuvert = signal(false);
  modalMode = signal<ModalMode>('visite');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.villaService.obtenirDetail(id).subscribe({
      next: v => { this.villa = v; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  ouvrirModal(mode: ModalMode) {
    this.modalMode.set(mode);
    this.modalOuvert.set(true);
  }

  fermerModal() {
    this.modalOuvert.set(false);
  }

  ouvrirVisite3D() {
    window.open(`${environment.viewer3dUrl}?villaId=${this.villa!.id}`, '_blank');
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }
}
