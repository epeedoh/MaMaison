import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-diaspora',
  imports: [RouterLink],
  templateUrl: './diaspora.component.html',
})
export class DiasporaComponent {
  readonly etapes = [
    { num: '01', titre: 'Parcourez à distance', desc: 'Explorez toutes nos villas, locations et terrains depuis votre pays. Photos, prix, plans, visite 3D immersive.', icon: '🌍' },
    { num: '02', titre: 'Visite virtuelle 3D',  desc: 'Visitez les biens sans vous déplacer grâce à notre viewer 3D. Chaque pièce, chaque détail, comme si vous étiez là.', icon: '▶' },
    { num: '03', titre: 'Comparez les prix',    desc: 'Notre comparateur de prix vous montre si le bien est bien positionné par rapport au marché local. Zéro surprise.', icon: '📊' },
    { num: '04', titre: 'Contactez en sécurité', desc: "MaMaison vérifie les propriétaires et promoteurs. Vous ne parlez qu'à des interlocuteurs identifiés.", icon: '🔐' },
    { num: '05', titre: 'Recevez un rapport',   desc: 'Notre équipe locale visite le bien et vous envoie un rapport photo + vidéo + état des documents.', icon: '📋' },
    { num: '06', titre: 'Investissez sereinement', desc: 'Accompagnement notaire, géomètre, financement. Nous coordonnons tout pendant que vous êtes à l\'étranger.', icon: '🏆' },
  ];

  readonly faq = [
    { q: 'Est-ce que je peux acheter une villa depuis l\'étranger ?', r: 'Oui. Nous travaillons avec des notaires et facilitons la procuration notariée si nécessaire.' },
    { q: 'Comment être sûr que le bien est réel ?', r: 'MaMaison vérifie chaque bien avant publication. Notre score de fiabilité vous indique le niveau de vérification atteint.' },
    { q: 'Quels documents dois-je fournir pour un achat ?', r: "Copie de votre pièce d'identité, justificatif de domicile et source de fonds. Notre équipe vous guide pas à pas." },
    { q: 'Quelle est la commission de MaMaison ?', r: 'Aucune commission pour les acheteurs. MaMaison est rémunéré par les promoteurs et propriétaires vendeurs.' },
    { q: 'Puis-je investir dans un terrain depuis l\'étranger ?', r: 'Oui. Nos terrains sont sélectionnés, documentés et vérifiés. Nous vous recommandons un géomètre et un notaire.' },
  ];
}
