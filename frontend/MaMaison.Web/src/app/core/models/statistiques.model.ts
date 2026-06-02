export interface AnalysePrixBien {
  prixM2Bien: number;
  prixM2Marche: number;
  ecartPourcentage: number;
  badge: 'dans_moyenne' | 'au_dessus' | 'bonne_affaire';
  badgeLabel: string;
  badgeEmoji: string;
}

export interface StatistiquesPrix {
  zone: string;
  prixMoyenM2: number;
  prixMinM2: number;
  prixMaxM2: number;
  nombreBiens: number;
  typeBienLabel: string | null;
}
