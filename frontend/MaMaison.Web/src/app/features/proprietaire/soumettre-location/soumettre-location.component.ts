import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-soumettre-location',
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './soumettre-location.component.html',
})
export class SoumettreLocationComponent {
  private readonly http = inject(HttpClient);

  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');

  form = {
    titre: '',
    typeBien: 6,
    quartier: '',
    commune: '',
    nombrePieces: 2,
    loyer: null as number | null,
    caution: null as number | null,
    avance: null as number | null,
    fraisAgence: 0,
    nomProprietaire: '',
    telephoneProprietaire: '',
    emailProprietaire: '',
  };

  readonly typesBien = [
    { value: 0, label: 'Studio' }, { value: 1, label: 'F1' }, { value: 2, label: 'F2' },
    { value: 3, label: 'F3' }, { value: 4, label: 'F4' }, { value: 5, label: 'F5' },
    { value: 6, label: 'Appartement' }, { value: 7, label: 'Maison' }, { value: 8, label: 'Villa' },
  ];

  get totalAPrevoir(): number {
    return (this.form.loyer ?? 0) + (this.form.caution ?? 0) + (this.form.avance ?? 0) + (this.form.fraisAgence ?? 0);
  }

  get formValide(): boolean {
    return !!(this.form.titre && this.form.quartier && this.form.commune &&
      this.form.loyer && this.form.caution != null && this.form.avance != null &&
      this.form.nomProprietaire && this.form.telephoneProprietaire);
  }

  soumettre() {
    if (!this.formValide) return;
    this.etat.set('chargement');

    const payload = {
      titre: this.form.titre, typeBien: +this.form.typeBien,
      quartier: this.form.quartier, commune: this.form.commune,
      nombrePieces: +this.form.nombrePieces,
      loyer: this.form.loyer, caution: this.form.caution,
      avance: this.form.avance, fraisAgence: this.form.fraisAgence || 0,
    };

    this.http.post(`${environment.apiUrl}/locations`, payload).subscribe({
      next: () => this.etat.set('succes'),
      error: () => this.etat.set('erreur'),
    });
  }
}
