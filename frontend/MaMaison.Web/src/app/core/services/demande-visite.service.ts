import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DemandeVisiteCreeeDto, SoumettreDemandeVisiteCommand } from '../models/demande-visite.model';

@Injectable({ providedIn: 'root' })
export class DemandeVisiteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/demandesvisite`;

  soumettre(cmd: SoumettreDemandeVisiteCommand): Observable<DemandeVisiteCreeeDto> {
    return this.http.post<DemandeVisiteCreeeDto>(this.url, cmd);
  }
}
