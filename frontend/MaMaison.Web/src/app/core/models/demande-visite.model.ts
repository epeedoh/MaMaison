export interface SoumettreDemandeVisiteCommand {
  bienId: string;
  nature?: 'contact' | 'visite' | 'rappel' | '3d';
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
