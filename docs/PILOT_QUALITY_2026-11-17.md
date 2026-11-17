# MaMaison - audit et correction du pilote

## Cadre

Autorisation : branche dediee, commit/push et pilote uniquement. Aucune fusion de
main, aucune activation sur le domaine principal. Instructions chargees : AGENTS
global du profil et MOP-CODEX-DEPLOY-001 v1.0. Aucun AGENTS local supplementaire.

Base : `201f5f9e97941769d2d431b5cbeee69bf28fb8bd`.
Branche : `fix/pilot-quality-20261117`.
Worktree : `D:/WORKSPACE/2026/_mamaison-pilot-quality`.
Les modifications preexistantes de `D:/WORKSPACE/2026/MaMaison` sont preservees.

## Diagnostic

- P1 : liste des demandes exposee anonymement, identites aleatoires empechant le
  suivi dans le profil, et soumission possible pour un autre demarcheur.
- P1 : fiches non publiees accessibles par URL et confiance excessive dans le
  type MIME/nom de fichier des images envoyees.
- P1 : pilote incoherent, ancien frontend et API plus recente. Les anciennes
  annonces de parite avec le principal n'etaient pas prouvees par les images.
- P2 : visite 3D bloquee par configuration absente, MIME des modules et assets
  manquants. La demonstration doit rester distincte d'une visite du bien reel.
- P2 : menus et profils peu adaptes aux roles, formulaires demandant des
  coordonnees ensuite ignorees, erreurs et retours de connexion peu explicites.
- P2 : presentation generique, statistiques artificielles et numero WhatsApp
  fictif nuisant a la confiance.

## Corrections

Demandes authentifiees et rattachees au compte actif, liste reservee aux admins,
controle proprietaire/admin des soumissions, masquage des biens non publies,
signature d'image et extension serveur fixe. L'intercepteur ne transmet le jeton
qu'a l'API de meme origine. Aucune migration ni seed en environnement Production.

Navigation Acheter/Louer, catalogue alimente par l'API, image d'Abidjan attribuee,
palette blanc/charbon/vert avec accent terre cuite, boutons et titres plus sobres,
menu mobile en dialogue, focus clavier et animations reduites selon preference.
Administration compacte, indicateurs sur deux colonnes mobiles et erreur de
chargement explicite plutot que des statistiques perimees.
Etats chargement/vide/erreur, contact et connexion adaptes aux petits ecrans.

| Profil | Entrees principales | Controle |
| --- | --- | --- |
| Anonyme | Acheter, Louer, terrains actifs, contact, connexion | Pas d'administration ni envoi de demande sans compte |
| Visiteur/locataire/acheteur | Compte, favoris, demandes | Pas d'onglet Mes annonces |
| Proprietaire/promoteur/agent/demarcheur | Publication, annonces, demandes | Guards existants et controle serveur |
| Admin/superadmin | Administration, publication, compte | API admin protegee |
| Verification/support | Role nomme, compte | Outils specialises complets non livres dans ce lot |

Les coordonnees de contact viennent du compte ; le profil se synchronise apres
modification du nom. Les brouillons de contact survivent a une reconnexion.
La candidature apporteur affiche une connexion ou un contact selon le role,
utilise les coordonnees du compte et explique les refus au lieu d'envoyer un
formulaire public vers une API authentifiee. Aucune promesse de delai non etayee.
WhatsApp n'apparait que si un numero valide est configure. La 3D est nommee
villa temoin et respecte le reglage admin existant, sans activation implicite.

## Validation avant activation

- .NET Release : 130 tests passes (100 API, 24 domaine, 6 application).
- Angular : 124 tests passes sous Edge/ChromeHeadless, puis 4 tests cibles pour
  la candidature apporteur. API simulee dans les tests.
- Acces demo : 7 tests Node passes.
- Restore NuGet en mode verrouille ; lockfiles versionnes ; npm ci.
- Audits dependances : aucune alerte runtime .NET/npm connue au controle.
  16 alertes npm moderees restent dans la chaine CLI/developpement, non embarquee
  dans l'image nginx ; aucune haute/critique. Pas de mise a niveau majeure forcee.
- Recette navigateur locale synthetique : accueil desktop/mobile, menu mobile,
  rendu 3D et trajet automatique jusqu'a Terrasse & jardin sans erreur console.
  Ce resultat n'est pas une qualification de telephone physique ou de production.

Le paquet final est construit depuis le commit propre, identifie dans
`release.json`, accompagne de SHA256 et transfere sans recompilation applicative.
Le rapport d'activation separe les preuves distantes de cette preparation.

## Cible et retour arriere

Projet `mamaison`, environnement `pilote`.
Domaine : https://pilote-mamaison.157-180-42-119.sslip.io
Services : `mamaison_pilote_api`, `mamaison_pilote_web`.
Base : `MaMaisonPiloteDb`, aucun changement de schema dans ce lot.
Stockages : uploads, private-verification, site-settings, keys, tous conserves.
L'upstream nginx cible le nom specifique `mamaison_pilote_api:8080`.

`scripts/release/package-pilot.ps1` refuse une source sale.
`deploy-pilot.py` exige les images precedentes attendues, verifie manifeste,
volumes, base, configuration et conteneurs voisins. A lancer sous verrou flock
exclusif du pilote. Les compilations restent locales ; le serveur ne fait que
l'assemblage des images runtime. Activation par identifiants d'image immuables.

Retour arriere applicatif prepare par identifiants des anciennes images et
override compose prive, sans restauration SQL. Pas de migration ni conversion
des mots de passe ; le schema reste compatible. Le rollback n'est pas considere
teste tant qu'il n'a pas ete execute et verifie. Le principal reste inchange.

## Reste a traiter avant generalisation

1. Remplacer le stockage SHA256 historique des mots de passe par un KDF adapte,
   avec transition, sauvegarde et rollback compatibles. Important : ce lot ne
   suffit pas a declarer une securite ou un go-live complet.
2. Integrer le stepper locatif local avec sa migration et une validation isolee
   autorisee. Il n'est volontairement pas melange a cette correction sans schema.
3. Recette authentifiee reelle par chaque role, avec autorisation pour toute
   creation de donnees de test. Pas d'ecriture de recette sur le pilote ici.
4. Pour le premium : photographies des biens reels, verification documentaire
   operationnelle, disponibilites et frais fiables ; ne pas remplacer ces preuves
   par des effets visuels ou des badges non justifies.
5. Pour le photorealisme : geometrie d'un bien reel, materiaux PBR coherents,
   eclairage et performances controles. Les assets restaures reparent le viewer,
   ils ne prouvent ni photorealisme extreme ni fidelite a une annonce.
6. Tests sur vrais telephones modestes et reseau mobile ivoirien, accessibilite
   complete et suivi des parcours de support/verification a completer.
