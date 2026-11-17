import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfigService } from '../../core/services/site-config.service';

@Component({
  selector: 'app-diaspora',
  imports: [RouterLink],
  templateUrl: './diaspora.component.html',
})
export class DiasporaComponent {
  readonly siteConfig = inject(SiteConfigService);
  readonly etapes = [
    { num: '01', titre: 'Parcourez à distance', desc: 'Consultez les villas, locations et terrains ainsi que les informations disponibles dans chaque annonce.', icon: '🌍' },
    { num: '02', titre: 'Examinez les informations', desc: 'Comparez les descriptions et demandez les photos ou documents manquants à l\'annonceur.', icon: '▶' },
    { num: '03', titre: 'Comparez les prix', desc: 'Les indicateurs disponibles apportent un point de comparaison entre annonces, sans garantir la valeur du bien.', icon: '📊' },
    { num: '04', titre: 'Préparez vos questions', desc: 'Les informations déclarées ne prouvent pas l\'identité du vendeur ni ses droits sur le bien.', icon: '🔐' },
    { num: '05', titre: 'Demandez un rapport', desc: 'Contactez MaMaison pour connaître la disponibilité, le contenu et le coût éventuel d\'un rapport terrain.', icon: '📋' },
    { num: '06', titre: 'Confirmez les conditions', desc: 'Précisez votre besoin d\'accompagnement et les interlocuteurs souhaités avant tout engagement.', icon: '🏆' },
  ];

  readonly faq = [
    { q: 'Comment préparer un projet depuis l\'étranger ?', r: 'Consultez les annonces puis adressez votre demande à MaMaison pour préciser les démarches et services disponibles.' },
    { q: 'Les annonces sont-elles toutes vérifiées ?', r: 'Non. Une annonce publiée et son indicateur MaMaison ne constituent pas une vérification indépendante. Les informations restent à confirmer.' },
    { q: 'La villa témoin 3D représente-t-elle le bien consulté ?', r: 'Non. Lorsqu\'elle est activée, la villa témoin 3D est une démonstration distincte des biens annoncés.' },
    { q: 'Quels sont les frais ?', r: 'Les frais et conditions éventuels sont à confirmer pour chaque demande avant tout engagement.' },
    { q: 'Comment demander un rapport terrain ?', r: 'Utilisez le formulaire Contact avec le sujet diaspora. Une connexion est nécessaire pour envoyer la demande ; sa réception ne vaut pas confirmation de prestation.' },
  ];
}
