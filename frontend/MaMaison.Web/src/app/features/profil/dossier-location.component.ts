import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { JustificatifsComponent } from '../../shared/components/justificatifs/justificatifs.component';

export interface Annonce {
  id: string; titre: string; quartier: string; commune: string; loyer: number; statut: number; dateCreation: string;
  nombrePieces: number; caution: number; avance: number; fraisAgence: number; motifRejet?: string;
  proprietaire: boolean; deposant: boolean; responsable: boolean; responsableNom?: string; titulaireIdentifie: boolean;
}
interface Visite { id: string; dateSouhaitee?: string; dateConfirmee?: string; commentaire?: string; statut: number; }

@Component({
  selector: 'app-dossier-location', imports: [FormsModule, DatePipe, JustificatifsComponent],
  styles: [`
    :host {display:block;padding:12px 0} details {border-top:1px solid var(--border);padding:12px 0}
    summary {cursor:pointer;font-weight:600} label {display:grid;gap:5px;font-size:13px}
    input {min-height:44px;border:1px solid var(--border);border-radius:4px;padding:8px;width:100%}
    .fields {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:10px}
    p,button,.fields {margin:8px 0} li {padding:8px 0} .actions {display:flex;flex-wrap:wrap;gap:6px}
  `],
  template: `
    <details (toggle)="opened($event)"><summary>Dossier privé</summary>
      <p>Votre rôle : {{ a.deposant ? 'déposant' : '' }} {{ a.proprietaire ? ' · propriétaire' : '' }} {{ a.responsable ? ' · responsable des visites' : '' }}</p>
      <p>Titulaire : {{ a.titulaireIdentifie ? 'renseigné' : 'à identifier' }} · Visites : {{ a.responsableNom || 'non attribuées' }}</p>
      @if ((a.deposant || a.proprietaire) && (a.statut === 6 || a.statut === 0)) {
        @if (a.statut === 6) { <p><strong>À corriger :</strong> {{ a.motifRejet || 'Motif non enregistré pour cette ancienne décision.' }}</p> }
        <div class="fields">
          <label>Titre<input [(ngModel)]="edit.titre" maxlength="200"></label>
          <label>Commune<input [(ngModel)]="edit.commune" maxlength="100"></label>
          <label>Quartier<input [(ngModel)]="edit.quartier" maxlength="100"></label>
          <label>Pièces<input type="number" [(ngModel)]="edit.pieces" min="1"></label>
          <label>Loyer (FCFA)<input type="number" [(ngModel)]="edit.loyer" min="1"></label>
          <label>Caution (FCFA)<input type="number" [(ngModel)]="edit.caution" min="0"></label>
          <label>Avance (FCFA)<input type="number" [(ngModel)]="edit.avance" min="0"></label>
          <label>Frais d’agence (FCFA)<input type="number" [(ngModel)]="edit.frais" min="0"></label>
        </div><button class="btn btn-navy" [disabled]="busy" (click)="send('corriger',edit)">Soumettre pour vérification</button>
      }
      @if (open && (a.proprietaire || a.deposant)) { <app-justificatifs [bienId]="a.id" [lecture]="a.proprietaire"/> }
      @if (a.proprietaire) {
        <details><summary>Responsable des visites</summary>
          <label>Téléphone du compte mandaté<input type="tel" [(ngModel)]="telephone"></label>
          <div class="actions"><button class="btn btn-outline" [disabled]="busy || !telephone.trim()" (click)="send('responsable',{telephone:telephone.trim()})">Déléguer les visites</button>
          @if (!a.responsable) { <button class="btn btn-outline" [disabled]="busy" (click)="send('responsable',{telephone:null})">Reprendre les visites</button> }</div>
        </details>
      }
      @if (a.responsable && a.statut===2) {
        <h4>Visites reçues</h4>
        @if (visites && !visites.length) { <p>Aucune visite demandée.</p> }
        <ul>@for (v of visites; track v.id) {
          <li>Date souhaitée : {{ (v.dateSouhaitee | date:'dd/MM/yyyy') || 'non précisée' }}
            @if (v.commentaire) { <p>{{ v.commentaire }}</p> }
            @if (v.statut===0) {
              <label>Créneau confirmé (heure d’Abidjan)<input type="datetime-local" #date></label>
              <button class="btn btn-outline" [disabled]="busy" (click)="confirmer(v,date.value)">Confirmer la visite</button>
            } @else { <p>{{ v.dateConfirmee ? 'Confirmée : ' + (v.dateConfirmee | date:'dd/MM/yyyy HH:mm':'+0000') : 'Clôturée' }}</p> }
          </li>
        }</ul>
      }
      <p role="status">{{ message }}</p>
    </details>`
})
export class DossierLocationComponent {
  @Input({required:true}) a!: Annonce;
  @Output() changed = new EventEmitter<void>();
  private http = inject(HttpClient);
  telephone = ''; message = ''; open = false; busy = false; visites: Visite[] | null = null;
  edit = {titre:'', commune:'', quartier:'', pieces:1, loyer:0, caution:0, avance:0, frais:0};
  get base() { return environment.apiUrl + '/dossiers-location/' + this.a.id + '/'; }
  opened(event: Event) {
    this.open = (event.target as HTMLDetailsElement).open;
    if (!this.open) return;
    const a=this.a;
    this.edit={titre:a.titre,commune:a.commune,quartier:a.quartier,pieces:a.nombrePieces,loyer:a.loyer,caution:a.caution,avance:a.avance,frais:a.fraisAgence};
    if (a.responsable && a.statut===2) this.charger();
  }
  charger() { this.http.get<Visite[]>(this.base+'visites').subscribe({next:r=>this.visites=r,error:()=>this.message='Visites indisponibles.'}); }
  confirmer(v:Visite, value:string) {
    if (!value) { this.message='Renseignez un créneau.'; return; }
    this.send('visites/'+v.id+'/confirmer',{date:value+'Z'});
  }
  send(path:string, body:object) {
    if (this.busy) return;
    this.busy=true;
    this.http.put(this.base+path,body).subscribe({next:()=>{
      this.busy=false; this.message='Modification enregistrée.';
      if (path.startsWith('visites/')) this.charger(); else this.changed.emit();
    },error:e=>{this.busy=false;this.message=e.error?.message || 'Action refusée ou dossier modifié.';}});
  }
}
