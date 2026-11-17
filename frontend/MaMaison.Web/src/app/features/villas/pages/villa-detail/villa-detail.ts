import { BienMapComponent } from '../../../../shared/components/bien-map/bien-map.component';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VillaService } from '../../../../core/services/villa.service';
import { SeoService } from '../../../../core/services/seo.service';
import { StatistiquesService } from '../../../../core/services/statistiques.service';
import { VillaDetail as VillaDetailModel, TypeVillaLabels } from '../../../../core/models/villa.model';
import { AnalysePrixBien } from '../../../../core/models/statistiques.model';
import { SiteConfigService } from '../../../../core/services/site-config.service';
import { DemandeVisiteModalComponent, ModalMode } from '../../../../shared/components/demande-visite-modal/demande-visite-modal.component';
import { SignalementModalComponent } from '../../../../shared/components/signalement-modal/signalement-modal.component';
import { FavorisService } from '../../../../core/services/favoris.service';

@Component({
  selector: 'app-villa-detail',
  imports: [BienMapComponent, RouterLink, DemandeVisiteModalComponent, SignalementModalComponent],
  templateUrl: './villa-detail.html',
  styleUrl: './villa-detail.scss'
})
export class VillaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly villaService = inject(VillaService);
  private readonly statsService = inject(StatistiquesService);
  private readonly seo = inject(SeoService);
  readonly favoris = inject(FavorisService);
  readonly siteConfig = inject(SiteConfigService);

  villa: VillaDetailModel | null = null;
  analyse: AnalysePrixBien | null = null;
  loading = true;
  error = false;
  readonly TypeVillaLabels = TypeVillaLabels;

  modalOuvert       = signal(false);
  modalMode         = signal<ModalMode>('visite');
  signalementOuvert = signal(false);

  ouvrirSignalement() { this.signalementOuvert.set(true); }
  fermerSignalement() { this.signalementOuvert.set(false); }

  get whatsappUrl(): string | null {
    return this.siteConfig.whatsappUrl(`Bonjour, je suis intéressé par la villa "${this.villa?.titre}" sur MaMaison.`);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.villaService.obtenirDetail(id).subscribe({
      next: v => {
        this.villa = v;
        this.loading = false;
        this.seo.setPage(v.titre, `${v.titre} à ${v.quartier} — ${this.formatPrix(v.prix)}. Informations déclarées dans l'annonce.`, v.imagePrincipaleUrl ?? undefined);
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

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }
}
