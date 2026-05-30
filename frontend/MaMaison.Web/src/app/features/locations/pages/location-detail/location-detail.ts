import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocationService } from '../../../../core/services/location.service';
import { LocationDetail as LocationDetailModel, TypeLocationLabels } from '../../../../core/models/location.model';
import { DemandeVisiteModalComponent, ModalMode } from '../../../../shared/components/demande-visite-modal/demande-visite-modal.component';

@Component({
  selector: 'app-location-detail',
  imports: [RouterLink, DemandeVisiteModalComponent],
  templateUrl: './location-detail.html',
  styleUrl: './location-detail.scss'
})
export class LocationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly locationService = inject(LocationService);

  location: LocationDetailModel | null = null;
  loading = true;
  error = false;
  readonly TypeLocationLabels = TypeLocationLabels;
  modalOuvert = signal(false);
  modalMode = signal<ModalMode>('visite');
  ouvrirModal(mode: ModalMode) { this.modalMode.set(mode); this.modalOuvert.set(true); }
  fermerModal() { this.modalOuvert.set(false); }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.locationService.obtenirDetail(id).subscribe({
      next: l => { this.location = l; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }
}
