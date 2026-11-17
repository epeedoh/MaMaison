import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly returnUrl = this.destinationInterne(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly sessionExpiree = this.route.snapshot.queryParamMap.get('reason') === 'session-expiree';
  readonly demandeVisite = this.route.snapshot.queryParamMap.get('reason') === 'visite';

  telephone = '';
  motDePasse = '';
  etat = signal<'form' | 'chargement' | 'erreur'>('form');
  erreurMsg = '';

  get destinationLabel(): string {
    const path = this.returnUrl?.split(/[?#]/)[0];
    if (path && /^\/(villas|locations|terrains)\/[^/]+$/.test(path)) return 'la fiche du bien';
    if (path === '/publier') return 'la publication de votre bien';
    if (path === '/admin') return 'l’administration';
    if (path === '/profil') return 'votre compte';
    if (path === '/contact') return 'la page de contact';
    if (path === '/diaspora') return 'l’espace diaspora';
    if (path === '/') return 'l’accueil';
    return this.returnUrl ? 'la page demandée' : 'votre espace personnel';
  }

  private destinationInterne(value: string | null): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
    try {
      const tree = this.router.parseUrl(value);
      if (Object.keys(tree.root.children).some(key => key !== 'primary')) return null;
      const group = tree.root.children['primary'];
      if (group && Object.keys(group.children).length) return null;
      const segments = group?.segments ?? [];
      if (segments.some(s => Object.keys(s.parameters).length)) return null;
      const path = '/' + segments.map(s => s.path).join('/');
      const page = /^\/(?:profil|publier|admin|villas|locations|terrains|contact|diaspora|partenaires|devenir-apporteur)?$/;
      const bien = /^\/(?:villas|locations|terrains)\/[a-zA-Z0-9-]+$/;
      return page.test(path) || bien.test(path) ? this.router.serializeUrl(tree) : null;
    } catch { return null; }
  }

  soumettre() {
    if (!this.telephone.trim() || !this.motDePasse || this.etat() === 'chargement') return;
    this.erreurMsg = '';
    this.etat.set('chargement');
    this.auth.login({ telephone: this.telephone.trim(), motDePasse: this.motDePasse }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        const destination = this.returnUrl ?? (this.auth.estAdmin() ? '/admin' : '/profil');
        void this.router.navigateByUrl(destination).then(
          navigated => { if (!navigated) this.navigationErreur(); },
          () => this.navigationErreur(),
        );
      },
      error: (e: HttpErrorResponse) => {
        this.erreurMsg = e.status === 0 ? 'Connexion au serveur impossible. Vérifiez votre connexion.'
          : e.status === 401 ? 'Téléphone ou mot de passe incorrect.'
          : e.status === 403 ? 'Ce compte n’est pas autorisé à se connecter.'
          : e.status === 429 ? 'Trop de tentatives. Patientez avant de réessayer.'
          : e.status === 400 ? 'Vérifiez le téléphone et le mot de passe saisis.'
          : 'Le service de connexion est indisponible. Réessayez plus tard.';
        this.etat.set('erreur');
      },
    });
  }

  private navigationErreur() {
    this.erreurMsg = 'Connexion réussie, mais la page demandée est indisponible. Ouvrez votre compte.';
    this.etat.set('erreur');
  }
}
