# Journal — 05-loyer

Session du 25/10/2026. Aucun commit (le coordinateur s'en charge).

## Ce qui a été fait

- Scripts d'import (`scripts/import-*.ts`, sans dépendance, Node `--experimental-strip-types`) pour Paris, Lyon,
  Montpellier, Lille, Bordeaux, Est Ensemble, Plaine Commune et la Carte des loyers. Tous ont été exécutés : les
  fichiers de `data/` en sortent.
- Logique métier dans `src/lib/` (référence, choix de l'arrêté selon la date du bail, verdict, complément, trop-perçu
  sur 3 ans, lettre, lien de partage, estimation hors zone, validation de la saisie).
- Interface en une page : formulaire → verdict → complément → suite de la procédure → lettre (PDF par impression) →
  lien de partage. Hors zone : estimation Carte des loyers.
- 58 tests Vitest : point-dans-polygone (3 adresses × 5 villes géolocalisées), 11 combinaisons de loyer de référence
  comparées aux fichiers sources bruts, snapshot du studio meublé Paris 11e à 950 € (20 m², avant 1946, bail du
  01/09/2025 → plafond 854 €, dépassement 96 €/mois), dates, complément, partage, hors zone, saisie.

## Choix pris

- **Dépendance ajoutée** : `@turf/boolean-point-in-polygon` dans le `package.json` du projet. `npm install` a mis à
  jour le `package-lock.json` racine (inévitable avec les workspaces).
- **Aucun composant partagé ajouté** à `packages/` ; utilisation de `Gabarit`, `Champ`, `ChampSelect`,
  `CarteResultat` (`@vie-fr/ui`) et de `chercherAdresse`, `euros`, `dateLongue`, `encoderEtat` (`@vie-fr/fr-data`).
  Écrits dans le projet et potentiellement mutualisables : `ChampAdresse` (autocomplétion accessible),
  `Donnees` (export/import/effacement JSON), le mécanisme « imprimer seulement la lettre » (`data-impression`).
- Valeurs stockées **par zone** (et non par quartier) avec une table secteur → zone par arrêté (`secteurs`) : 450
  lignes pour Paris au lieu de 2 560. Les incohérences éventuelles font échouer l'import.
- **Époque inconnue** : on retient la tranche au plafond le plus haut, pour ne jamais annoncer à tort un dépassement.
- Saisie en 5 tranches d'époque, ramenées à « après 1990 » pour les villes à 4 tranches.
- L'arrêté retenu est celui en vigueur **à la date de signature** ; hors des données, le plus proche avec avertissement.
- Trop-perçu = (dépassement + complément contestable) × mois entiers écoulés depuis la signature, plafonné à 3 ans.
- Lettre : délai de 30 jours laissé au bailleur (usage, pas un délai légal — noté dans `regles.json`).
- Carte des loyers : un fichier par département chargé à la demande (4,5 Mo au total, ~45 Ko par département).
- Le lien de partage contient l'adresse sans numéro, l'id du secteur et la saisie, mais aucun nom.
- Corrections documentées dans les scripts : Bordeaux 2023 (colonne `maison` fausse dans la 2e moitié du fichier,
  reconstruite d'après la position), Plaine Commune 2023 (époque « 1946 » lue comme « avant 1946 », guillemets typographiques).

## Données A_VERIFIER

| Donnée | Pourquoi |
| --- | --- |
| Paris, arrêté au 1er juillet 2026 | absent du jeu opendata.paris.fr (dernier : 2025) ; dates de signature des arrêtés 2023-2025 non relevées |
| Montpellier (valeurs + 5 secteurs) | seule la republication 2023 sur data.gouv.fr était accessible ; arrêté du 9 juin 2026 en vigueur |
| Lille (valeurs 2023, pas de zonage) | data.lillemetropole.fr bloqué (403) ; dates d'application 2023 supposées 01/06/2023–31/05/2024 |
| Bordeaux (valeurs 2023, pas de zonage) | opendata.bordeaux-metropole.fr sans jeu « loyer », geo-ide bloqué ; arrêté du 20/06/2025 existe |
| Est Ensemble, Plaine Commune (valeurs 2023, zonage communal 2022) | referenceloyer.drihl.gouv.fr bloqué ; dates d'application supposées au 1er juin |
| Plaine Commune, zone 317, 1 p., 1971-1990, maison : majoré 23 € pour une référence à 19,9 € | probablement 23,9 € (faute de saisie de la source) |
| `data/villes.json` : dates d'entrée en vigueur, liens officiels (Lille, Lyon, Bordeaux), communes du Pays basque et de Grenoble (listes partielles) | reconstitués, sites officiels inaccessibles |
| `data/regles.json` : toutes les règles (plafond, complément et ses interdictions, délais 3 mois / 3 ans, amendes 5 000 € / 15 000 €, CDC, juge, surface) | Légifrance et service-public.gouv.fr inaccessibles depuis la session ; rédigé de mémoire et via recherches web |
| Fin de l'expérimentation le 23/11/2026 | prolongation de deux ans en discussion au Sénat en octobre 2026 |
| Carte des loyers : inclut-elle les meublés ? | note méthodologique non relue ; l'outil affiche « loyer d'annonce charges comprises, indicatif » |

## Villes manquantes

- **Pays basque** (depuis fin 2024) et **Grenoble-Alpes Métropole** (depuis 2025) : aucun jeu ouvert trouvé ; l'outil
  reconnaît une partie de leurs communes et renvoie vers le site officiel.
- **Lille et Bordeaux** : valeurs présentes mais sans carte des secteurs (choix manuel).

## Questions ouvertes pour Victor

1. Peut-on obtenir un accès réseau à data.lillemetropole.fr, referenceloyer.drihl.gouv.fr, geo-ide et Légifrance
   pour régénérer les zonages Lille/Bordeaux, les valeurs 2024-2026 et relire les règles ?
2. Si l'expérimentation n'est pas prolongée au 23/11/2026, que doit afficher l'outil pour les baux signés après ?
   (Aujourd'hui : un simple avertissement.)
3. Faut-il mutualiser `ChampAdresse` et l'impression de la lettre dans `packages/ui` ?
4. Le délai de 30 jours de la lettre convient-il, ou préfère-t-on 15 jours / 2 mois ?
5. Faut-il ajouter les arrêtés Paris 2019-2022 et Lyon 2021-2023 (disponibles) pour les vieux baux, alors que la
   prescription limite le remboursement à 3 ans ?
