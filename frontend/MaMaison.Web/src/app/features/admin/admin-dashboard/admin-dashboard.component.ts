import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

type Onglet = 'dashboard' | 'villas' | 'locations' | 'terrains' | 'demarcheurs' | 'demandes' | 'signalements';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, SlicePipe, FormsModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
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

  ngOnInit() { this.chargerDashboard(); }

  chargerDashboard() {
    this.loading.set(true);
    this.http.get(`${this.base}/dashboard`).subscribe({
      next: d => { this.dashboard = d; this.loading.set(false); },
      error: () => this.loading.set(false)
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
      error: () => this.message.set('❌ Erreur.')
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
      error: () => this.message.set('❌ Erreur.')
    });
  }

  suspendreD(id: string) {
    this.http.put(`${environment.apiUrl}/demarcheurs/${id}/suspendre`, {}).subscribe({
      next: () => { this.message.set('🚫 Démarcheur suspendu.'); this.chargerDemarcheurs(); },
      error: () => this.message.set('❌ Erreur.')
    });
  }

  publierVilla(id: string) {
    this.http.put(`${this.base}/villas/${id}/publier`, {}).subscribe({
      next: (r: any) => { this.message.set(`✅ Villa publiée · Score: ${r.score}/100`); this.chargerVillas(); },
      error: () => this.message.set('❌ Erreur lors de la publication.')
    });
  }

  validerLocation(id: string) {
    this.http.put(`${this.base}/locations/${id}/valider`, {}).subscribe({
      next: (r: any) => { this.message.set(`✅ Location validée · Score: ${r.score}/100`); this.chargerLocations(); },
      error: () => this.message.set('❌ Erreur de validation.')
    });
  }

  rejeterLocation(id: string) {
    this.http.put(`${this.base}/locations/${id}/rejeter`, 'null', { headers: {'Content-Type':'application/json'} }).subscribe({
      next: () => { this.message.set('🗑 Location rejetée.'); this.chargerLocations(); },
      error: () => this.message.set('❌ Erreur.')
    });
  }

  confirmerDemande(id: string) {
    this.http.put(`${this.base}/demandes/${id}/confirmer`, {}).subscribe({
      next: () => { this.message.set('✅ Demande confirmée.'); this.chargerDemandes(); },
      error: () => this.message.set('❌ Erreur.')
    });
  }

  resoudreSignalement(id: string) {
    this.http.put(`${this.base}/signalements/${id}/resoudre`, {}).subscribe({
      next: () => { this.message.set('✅ Résolu.'); this.chargerSignalements(); },
      error: () => this.message.set('❌ Erreur.')
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
