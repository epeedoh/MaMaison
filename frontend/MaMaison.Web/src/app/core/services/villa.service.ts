import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VillaDetail, VillaListe, RechercheVillaParams } from '../models/villa.model';

@Injectable({ providedIn: 'root' })
export class VillaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/villas`;

  rechercher(params: RechercheVillaParams = {}): Observable<VillaListe[]> {
    let httpParams = new HttpParams();
    if (params.type != null) httpParams = httpParams.set('type', params.type);
    if (params.quartier) httpParams = httpParams.set('quartier', params.quartier);
    if (params.prixMax) httpParams = httpParams.set('prixMax', params.prixMax);
    if (params.promoteurId) httpParams = httpParams.set('promoteurId', params.promoteurId);
    return this.http.get<VillaListe[]>(this.baseUrl, { params: httpParams });
  }

  obtenirDetail(id: string): Observable<VillaDetail> {
    return this.http.get<VillaDetail>(`${this.baseUrl}/${id}`);
  }
}
