import {
  Component, Input, Output, EventEmitter, OnInit, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DemandeVisiteService } from '../../../core/services/demande-visite.service';

export type ModalMode = 'rappel' | 'visite' | '3d';

@Component({
  selector: 'app-demande-visite-modal',
  imports: [FormsModule],
  templateUrl: './demande-visite-modal.component.html',
  styleUrl: './demande-visite-modal.component.scss'
})
export class DemandeVisiteModalComponent implements OnInit {
  @Input() bienId = '';
  @Input() titreBien = '';
  @Input() mode: ModalMode = 'visite';
  @Output() fermer = new EventEmitter<void>();

  private readonly service = inject(DemandeVisiteService);

  nom = '';
  telephone = '';
  email = '';
  dateSouhaitee = '';
  commentaire = '';

  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');
  messageErreur = '';
  readonly today = new Date().toISOString().split('T')[0];

  get titre(): string {
    const titres: Record<ModalMode, string> = {
      rappel: 'Demander un rappel',
      visite: 'Planifier une visite',
      '3d': 'Visite 3D — Prendre rendez-vous',
    };
    return titres[this.mode];
  }

  get sousTitre(): string {
    const sous: Record<ModalMode, string> = {
      rappel: 'Un conseiller vous rappelle dans les 24h',
      visite: 'Choisissez une date, nous confirmons',
      '3d': 'Nous vous envoyons l\'accès à la visite 3D',
    };
    return sous[this.mode];
  }

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  fermerModal() {
    document.body.style.overflow = '';
    this.fermer.emit();
  }

  soumettre() {
    if (!this.nom.trim() || !this.telephone.trim()) return;

    this.etat.set('chargement');

    this.service.soumettre({
      bienId: this.bienId,
      nom: this.nom.trim(),
      telephone: this.telephone.trim(),
      email: this.email.trim() || undefined,
      dateSouhaitee: this.dateSouhaitee || undefined,
      commentaire: this.commentaire.trim() || undefined,
    }).subscribe({
      next: () => this.etat.set('succes'),
      error: () => {
        this.messageErreur = 'Une erreur est survenue. Veuillez réessayer.';
        this.etat.set('erreur');
      }
    });
  }
}
