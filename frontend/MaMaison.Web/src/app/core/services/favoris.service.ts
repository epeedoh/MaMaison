import { Injectable, signal, computed } from '@angular/core';

export interface FavoriItem {
  id: string;
  titre: string;
  prix: number;
  type: 'villa' | 'location' | 'terrain';
  quartier: string;
  addedAt: string;
}

const STORAGE_KEY = 'mm_favoris';

@Injectable({ providedIn: 'root' })
export class FavorisService {
  private readonly _favoris = signal<FavoriItem[]>(this.charger());

  readonly favoris = this._favoris.asReadonly();
  readonly count   = computed(() => this._favoris().length);

  estFavori(id: string): boolean {
    return this._favoris().some(f => f.id === id);
  }

  toggleFavori(item: FavoriItem) {
    const actuel = this._favoris();
    if (this.estFavori(item.id)) {
      this._favoris.set(actuel.filter(f => f.id !== item.id));
    } else {
      this._favoris.set([...actuel, { ...item, addedAt: new Date().toISOString() }]);
    }
    this.sauvegarder();
  }

  retirerFavori(id: string) {
    this._favoris.set(this._favoris().filter(f => f.id !== id));
    this.sauvegarder();
  }

  viderFavoris() {
    this._favoris.set([]);
    this.sauvegarder();
  }

  private sauvegarder() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._favoris()));
  }

  private charger(): FavoriItem[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
    catch { return []; }
  }
}
