import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
interface Justificatif { id: string; categorie: string; valide: boolean; }
@Component({
  selector: 'app-justificatifs',
  styles: [`:host { display: block; margin: 16px 0; } label { display: block; margin: 16px 0; } input { display: block; margin-top: 6px; max-width: 100%; } button { margin: 4px; }`],
  template: `<section style="padding:16px;border:1px solid var(--border);border-radius:12px">
    <h3>Justificatifs confidentiels</h3>
    <p>Une preuve de propriété et une pièce d’identité du propriétaire doivent être examinées avant publication.</p>
    <label>Preuve de propriété (titre foncier, ACD…) <input type="file" accept="application/pdf,image/jpeg,image/png" [disabled]="occupe()" (change)="envoyer($event, 'Propriete')"></label>
    <label>Pièce d’identité du propriétaire <input type="file" accept="application/pdf,image/jpeg,image/png" [disabled]="occupe()" (change)="envoyer($event, 'IdentiteProprietaire')"></label>
    <p>PDF, JPEG ou PNG, 10 Mo maximum par fichier.</p>
    @for (doc of documents(); track doc.id) {
      <p>{{ doc.categorie === 'Propriete' ? 'Preuve de propriété' : 'Identité du propriétaire' }} — {{ doc.valide ? 'Validé' : 'À examiner' }}
        @if (admin || lecture) { <button type="button" (click)="ouvrir(doc)">Consulter</button> }
        @if (admin && !doc.valide) { <button type="button" (click)="valider(doc)">Valider après examen</button> }
      </p>
    }
    <p role="status">{{ message() }}</p>
  </section>`
})
export class JustificatifsComponent implements OnChanges {
  @Input({ required: true }) bienId = '';
  @Input() admin = false;
  @Input() lecture = false;
  private http = inject(HttpClient);
  documents = signal<Justificatif[]>([]);
  message = signal('');
  occupe = signal(false);
  get base() { return `${environment.apiUrl}/biens/${this.bienId}/justificatifs`; }
  ngOnChanges() { this.charger(); }
  charger() { this.http.get<Justificatif[]>(this.base).subscribe({ next: docs => this.documents.set(docs), error: () => this.message.set('Impossible de charger les justificatifs.') }); }
  envoyer(event: Event, categorie: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { this.message.set('Maximum 10 Mo.'); input.value = ''; return; }
    const data = new FormData(); data.append('categorie', categorie); data.append('file', file);
    this.occupe.set(true);
    this.http.post(this.base, data).subscribe({ next: () => { this.occupe.set(false); input.value = ''; this.message.set('Document envoyé pour examen.'); this.charger(); }, error: e => { this.occupe.set(false); this.message.set(e.error?.message ?? 'Échec de l’envoi.'); } });
  }
  ouvrir(doc: Justificatif) {
    this.http.get(`${this.base}/${doc.id}`, { responseType: 'blob' }).subscribe({ next: blob => {
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'justificatif'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, error: () => this.message.set('Document indisponible.') });
  }
  valider(doc: Justificatif) { this.http.put(`${this.base}/${doc.id}/valider`, {}).subscribe({ next: () => this.charger(), error: () => this.message.set('Validation impossible.') }); }
}
