import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { FavorisService } from '../../core/services/favoris.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

type Onglet = 'resume' | 'demandes' | 'annonces' | 'favoris';

@Component({
  selector: 'app-profil',
  imports: [RouterLink, SlicePipe, FormsModule],
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  private readonly http    = inject(HttpClient);
  readonly auth            = inject(AuthService);
  readonly favoris         = inject(FavorisService);
  private readonly toast   = inject(ToastService);

  onglet    = signal<Onglet>('resume');
  stats:    any = null;
  demandes: any[] = [];
  annonces: any[] = [];
  loading   = signal(true);

  // Édition profil
  editNom   = '';
  editEmail = '';
  editMode  = false;

  activerEdit() {
    this.editNom   = this.auth.user()?.nom ?? '';
    this.editEmail = '';
    this.editMode  = true;
  }

  sauvegarderProfil() {
    if (!this.editNom.trim()) return;
    this.http.patch(`${environment.apiUrl}/profil`, { nom: this.editNom, email: this.editEmail || null }).subscribe({
      next: () => { this.toast.succes('Profil mis à jour !'); this.editMode = false; },
      error: () => this.toast.erreur('Erreur lors de la mise à jour.')
    });
  }

  readonly statutDemandeLabel = ['En attente','Confirmée','Annulée','Effectuée'];
  readonly statutLocationLabel = ['Brouillon','En vérification','Publié','Loué','Expiré','Suspendu','Rejeté'];

  ngOnInit() { this.chargerStats(); }

  chargerStats() {
    this.http.get(`${environment.apiUrl}/profil/stats`).subscribe({
      next: s => { this.stats = s; this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  allerOnglet(tab: Onglet | string) {
    const t = tab as Onglet;
    this.onglet.set(t);
    if (t === 'demandes' && !this.demandes.length)
      this.http.get<any[]>(`${environment.apiUrl}/profil/demandes`).subscribe(d => this.demandes = d);
    if (t === 'annonces' && !this.annonces.length)
      this.http.get<any[]>(`${environment.apiUrl}/profil/locations`).subscribe(a => this.annonces = a);
  }

  formatPrix(p: number) {
    return new Intl.NumberFormat('fr-CI',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(p);
  }
  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
  }
}
