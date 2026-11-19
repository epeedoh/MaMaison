# Pilotage de la mise en service

Branche de qualification : `fix/pilot-quality-20261117`. Cette qualification
ne vaut pas autorisation de fusion ou de mise en service du domaine principal.

## Comptes

L'API verifie les anciens SHA-256 et les mots de passe ASP.NET Core Identity V3
(PBKDF2, sel aleatoire, 210 000 iterations). Une inscription ne produit plus de
SHA-256. Apres une connexion reussie, l'ancien hash est remplace uniquement si
la valeur lue n'a pas change et si le compte reste actif. Aucun traitement en
masse ni changement de mot de passe ne sont requis. Les comptes inactifs ou qui
ne se reconnectent pas ne sont pas convertis. La regle des 15 a 256 caracteres
concerne les nouvelles inscriptions, pas les connexions existantes.

Repli API compatible : `946eaf8c55ab4a0fba3a9438c583200ab9435f95`. Conserver
son image testee et l'ancienne image web. Une fois un nouveau hash enregistre,
ne pas revenir a l'API `02a8400` : elle ne sait pas lire ce format. Ne pas
restaurer des mots de passe ou une base pour annuler une livraison. Le repli
est transitoire : il sait lire les deux formats mais son inscription est ancienne.

## Cycle des locations

- Retrait : publie -> suspendu. Ni rejet du dossier ni suppression de rendez-vous.
- Reexamen : suspendu -> en verification. La fiche reste privee jusqu'a une
  nouvelle validation, avec titulaire identifie et deux justificatifs verifies.
- Rejet : reserve aux dossiers a examiner. Aucun retrait retroactif de donnees.
- Aucune migration de schema pour ces changements. Le parcours aee31201 du
  19 novembre reste une preuve de la version anterieure, pas de la nouvelle UI.

## Limites de la qualification

Le test `scripts/qa/roles-browser.cjs <paquet> <base-synthetique> <publish-repli>`
exerce une API et une vraie base SQL locales, les douze profils dans Chrome,
le retrait/reexamen et la connexion avec le binaire de repli. Le rapport
d'activation doit identifier separement le SHA et les images servis sur le pilote.

Avant un lancement general restent notamment : integration et recette du parcours
de publication multietape present dans l'autre worktree (incluant sa migration),
validation sur telephone physique et reseau local ivoirien, validation des
operations de verification et de support, droits et exactitude des photos des
biens reels. La villa 3D reste une demonstration, pas une reconstruction certifiee.

