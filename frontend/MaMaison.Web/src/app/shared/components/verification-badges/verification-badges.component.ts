import { Component, Input } from '@angular/core';

export interface Badge { libelle: string; actif: boolean; icon: string; }

@Component({
  selector: 'app-verification-badges',
  imports: [],
  template: `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      @for (b of badges; track b.libelle) {
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:.02em;"
              [style.background]="b.actif ? '#D1FAE5' : '#F3F4F6'"
              [style.color]="b.actif ? '#065F46' : '#9CA3AF'"
              [style.border]="b.actif ? '1px solid #A7F3D0' : '1px solid #E5E7EB'">
          {{ b.icon }} {{ b.libelle }}
        </span>
      }
    </div>
  `
})
export class VerificationBadgesComponent {
  @Input() telephoneVerifie  = false;
  @Input() proprietaireIdentifie = false;
  @Input() adresseConfirmee  = false;
  @Input() photosVerifiees   = false;
  @Input() disponibiliteConfirmee = false;
  @Input() bienInspecte      = false;

  get badges(): Badge[] {
    return [
      { libelle: 'Téléphone vérifié',      actif: this.telephoneVerifie,          icon: '📱' },
      { libelle: 'Propriétaire identifié', actif: this.proprietaireIdentifie,     icon: '👤' },
      { libelle: 'Adresse confirmée',      actif: this.adresseConfirmee,          icon: '📍' },
      { libelle: 'Photos vérifiées',       actif: this.photosVerifiees,           icon: '📷' },
      { libelle: 'Disponible',             actif: this.disponibiliteConfirmee,    icon: '✅' },
      { libelle: 'Bien inspecté',          actif: this.bienInspecte,              icon: '🏠' },
    ];
  }
}
