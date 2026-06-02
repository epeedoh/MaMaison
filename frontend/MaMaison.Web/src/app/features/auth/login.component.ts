import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  telephone  = '';
  motDePasse = '';
  etat = signal<'form' | 'chargement' | 'erreur'>('form');
  erreurMsg  = '';

  soumettre() {
    if (!this.telephone || !this.motDePasse) return;
    this.etat.set('chargement');
    this.auth.login({ telephone: this.telephone, motDePasse: this.motDePasse }).subscribe({
      next: () => this.router.navigate([this.auth.estAdmin() ? '/admin' : '/']),
      error: (e) => {
        this.erreurMsg = e?.error?.message ?? 'Identifiants incorrects.';
        this.etat.set('erreur');
      }
    });
  }
}
