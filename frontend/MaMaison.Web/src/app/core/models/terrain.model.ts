export interface TerrainListe {
  id: string;
  titre: string;
  commune: string;
  quartier: string | null;
  surface: number;
  prix: number;
  usage: UsageTerrain;
  niveauVerification: NiveauVerificationTerrain;
  scoreMaMaison: number;
  imagePrincipaleUrl: string | null;
}

export interface TerrainDetail extends TerrainListe {
  localisation: string;
  typeDocument: string | null;
  latitude: number | null;
  longitude: number | null;
  avertissementJuridique: string;
}

export enum UsageTerrain {
  Residentiel = 0,
  Commercial = 1,
  Mixte = 2,
  Agricole = 3
}

export enum NiveauVerificationTerrain {
  Niveau1 = 1,
  Niveau2 = 2,
  Niveau3 = 3,
  Niveau4 = 4,
  Niveau5 = 5
}

export const NiveauVerificationLabels: Record<NiveauVerificationTerrain, string> = {
  [NiveauVerificationTerrain.Niveau1]: 'Vendeur identifié',
  [NiveauVerificationTerrain.Niveau2]: 'Localisation confirmée',
  [NiveauVerificationTerrain.Niveau3]: 'Documents transmis',
  [NiveauVerificationTerrain.Niveau4]: 'Documents analysés',
  [NiveauVerificationTerrain.Niveau5]: 'Vérification premium',
};
