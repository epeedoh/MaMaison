import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LocationDetail, LocationListe, RechercheLocationParams } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/locations`;

  rechercher(params: RechercheLocationParams = {}): Observable<LocationListe[]> {
    let httpParams = new HttpParams();
    if (params.quartier) httpParams = httpParams.set('quartier', params.quartier);
    if (params.commune) httpParams = httpParams.set('commune', params.commune);
    if (params.type != null) httpParams = httpParams.set('type', params.type);
    if (params.loyerMax) httpParams = httpParams.set('loyerMax', params.loyerMax);
    if (params.nombrePiecesMin) httpParams = httpParams.set('nombrePiecesMin', params.nombrePiecesMin);
    return this.http.get<LocationListe[]>(this.baseUrl, { params: httpParams });
  }

  obtenirDetail(id: string): Observable<LocationDetail> {
    return this.http.get<LocationDetail>(`${this.baseUrl}/${id}`);
  }
}
