export interface LoginCommand {
  telephone: string;
  motDePasse: string;
}

export interface RegisterCommand {
  nom: string;
  telephone: string;
  motDePasse: string;
  email?: string;
  role?: number;
}

export interface AuthResult {
  token: string;
  expiration: string;
  nom: string;
  telephone: string;
  role: number;
  utilisateurId: string;
}

export enum Role {
  Visiteur = 0,
  Acheteur = 1,
  Locataire = 2,
  Proprietaire = 3,
  Promoteur = 4,
  Demarcheur = 5,
  AgentImmobilier = 6,
  VerificateurTerrain = 7,
  Admin = 8,
  SuperAdmin = 9,
  Support = 10,
  Partenaire = 11
}

export const RoleLabels: Record<number, string> = {
  0: 'Visiteur', 1: 'Acheteur', 2: 'Locataire', 3: 'Propriétaire',
  4: 'Promoteur', 5: 'Démarcheur', 8: 'Admin', 9: 'Super Admin',
};
