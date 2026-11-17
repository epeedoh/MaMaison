import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-partenaires',
  imports: [RouterLink],
  templateUrl: './partenaires.component.html',
})
export class PartenairesComponent {
  readonly categories = [
    {
      icon: '⚖️', titre: 'Notaires', couleur: '#1C3461',
      desc: 'Précisez votre besoin de conseil ou de formalités immobilières auprès d\'un notaire.',
      services: ['Rédaction d\'actes de vente', 'Vérification des titres (ACD, TF)', 'Procuration pour diaspora', 'Succession immobilière'],
      cta: 'Contacter un notaire'
    },
    {
      icon: '📐', titre: 'Géomètres', couleur: '#065F46',
      desc: 'Adressez une demande concernant la délimitation ou la cartographie d\'un terrain.',
      services: ['Bornage de terrain', 'Plan topographique', 'Morcellement', 'Certificat de superficie'],
      cta: 'Contacter un géomètre'
    },
    {
      icon: '🏦', titre: 'Banques & Financement', couleur: '#7F1D1D',
      desc: 'Demandez des informations sur les interlocuteurs et les conditions de financement disponibles.',
      services: ['Crédit immobilier', 'Prêt construction', 'Financement diaspora', 'Assurance emprunteur'],
      cta: 'Demander des informations'
    },
    {
      icon: '🛡️', titre: 'Assurances', couleur: '#78350F',
      desc: 'Précisez le bien et le type de couverture recherchée pour une demande d\'information.',
      services: ['Assurance habitation', 'Multirisque propriétaire', 'Garantie loyers impayés', 'Assurance chantier'],
      cta: 'Obtenir un devis'
    },
  ];

  readonly avantages = [
    { icon: '✓', titre: 'Besoin identifié', desc: 'Précisez la spécialité et le service que vous recherchez.' },
    { icon: '🤝', titre: 'Conditions à confirmer', desc: 'Disponibilité et tarifs éventuels restent à confirmer avec le professionnel.' },
    { icon: '⚡', titre: 'Demande centralisée', desc: 'Votre demande est transmise à MaMaison après connexion et confirmation d\'envoi.' },
    { icon: '🔒', titre: 'Vérifications préalables', desc: 'Une mise en relation ne constitue pas une certification du professionnel.' },
  ];
}
