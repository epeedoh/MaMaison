import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-contact',
  imports: [FormsModule, RouterLink],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  private readonly http = inject(HttpClient);

  nom       = '';
  telephone = '';
  email     = '';
  sujet     = 'Achat villa';
  message   = '';
  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');

  readonly sujets = [
    'Achat villa', 'Location vérifiée', 'Investissement terrain',
    'Mode diaspora / rapport terrain', 'Devenir partenaire',
    'Promoteur — pack visite 3D', 'Autre demande'
  ];

  soumettre() {
    if (!this.nom || !this.telephone || !this.message) return;
    this.etat.set('chargement');
    // Soumettre comme demande de visite générique
    this.http.post(`${environment.apiUrl}/demandesvisite`, {
      bienId: '00000000-0000-0000-0000-000000000000',
      commentaire: `[${this.sujet}] ${this.message} | Contact: ${this.email}`
    }).subscribe({
      next: () => this.etat.set('succes'),
      error: () => this.etat.set('erreur')
    });
  }
}
