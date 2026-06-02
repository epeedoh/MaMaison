import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);

  setPage(titre: string, description?: string, imageUrl?: string) {
    const fullTitle = `${titre} — MaMaison Verified`;
    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: description ?? 'Plateforme immobilière de confiance en Côte d\'Ivoire. Villas vérifiées, locations, terrains.' });

    // Open Graph
    this.meta.updateTag({ property: 'og:title',       content: fullTitle });
    this.meta.updateTag({ property: 'og:description',  content: description ?? '' });
    this.meta.updateTag({ property: 'og:image',        content: imageUrl ?? '/icons/icon-512x512.png' });
    this.meta.updateTag({ property: 'og:type',         content: 'website' });
    this.meta.updateTag({ property: 'og:site_name',    content: 'MaMaison Verified' });
    this.meta.updateTag({ property: 'og:locale',       content: 'fr_CI' });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title',       content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description ?? '' });
    if (imageUrl) this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  setVilla(titre: string, quartier: string, prix: number, imageUrl?: string) {
    const prixFormate = new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
    this.setPage(
      titre,
      `${titre} à ${quartier} — ${prixFormate}. Bien vérifié MaMaison. Visite 3D disponible.`,
      imageUrl
    );
  }

  setLocation(titre: string, quartier: string, loyer: number) {
    const prixFormate = new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(loyer);
    this.setPage(
      titre,
      `Location vérifiée à ${quartier} — ${prixFormate}/mois. Propriétaire identifié, frais transparents.`
    );
  }
}
