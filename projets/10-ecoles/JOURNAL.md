# Journal — 10-ecoles

Session du 25/10/2026.

## Ce qui a été fait

1. Exploration du catalogue data.education.gouv.fr (API Opendatasoft v2.1) : identification des jeux
   annuaire, IVAC, IVAL GT/pro, IPS écoles/collèges/lycées, effectifs (écoles, collèges, LGT, LP), offre de
   langues, sections internationales et **carte scolaire nationale des collèges publics** (88 départements).
2. Scripts d'import en TypeScript exécutés par Node (suppression des types native, sans dépendance) :
   `scripts/telecharger.ts` (export JSON filtré par département, réessais) puis `scripts/construire.ts`.
3. Transformations pures dans `src/lib/import/` (testées sur un échantillon figé), jointure par UAI avec
   rapport de perte, regroupement de la carte scolaire par commune → voie → tronçons.
4. Interface : accueil (adresse, carte, filtres, liste, encart secteur), fiche, comparaison + PDF,
   secteur + dérogations + lettre type, sources et méthode.
5. Tests Vitest (45) : nettoyage, annuaire, indicateurs, carte scolaire, jointure (échantillon + données
   réelles), recherche à Nancy dans un rayon de 3 km (géocodage simulé avec une réponse réelle enregistrée),
   secteur, interprétation, comparaison, sélection, lettre.
6. Parcours vérifié dans un navigateur headless (géocodeur simulé) : adresse Nancy → collège de secteur
   Guynemer → 15 collèges à moins de 3 km → 2 lycées comparés → fiche → page secteur ; pas d'erreur
   console, pas de défilement horizontal à 390 px.

## Choix

- **Données dans `public/donnees/<code3>/`** (et non `data/`) : c'est ce qui permet de les charger à la
  demande en déploiement statique. `data/` contient les règles et textes éditoriaux (avec `source` et
  `verifie_le`). Chaque fichier généré embarque ses sources et la date de téléchargement.
- **5 départements** : 54 (test Nancy obligatoire), 57, 75, 69, 31 (sans carte scolaire : démontre le
  message « sectorisation non publiée »).
- **3 dernières sessions** conservées (IVAC 2023-2025, IVAL 2023-2025, IPS 2023-2024 à 2025-2026).
- Les **sous-structures** (SEGPA, sections d'enseignement professionnel) sont retirées de la liste mais leurs
  indicateurs sont reportés sur l'établissement de rattachement (`etablissement_mere`).
- **Aucun tri par résultat** : liste par distance ; chaque taux est affiché avec taux attendu (= taux − VA),
  VA et verdict. Composant `IndicateurVa` unique pour garantir la règle.
- **Composants locaux plutôt que partagés** (je n'ai pas le droit de modifier `packages/`) :
  - `src/components/Cadre.tsx` : variante large (max-w-6xl + navigation) du `Gabarit` de `@vie-fr/ui`
    (trop étroit pour carte + tableau de comparaison). Pourrait devenir une option `large` du gabarit commun.
  - `src/lib/adresse.ts` : client de géocodage qui renvoie aussi **la voie et le numéro** (absents du type
    `Adresse` de `@vie-fr/fr-data`), avec repli sur api-adresse.data.gouv.fr. À remonter dans `fr-data`.
  - `BoutonExportPdf` et `Champ` de `@vie-fr/ui` sont réutilisés tels quels.
- Dépendances ajoutées au `package.json` du projet : `leaflet` et `@types/leaflet` (l'installation a mis à
  jour le `package-lock.json` racine, inévitable avec les workspaces npm). Marqueurs en `circleMarker` pour
  éviter les images d'icônes Leaflet.
- `tsconfig.json` du projet : `allowImportingTsExtensions` pour que les scripts Node puissent importer les
  modules de `src/lib/import/` (Node exige l'extension `.ts`).

## Contrôle de jointure (dernière session, UAI du jeu retrouvés dans l'annuaire)

Perte maximale 4,3 % (IVAL pro, 54 : 22/23) ; IPS écoles 0,4 à 2,9 % (écoles fermées/fusionnées) ; 0 %
pour IVAC, IVAL GT, IPS collèges et lycées dans les 5 départements. Détail sur `/a-propos`.

## Données `A_VERIFIER`

- `data/indicateurs.json` :
  - URLs des notes méthodologiques DEPP sur la valeur ajoutée (education.gouv.fr refusé par le proxy) ;
  - seuil « conforme à l'attendu » : ±3 points de % et ±0,3 point de note sur 20 (choix éditorial) ;
  - écart d'IPS « notable » : 10 points (choix éditorial).
- `data/derogations.json` : `verifie_le` = A_VERIFIER. service-public.gouv.fr et legifrance.gouv.fr
  inaccessibles : le numéro de fiche **F1856** et l'URL de l'article **D211-11** du Code de l'éducation sont à
  confirmer ; ordre des critères recoupé avec des documents d'académies (Grenoble, Strasbourg) et
  L'Étudiant ; calendrier (« printemps du CM2 ») approximatif, variable selon les départements.
- `data/sectorisation.json` : portails open data municipaux (Paris, Lyon, Toulouse… pour les écoles)
  inaccessibles depuis l'environnement — non explorés.

## Questions pour Victor

1. Quels départements importer en priorité ? Un import national ferait de l'ordre de 100 à 150 Mo de JSON
   (≈ 100 départements × 1 à 2 Mo, estimation) : acceptable dans le dépôt ou faut-il générer au déploiement ?
2. Les seuils de verdict (±3 points) te conviennent-ils, ou préfères-tu afficher la VA sans verdict ?
3. Faut-il charger aussi les départements voisins quand l'adresse est proche d'une limite ?
4. Veux-tu que j'intègre la sectorisation des écoles de Paris / Lyon (portails municipaux) dans une
   prochaine session, avec un accès réseau qui le permette ?
5. Remonter `adresse.ts` (voie + numéro) dans `packages/fr-data` et une option « large » dans le `Gabarit`
   de `packages/ui` ?
