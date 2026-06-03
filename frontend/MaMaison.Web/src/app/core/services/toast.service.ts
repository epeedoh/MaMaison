import { Injectable, signal } from '@angular/core';

export type ToastType = 'succes' | 'erreur' | 'info' | 'avertissement';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  succes(message: string, duree = 3500)       { this.ajouter(message, 'succes', duree); }
  erreur(message: string, duree = 5000)       { this.ajouter(message, 'erreur', duree); }
  info(message: string, duree = 3000)         { this.ajouter(message, 'info', duree); }
  avertissement(message: string, duree = 4000){ this.ajouter(message, 'avertissement', duree); }

  private ajouter(message: string, type: ToastType, duree: number) {
    const id = Date.now().toString();
    this._toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.retirer(id), duree);
  }

  retirer(id: string) {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}
