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
      desc: 'Experts en droit immobilier ivoirien, ils sécurisent vos transactions et valident les titres de propriété.',
      services: ['Rédaction d\'actes de vente', 'Vérification des titres (ACD, TF)', 'Procuration pour diaspora', 'Succession immobilière'],
      cta: 'Contacter un notaire'
    },
    {
      icon: '📐', titre: 'Géomètres', couleur: '#065F46',
      desc: 'Professionnels certifiés pour la délimitation et la cartographie des terrains en Côte d\'Ivoire.',
      services: ['Bornage de terrain', 'Plan topographique', 'Morcellement', 'Certificat de superficie'],
      cta: 'Contacter un géomètre'
    },
    {
      icon: '🏦', titre: 'Banques & Financement', couleur: '#7F1D1D',
      desc: 'Nos partenaires financiers proposent des solutions de crédit immobilier adaptées au marché ivoirien.',
      services: ['Crédit immobilier', 'Prêt construction', 'Financement diaspora', 'Assurance emprunteur'],
      cta: 'Simuler un financement'
    },
    {
      icon: '🛡️', titre: 'Assurances', couleur: '#78350F',
      desc: 'Protégez votre investissement avec nos partenaires assureurs spécialisés en immobilier.',
      services: ['Assurance habitation', 'Multirisque propriétaire', 'Garantie loyers impayés', 'Assurance chantier'],
      cta: 'Obtenir un devis'
    },
  ];

  readonly avantages = [
    { icon: '✓', titre: 'Partenaires vérifiés', desc: 'Chaque partenaire est sélectionné pour son sérieux et son expertise.' },
    { icon: '🤝', titre: 'Tarifs négociés', desc: 'En tant que client MaMaison, bénéficiez de conditions préférentielles.' },
    { icon: '⚡', titre: 'Mise en relation rapide', desc: 'Contact sous 24h avec le bon interlocuteur pour votre projet.' },
    { icon: '🔒', titre: 'Accompagnement complet', desc: 'De la recherche du bien jusqu\'à la remise des clés.' },
  ];
}
