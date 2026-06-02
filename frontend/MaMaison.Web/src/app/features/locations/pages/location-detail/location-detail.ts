import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocationService } from '../../../../core/services/location.service';
import { LocationDetail as LocationDetailModel, TypeLocationLabels } from '../../../../core/models/location.model';
import { DemandeVisiteModalComponent, ModalMode } from '../../../../shared/components/demande-visite-modal/demande-visite-modal.component';
import { SignalementModalComponent } from '../../../../shared/components/signalement-modal/signalement-modal.component';

@Component({
  selector: 'app-location-detail',
  imports: [RouterLink, DemandeVisiteModalComponent, SignalementModalComponent],
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
  modalOuvert       = signal(false);
  modalMode         = signal<ModalMode>('visite');
  signalementOuvert = signal(false);

  ouvrirModal(mode: ModalMode) { this.modalMode.set(mode); this.modalOuvert.set(true); }
  fermerModal()      { this.modalOuvert.set(false); }
  ouvrirSignalement() { this.signalementOuvert.set(true); }
  fermerSignalement() { this.signalementOuvert.set(false); }

  ouvrirWhatsApp(telephone: string) {
    const msg = encodeURIComponent(`Bonjour, je suis intéressé par votre annonce sur MaMaison Verified.`);
    const num = telephone.replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  }

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
