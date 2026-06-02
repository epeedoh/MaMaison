import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-inscription-demarcheur',
  imports: [FormsModule, RouterLink],
  templateUrl: './inscription-demarcheur.component.html',
})
export class InscriptionDemarcheurComponent {
  private readonly http = inject(HttpClient);

  nom         = '';
  telephone   = '';
  zoneActivite = '';
  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');
  erreurMsg   = '';

  soumettre() {
    if (!this.nom || !this.telephone || !this.zoneActivite) return;
    this.etat.set('chargement');
    this.http.post(`${environment.apiUrl}/demarcheurs/inscrire`, {
      nom: this.nom, telephone: this.telephone, zoneActivite: this.zoneActivite
    }).subscribe({
      next: () => this.etat.set('succes'),
      error: (e) => { this.erreurMsg = e?.error?.message ?? 'Erreur.'; this.etat.set('erreur'); }
    });
  }
}
