import { FonctionnalitesService } from '../../../core/services/fonctionnalites.service';
import { SiteSettingsComponent } from '../site-settings.component';
import { JustificatifsComponent } from '../../../shared/components/justificatifs/justificatifs.component';
import { BienMapComponent } from '../../../shared/components/bien-map/bien-map.component';
import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

type Onglet = 'dashboard' | 'villas' | 'locations' | 'terrains' | 'demarcheurs' | 'demandes' | 'signalements' | 'reglages';

@Component({
  selector: 'app-admin-dashboard',
  imports: [SiteSettingsComponent, JustificatifsComponent, BienMapComponent, RouterLink, SlicePipe, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly fonctionnalites = inject(FonctionnalitesService);
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  onglet = signal<Onglet>('dashboard');
  dashboard:    any = null;
  villas:       any[] = [];
  locations:    any[] = [];
  terrains:     any[] = [];
  demarcheurs:  any[] = [];
  demandes:     any[] = [];
  signalements: any[] = [];

  // Formulaire nouveau terrain
  newTerrain = { titre:'', localisation:'', commune:'', quartier:'', surface:0, prix:0, usage:0, latitude:null as number|null, longitude:null as number|null, typeDocument:'', description:'' };
  loading = signal(true);
  message = signal('');

  terrainsActifs = false;
  parametresCharges = false;
  parametresEnCours = false;
  dossier: any = null;
  ngOnInit() {
    this.chargerDashboard();
    this.http.get<{ terrainsActifs: boolean }>(`${environment.apiUrl}/fonctionnalites`).subscribe({
      next: r => { this.terrainsActifs = r.terrainsActifs; this.parametresCharges = true; },
      error: () => this.message.set('Impossible de charger le paramètre des terrains.')
    });
  }
  basculerTerrains() {
    this.parametresEnCours = true;
    this.http.put<{ terrainsActifs: boolean }>(`${environment.apiUrl}/fonctionnalites/terrains`, { actif: !this.terrainsActifs }).subscribe({
      next: r => { this.terrainsActifs = r.terrainsActifs; this.parametresEnCours = false; this.message.set('Paramètre des terrains enregistré.'); this.fonctionnalites.actualiser(); },
      error: () => { this.parametresEnCours = false; this.message.set('Échec de l’enregistrement.'); }
    });
  }
  ouvrirDossier(bien: any) { this.dossier = { ...bien }; }
  enregistrerPosition() {
    this.http.put(`${this.base}/biens/${this.dossier.id}/coordonnees`, { latitude: this.dossier.latitude, longitude: this.dossier.longitude }).subscribe({
      next: () => this.message.set('Position enregistrée.'),
      error: e => this.message.set(e.error?.message ?? 'Position invalide.')
    });
  }

  chargerDashboard() {
    this.loading.set(true);
    this.dashboard = null;
    this.http.get(`${this.base}/dashboard`).subscribe({
      next: d => { this.dashboard = d; this.loading.set(false); },
      error: () => { this.loading.set(false); this.message.set('Le tableau de bord ne peut pas être chargé. Réessayez.'); }
    });
  }

  chargerVillas() {
    this.http.get<any[]>(`${this.base}/villas`).subscribe(v => this.villas = v);
  }
  chargerLocations() {
    this.http.get<any[]>(`${this.base}/locations`).subscribe(l => this.locations = l);
  }
  chargerDemandes() {
    this.http.get<any[]>(`${this.base}/demandes`).subscribe(d => this.demandes = d);
  }
  chargerSignalements() {
    this.http.get<any[]>(`${this.base}/signalements`).subscribe(s => this.signalements = s);
  }

  allerOnglet(tab: Onglet | string) {
    const t = tab as Onglet;
    this.onglet.set(t);
    this.message.set('');
    if (t === 'dashboard')    this.chargerDashboard();
    if (t === 'villas')       this.chargerVillas();
    if (t === 'locations')    this.chargerLocations();
    if (t === 'terrains')     this.chargerTerrains();
    if (t === 'demarcheurs')  this.chargerDemarcheurs();
    if (t === 'demandes')     this.chargerDemandes();
    if (t === 'signalements') this.chargerSignalements();
  }

  chargerTerrains() {
    this.http.get<any[]>(`${this.base}/terrains`).subscribe(t => this.terrains = t);
  }
  chargerDemarcheurs() {
    this.http.get<any[]>(`${environment.apiUrl}/demarcheurs`).subscribe(d => this.demarcheurs = d);
  }

  publierTerrain(id: string) {
    this.http.put(`${this.base}/terrains/${id}/publier`, {}).subscribe({
      next: (r: any) => { this.message.set(`✅ Terrain publié · Niveau: ${r.niveau}`); this.chargerTerrains(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur.')
    });
  }

  creerTerrain() {
    this.http.post(`${this.base}/terrains`, this.newTerrain).subscribe({
      next: () => { this.message.set('✅ Terrain créé.'); this.chargerTerrains(); this.newTerrain = { titre:'', localisation:'', commune:'', quartier:'', surface:0, prix:0, usage:0, latitude:null, longitude:null, typeDocument:'', description:'' }; },
      error: () => this.message.set('❌ Erreur création terrain.')
    });
  }

  verifierDemarcheur(id: string) {
    this.http.put(`${environment.apiUrl}/demarcheurs/${id}/verifier`, '"https://example.com/cni.jpg"',
      { headers: {'Content-Type':'application/json'} }).subscribe({
      next: () => { this.message.set('✅ Démarcheur vérifié.'); this.chargerDemarcheurs(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur.')
    });
  }

  suspendreD(id: string) {
    this.http.put(`${environment.apiUrl}/demarcheurs/${id}/suspendre`, {}).subscribe({
      next: () => { this.message.set('🚫 Démarcheur suspendu.'); this.chargerDemarcheurs(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur.')
    });
  }

  publierVilla(id: string) {
    this.http.put(`${this.base}/villas/${id}/publier`, {}).subscribe({
      next: (r: any) => { this.message.set(`✅ Villa publiée · Score: ${r.score}/100`); this.chargerVillas(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur lors de la publication.')
    });
  }

  validerLocation(id: string) {
    this.http.put(`${this.base}/locations/${id}/valider`, {}).subscribe({
      next: (r: any) => { this.message.set(`✅ Location validée · Score: ${r.score}/100`); this.chargerLocations(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur de validation.')
    });
  }

  identifierTitulaire(id: string, telephone: string) {
    this.http.put(`${environment.apiUrl}/dossiers-location/${id}/proprietaire`, { telephone:telephone.trim() }).subscribe({
      next: () => {this.message.set('Titulaire identifié.');this.chargerLocations();},
      error:e=>this.message.set(e.error?.message ?? 'Attribution refusée.')
    });
  }
  repondre(id: string, texte: string) {
    this.http.put(`${this.base}/demandes/${id}/repondre`, JSON.stringify(texte.trim()), { headers:{'Content-Type':'application/json'} }).subscribe({
      next:()=>{this.message.set('Réponse envoyée au demandeur.');this.chargerDemandes();},
      error:e=>this.message.set(e.error?.message ?? 'Réponse non envoyée.')
    });
  }
  rejeterLocation(id: string, motif: string) {
    this.http.put(`${this.base}/locations/${id}/rejeter`, JSON.stringify(motif.trim()), { headers: {'Content-Type':'application/json'} }).subscribe({
      next: () => { this.message.set('🗑 Location rejetée.'); this.chargerLocations(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur.')
    });
  }

  confirmerDemande(id: string) {
    this.http.put(`${this.base}/demandes/${id}/confirmer`, {}).subscribe({
      next: () => { this.message.set('✅ Demande confirmée.'); this.chargerDemandes(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur.')
    });
  }

  resoudreSignalement(id: string) {
    this.http.put(`${this.base}/signalements/${id}/resoudre`, {}).subscribe({
      next: () => { this.message.set('✅ Résolu.'); this.chargerSignalements(); },
      error: e => this.message.set(e.error?.message ?? '❌ Erreur.')
    });
  }

  statutVillaLabel(s: number): string {
    return ['Brouillon','En validation','Publié','Réservé','Vendu','Suspendu'][s] ?? '?';
  }
  statutLocationLabel(s: number): string {
    return ['Brouillon','En vérification','Publié','Loué','Expiré','Suspendu','Rejeté'][s] ?? '?';
  }
  statutDemandeLabel(s: number): string {
    return ['En attente','Confirmée','Annulée','Effectuée'][s] ?? '?';
  }
  formatPrix(p: number) {
    return new Intl.NumberFormat('fr-CI',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(p);
  }
  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }
}
