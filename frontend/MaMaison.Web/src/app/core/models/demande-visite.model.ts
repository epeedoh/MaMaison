export interface SoumettreDemandeVisiteCommand {
  bienId: string;
  nom: string;
  telephone: string;
  email?: string;
  dateSouhaitee?: string;
  commentaire?: string;
}

export interface DemandeVisiteCreeeDto {
  id: string;
  message: string;
}
