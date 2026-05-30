import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TerrainDetail, TerrainListe, UsageTerrain } from '../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class TerrainService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/terrains`;

  rechercher(commune?: string, usage?: UsageTerrain, surfaceMin?: number, prixMax?: number): Observable<TerrainListe[]> {
    let params = new HttpParams();
    if (commune) params = params.set('commune', commune);
    if (usage != null) params = params.set('usage', usage);
    if (surfaceMin) params = params.set('surfaceMin', surfaceMin);
    if (prixMax) params = params.set('prixMax', prixMax);
    return this.http.get<TerrainListe[]>(this.baseUrl, { params });
  }

  obtenirDetail(id: string): Observable<TerrainDetail> {
    return this.http.get<TerrainDetail>(`${this.baseUrl}/${id}`);
  }
}
