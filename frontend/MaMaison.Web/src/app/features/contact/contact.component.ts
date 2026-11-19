import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DemandeVisiteService } from '../../core/services/demande-visite.service';
import { SiteConfigService } from '../../core/services/site-config.service';
import { ContactDraftStore } from './contact-draft.store';

@Component({
  selector: 'app-contact',
  imports: [FormsModule, RouterLink],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly demandes = inject(DemandeVisiteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly draft = inject(ContactDraftStore);
  readonly auth = inject(AuthService);
  readonly siteConfig = inject(SiteConfigService);

  get nom(): string { return this.auth.user()?.nom ?? ''; }
  get telephone(): string { return this.auth.user()?.telephone ?? ''; }
  email     = '';
  sujet     = 'Achat villa';
  message   = '';
  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');
  connexionRequise = signal(false);

  readonly sujets = [
    'Achat villa', 'Location', 'Investissement terrain',
    'Mode diaspora / rapport terrain', 'Devenir partenaire',
    'Notaires', 'Géomètres', 'Banques & Financement', 'Assurances',
    'Promoteur — pack visite 3D', 'Autre demande'
  ];

  constructor() {
    const sujet = this.route.snapshot.queryParamMap.get('sujet');
    if (sujet && this.sujets.includes(sujet)) this.sujet = sujet;
    const saved = this.draft.value;
    if (saved) {
      this.email = saved.email;
      this.sujet = saved.sujet;
      this.message = saved.message;
      this.draft.value = null;
    }
  }

  get returnUrl(): string {
    return this.router.createUrlTree(['/contact'], { queryParams: { sujet: this.sujet } }).toString();
  }

  conserverFormulaire() {
    this.draft.value = {
      email: this.email,
      sujet: this.sujet, message: this.message,
    };
  }

  soumettre() {
    if (this.etat() === 'chargement' || this.etat() === 'succes') return;
    if (!this.auth.estConnecte() || this.connexionRequise()) {
      this.conserverFormulaire();
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
      return;
    }
    if (!this.nom.trim() || !this.telephone.trim() || !this.message.trim()) return;
    this.etat.set('chargement');
    this.demandes.soumettre({
      nature: 'contact', bienId: '00000000-0000-0000-0000-000000000000',
      nom: this.nom.trim(),
      telephone: this.telephone.trim(),
      email: this.email.trim() || undefined,
      commentaire: `[${this.sujet}] ${this.message.trim()}${this.email.trim() ? ` | Email: ${this.email.trim()}` : ''}`,
    }).subscribe({
      next: result => {
        if (!result?.id) {
          this.etat.set('erreur');
          return;
        }
        this.draft.value = null;
        this.etat.set('succes');
      },
      error: error => {
        this.connexionRequise.set(error.status === 401);
        this.etat.set('erreur');
      },
    });
  }
}
