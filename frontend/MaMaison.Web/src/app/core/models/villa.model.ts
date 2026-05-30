export interface VillaListe {
  id: string;
  titre: string;
  typeVilla: TypeVilla;
  quartier: string;
  ville: string;
  prix: number;
  surfaceHabitable: number;
  nombrePieces: number;
  imagePrincipaleUrl: string | null;
  a3DVisite: boolean;
  scoreMaMaison: number;
}

export interface VillaDetail extends VillaListe {
  promoteurId: string;
  nomPromoteur: string;
  surfaceTerrain: number | null;
  description: string | null;
  modele3DUrl: string | null;
  medias: MediaBien[];
  pointsVisite: PointVisite3D[];
}

export interface MediaBien {
  id: string;
  typeMedia: string;
  url: string;
  ordre: number;
}

export interface PointVisite3D {
  id: string;
  nomPiece: string;
  description: string | null;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  ordre: number;
  hotspots: HotspotVisite[];
}

export interface HotspotVisite {
  id: string;
  libelle: string;
  contenu: string | null;
  positionX: number;
  positionY: number;
  positionZ: number;
}

export interface RechercheVillaParams {
  type?: TypeVilla;
  quartier?: string;
  prixMax?: number;
  promoteurId?: string;
}

export enum TypeVilla {
  Duplex = 0,
  VillaBasse = 1,
  Triplex = 2,
  AppartementNeuf = 3,
  MaisonEnConstruction = 4
}

export const TypeVillaLabels: Record<TypeVilla, string> = {
  [TypeVilla.Duplex]: 'Duplex',
  [TypeVilla.VillaBasse]: 'Villa basse',
  [TypeVilla.Triplex]: 'Triplex',
  [TypeVilla.AppartementNeuf]: 'Appartement neuf',
  [TypeVilla.MaisonEnConstruction]: 'En construction',
};
