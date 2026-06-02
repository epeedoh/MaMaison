import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AnalysePrixBien } from '../models/statistiques.model';

@Injectable({ providedIn: 'root' })
export class StatistiquesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/statistiques`;

  analyserBien(villaId: string): Observable<AnalysePrixBien | null> {
    return this.http.get<AnalysePrixBien>(`${this.base}/analyse-bien/${villaId}`)
      .pipe(catchError(() => of(null)));
  }
}
