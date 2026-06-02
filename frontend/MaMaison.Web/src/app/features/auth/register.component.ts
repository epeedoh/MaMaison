import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/auth.model';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  nom        = '';
  telephone  = '';
  email      = '';
  motDePasse = '';
  role       = Role.Visiteur;
  etat = signal<'form' | 'chargement' | 'erreur'>('form');
  erreurMsg  = '';

  readonly profils = [
    { value: Role.Acheteur,     label: 'Acheteur / Investisseur' },
    { value: Role.Locataire,    label: 'Locataire' },
    { value: Role.Proprietaire, label: 'Propriétaire' },
    { value: Role.Promoteur,    label: 'Promoteur immobilier' },
    { value: Role.Demarcheur,   label: 'Démarcheur / Apporteur' },
  ];

  soumettre() {
    if (!this.nom || !this.telephone || !this.motDePasse) return;
    this.etat.set('chargement');
    this.auth.register({
      nom: this.nom, telephone: this.telephone,
      motDePasse: this.motDePasse, email: this.email || undefined,
      role: +this.role
    }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => {
        this.erreurMsg = e?.error?.message ?? 'Une erreur est survenue.';
        this.etat.set('erreur');
      }
    });
  }
}
