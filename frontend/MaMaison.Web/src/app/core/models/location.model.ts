export interface LocationListe {
  id: string;
  titre: string;
  typeBien: TypeLocationBien;
  quartier: string;
  commune: string;
  nombrePieces: number;
  loyer: number;
  totalAPrevoir: number;
  estDisponible: boolean;
  scoreMaMaison: number;
  imagePrincipaleUrl: string | null;
}

export interface LocationDetail extends LocationListe {
  caution: number;
  avance: number;
  fraisAgence: number;
  fraisVisite: number | null;
  dateConfirmationDisponibilite: string | null;
}

export interface RechercheLocationParams {
  quartier?: string;
  commune?: string;
  type?: TypeLocationBien;
  loyerMax?: number;
  nombrePiecesMin?: number;
}

export enum TypeLocationBien {
  Studio = 0,
  F1 = 1,
  F2 = 2,
  F3 = 3,
  F4 = 4,
  F5 = 5,
  Appartement = 6,
  Maison = 7,
  Villa = 8,
  Chambre = 9
}

export const TypeLocationLabels: Record<TypeLocationBien, string> = {
  [TypeLocationBien.Studio]: 'Studio',
  [TypeLocationBien.F1]: 'F1',
  [TypeLocationBien.F2]: 'F2',
  [TypeLocationBien.F3]: 'F3',
  [TypeLocationBien.F4]: 'F4',
  [TypeLocationBien.F5]: 'F5',
  [TypeLocationBien.Appartement]: 'Appartement',
  [TypeLocationBien.Maison]: 'Maison',
  [TypeLocationBien.Villa]: 'Villa',
  [TypeLocationBien.Chambre]: 'Chambre',
};
