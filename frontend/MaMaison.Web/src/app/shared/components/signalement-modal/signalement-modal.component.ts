import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-signalement-modal',
  imports: [FormsModule],
  templateUrl: './signalement-modal.component.html',
  styleUrl: './signalement-modal.component.scss'
})
export class SignalementModalComponent implements OnInit {
  @Input() bienId = '';
  @Output() fermer = new EventEmitter<void>();

  private readonly http = inject(HttpClient);

  motif       = '';
  description = '';
  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');

  readonly motifs = [
    'Annonce frauduleuse',
    'Photos incorrectes ou trompeuses',
    'Bien déjà loué / vendu',
    'Prix erroné ou trompeur',
    'Propriétaire non identifié',
    'Faux document',
    'Autre',
  ];

  ngOnInit() { document.body.style.overflow = 'hidden'; }

  fermerModal() { document.body.style.overflow = ''; this.fermer.emit(); }

  soumettre() {
    if (!this.motif) return;
    this.etat.set('chargement');
    this.http.post(`${environment.apiUrl}/signalements`, {
      bienId: this.bienId,
      motif: this.motif,
      description: this.description || null
    }).subscribe({
      next: () => this.etat.set('succes'),
      error: () => this.etat.set('erreur')
    });
  }
}
