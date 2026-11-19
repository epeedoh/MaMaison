import { HttpErrorResponse } from '@angular/common/http';

export const catalogueTimeoutMs = 20000;

export function catalogueErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Connexion au catalogue impossible. Vérifiez votre connexion, puis réessayez.';
    if (error.status === 429) return 'Trop de demandes pour le moment. Patientez avant de réessayer.';
    if (error.status === 503 || error.status === 502 || error.status === 504) {
      return 'Le service des annonces ne répond pas pour le moment. Réessayez dans quelques instants.';
    }
  }
  return 'Impossible de charger les annonces. Réessayez dans quelques instants.';
}
