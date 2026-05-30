import { Component, OnInit, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface StatAdmin { label: string; valeur: number | string; icon: string; color: string; }
interface DemandeAdmin { id: string; bienId: string; statut: number; dateCreation: string; commentaire: string | null; }

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, SlicePipe],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  demandes: DemandeAdmin[] = [];
  stats: StatAdmin[] = [];
  loading = true;

  readonly statutLabels: Record<number, string> = {
    0: 'En attente', 1: 'Confirmée', 2: 'Annulée', 3: 'Effectuée'
  };
  readonly statutColors: Record<number, string> = {
    0: '#F59E0B', 1: '#10B981', 2: '#6B7280', 3: '#3B82F6'
  };

  ngOnInit() {
    this.http.get<DemandeAdmin[]>(`${environment.apiUrl}/demandesvisite`).subscribe({
      next: d => {
        this.demandes = d;
        this.stats = [
          { label: 'Demandes totales', valeur: d.length, icon: '📋', color: '#3B82F6' },
          { label: 'En attente', valeur: d.filter(x => x.statut === 0).length, icon: '⏳', color: '#F59E0B' },
          { label: 'Confirmées', valeur: d.filter(x => x.statut === 1).length, icon: '✅', color: '#10B981' },
        ];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  formatDate(s: string) {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
