import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Annonce, DossierLocationComponent } from './dossier-location.component';
import { AuthService } from '../../core/services/auth.service';
import { Role, RoleLabels } from '../../core/models/auth.model';
import { FavorisService } from '../../core/services/favoris.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

type Onglet = 'resume' | 'demandes' | 'annonces' | 'favoris';
interface Profil { nom: string; telephone: string; email: string | null; role: Role; }
interface Stats { nbDemandes: number; nbLocations: number; nbSignalements: number; }
interface Demande { id: string; titre?: string; nature: string; reponse?: string; dateConfirmee?: string; bienId: string; statut: number; dateSouhaitee: string | null; commentaire: string | null; dateCreation: string; }

@Component({
  selector: 'app-profil',
  imports: [DossierLocationComponent, RouterLink, DatePipe, FormsModule],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss',
})
export class ProfilComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly favoris = inject(FavorisService);
  private readonly toast = inject(ToastService);

  readonly onglet = signal<Onglet>('resume');
  readonly profil = signal<Profil | null>(null);
  readonly nomAffiche = computed(() => this.profil()?.nom ?? this.auth.user()?.nom ?? 'Mon compte');
  readonly roleLabel = computed(() => RoleLabels[this.profil()?.role ?? this.auth.user()?.role ?? -1] ?? 'Rôle non reconnu');
  readonly onglets = computed(() => [
    { id: 'resume' as const, label: 'Vue d’ensemble', icon: 'user' },
    { id: 'demandes' as const, label: 'Mes demandes', icon: 'navigation' },
    ...(this.auth.peutPublier() ? [{ id: 'annonces' as const, label: 'Mes annonces', icon: 'home' }] : []),
    { id: 'favoris' as const, label: 'Favoris (' + this.favoris.count() + ')', icon: 'heart' },
  ]);

  stats: Stats | null = null;
  demandes: Demande[] = [];
  annonces: Annonce[] = [];
  readonly loading = signal(false);
  readonly profilLoading = signal(false);
  readonly demandesLoading = signal(false);
  readonly annoncesLoading = signal(false);
  readonly saving = signal(false);
  profilErreur = '';
  statsErreur = '';
  demandesErreur = '';
  annoncesErreur = '';
  saveErreur = '';
  readonly sessionExpiree = signal(false);
  private demandesChargees = false;
  private annoncesChargees = false;

  editNom = '';
  editEmail = '';
  editMode = false;
  readonly statutDemandeLabel = ['En attente', 'Confirmée', 'Annulée', 'Effectuée'];
  readonly objets:Record<string,string>={visite:'Visite',rappel:'Rappel',contact:'Contact MaMaison','3d':'Visite 3D',historique:'Demande ancienne'};
  readonly statutLocationLabel = ['Brouillon', 'En vérification', 'Publié', 'Loué', 'Expiré', 'Suspendu', 'Rejeté'];
  readonly typeFavoriLabel = { villa: 'Villa', location: 'Location', terrain: 'Terrain' };

  ngOnInit() {
    this.chargerProfil();
    this.chargerStats();
  }

  chargerProfil() {
    if (this.profilLoading()) return;
    this.profilLoading.set(true);
    this.profilErreur = '';
    this.http.get<Profil>(environment.apiUrl + '/profil').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.profilLoading.set(false)),
    ).subscribe({
      next: profil => this.profil.set(profil),
      error: (e: HttpErrorResponse) => this.profilErreur = this.messageErreur(e, 'Le profil n’a pas pu être chargé.'),
    });
  }

  activerEdit() {
    const profil = this.profil();
    if (!profil || this.saving()) return;
    this.editNom = profil.nom;
    this.editEmail = profil.email ?? '';
    this.saveErreur = '';
    this.editMode = true;
  }

  sauvegarderProfil() {
    const profil = this.profil();
    if (!profil || this.saving()) return;
    const nom = this.editNom.trim();
    const email = this.editEmail.trim();
    if (!nom || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      this.saveErreur = 'Renseignez un nom et une adresse email valide, ou laissez l’email vide.';
      return;
    }
    this.saveErreur = '';
    this.saving.set(true);
    this.http.patch(environment.apiUrl + '/profil', { nom, email: email || null }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: () => {
        // The current PATCH contract keeps the stored email when an empty value is sent.
        this.profil.set({ ...profil, nom, email: email || profil.email });
        this.auth.actualiserNom(nom);
        this.editMode = false;
        this.toast.succes('Profil mis à jour.');
      },
      error: (e: HttpErrorResponse) => this.saveErreur = this.messageErreur(e, 'Le profil n’a pas été enregistré. Réessayez.'),
    });
  }

  chargerStats() {
    if (this.loading()) return;
    this.loading.set(true);
    this.statsErreur = '';
    this.http.get<Stats>(environment.apiUrl + '/profil/stats').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: stats => this.stats = stats,
      error: (e: HttpErrorResponse) => this.statsErreur = this.messageErreur(e, 'Les indicateurs sont indisponibles.'),
    });
  }

  allerOnglet(tab: Onglet) {
    if (tab === 'annonces' && !this.auth.peutPublier()) return;
    this.onglet.set(tab);
    if (tab === 'demandes' && !this.demandesChargees) this.chargerDemandes();
    if (tab === 'annonces' && !this.annoncesChargees) this.chargerAnnonces();
  }

  chargerDemandes() {
    if (this.demandesLoading()) return;
    this.demandesLoading.set(true);
    this.demandesErreur = '';
    this.http.get<Demande[]>(environment.apiUrl + '/profil/demandes').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.demandesLoading.set(false)),
    ).subscribe({
      next: demandes => { this.demandes = demandes; this.demandesChargees = true; },
      error: (e: HttpErrorResponse) => this.demandesErreur = this.messageErreur(e, 'Vos demandes n’ont pas pu être chargées.'),
    });
  }

  chargerAnnonces() {
    if (!this.auth.peutPublier() || this.annoncesLoading()) return;
    this.annoncesLoading.set(true);
    this.annoncesErreur = '';
    this.http.get<Annonce[]>(environment.apiUrl + '/profil/locations').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.annoncesLoading.set(false)),
    ).subscribe({
      next: annonces => { this.annonces = annonces; this.annoncesChargees = true; },
      error: (e: HttpErrorResponse) => this.annoncesErreur = this.messageErreur(e, 'Vos annonces n’ont pas pu être chargées.'),
    });
  }

  private messageErreur(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401) {
      this.sessionExpiree.set(true);
      return 'Votre session a expiré. Reconnectez-vous pour accéder à votre compte.';
    }
    if (error.status === 403) return 'Votre compte n’est pas autorisé à effectuer cette action.';
    if (error.status === 0) return 'Connexion au serveur impossible. Vérifiez votre connexion et réessayez.';
    return fallback;
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
