import { JustificatifsComponent } from '../../../shared/components/justificatifs/justificatifs.component';
import { BienMapComponent } from '../../../shared/components/bien-map/bien-map.component';
import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/auth.model';

@Component({
  selector: 'app-soumettre-location',
  imports: [JustificatifsComponent, BienMapComponent, FormsModule, RouterLink, DecimalPipe],
  templateUrl: './soumettre-location.component.html',
})
export class SoumettreLocationComponent {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);

  etat = signal<'form' | 'chargement' | 'succes' | 'erreur'>('form');

  bienId = '';
  pourMonCompte = false;
  estProprietaire() { return this.auth.user()?.role === Role.Proprietaire; }
  form = {
    latitude: null as number | null,
    longitude: null as number | null,
    titre: '',
    typeBien: 6,
    quartier: '',
    commune: '',
    nombrePieces: 2,
    loyer: null as number | null,
    caution: 0 as number | null,
    avance: 0 as number | null,
    fraisAgence: 0,
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
    return !!(this.form.titre.trim() && this.form.quartier.trim() && this.form.commune.trim() &&
      (this.form.loyer ?? 0) > 0 && this.form.caution != null && this.form.caution >= 0 &&
      this.form.avance != null && this.form.avance >= 0 && this.form.fraisAgence >= 0 &&
      Number.isInteger(this.form.nombrePieces) && this.form.nombrePieces > 0 && this.form.nombrePieces <= 20 &&
      this.auth.estConnecte());
  }

  soumettre() {
    if (!this.formValide || this.etat() === 'chargement') return;
    this.etat.set('chargement');

    const payload = {
      pourMonCompte: this.pourMonCompte,
      latitude: this.form.latitude, longitude: this.form.longitude,
      titre: this.form.titre, typeBien: +this.form.typeBien,
      quartier: this.form.quartier, commune: this.form.commune,
      nombrePieces: +this.form.nombrePieces,
      loyer: this.form.loyer, caution: this.form.caution,
      avance: this.form.avance, fraisAgence: this.form.fraisAgence || 0,
    };

    this.http.post<{ id: string }>(`${environment.apiUrl}/locations`, payload).subscribe({
      next: result => { this.bienId = result.id; this.etat.set('succes'); },
      error: () => this.etat.set('erreur'),
    });
  }

  nouvelleAnnonce() {
    this.pourMonCompte = false;
    this.bienId = '';
    this.form = { latitude: null, longitude: null, titre: '', typeBien: 6,
      quartier: '', commune: '', nombrePieces: 2, loyer: null, caution: 0,
      avance: 0, fraisAgence: 0 };
    this.etat.set('form');
  }
}
