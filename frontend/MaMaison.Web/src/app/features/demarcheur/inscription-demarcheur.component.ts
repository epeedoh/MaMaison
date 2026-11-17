import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/auth.model';

@Component({
  selector: 'app-inscription-demarcheur',
  imports: [FormsModule, RouterLink],
  templateUrl: './inscription-demarcheur.component.html',
  styleUrl: './inscription-demarcheur.component.scss',
})
export class InscriptionDemarcheurComponent {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly peutCandidater = computed(() => this.auth.user()?.role === Role.Demarcheur || this.auth.estAdmin());
  zoneActivite = '';
  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');
  erreurMsg   = '';

  soumettre() {
    const user = this.auth.user();
    if (!user || !this.peutCandidater() || !this.zoneActivite.trim() || this.etat() === 'chargement') return;
    this.etat.set('chargement');
    this.http.post(`${environment.apiUrl}/demarcheurs/inscrire`, {
      nom: user.nom, telephone: user.telephone, zoneActivite: this.zoneActivite.trim()
    }).subscribe({
      next: () => this.etat.set('succes'),
      error: (e) => {
        this.erreurMsg = e.status === 401 ? 'Votre session a expiré. Reconnectez-vous avant de réessayer.'
          : e.status === 403 ? 'Votre compte ne peut pas déposer cette candidature.'
          : e?.error?.message ?? 'La candidature n’a pas pu être envoyée. Réessayez.';
        this.etat.set('erreur');
      }
    });
  }
}
