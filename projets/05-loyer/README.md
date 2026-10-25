# 05-loyer — Mon loyer est-il trop cher ? (encadrement des loyers)

Un locataire saisit son adresse et son bail. L'outil trouve le secteur d'encadrement, calcule le plafond légal (loyer de
référence majoré × surface), dit s'il y a un dépassement (en €/mois, €/an et en trop-perçu récupérable sur 3 ans), et
prépare la lettre de mise en demeure à imprimer en PDF. Tout est calculé dans le navigateur.

## Ce qui marche

- **Saisie** : adresse avec suggestions (Géoplateforme IGN via `@vie-fr/fr-data`), surface, pièces, époque (ou « je ne
  sais pas »), meublé, maison/appartement, loyer hors charges, charges, date de signature, complément de loyer.
  Brouillon enregistré en `localStorage`, export/import JSON, bouton d'effacement.
- **Zone** : point-dans-polygone côté client (`@turf/boolean-point-in-polygon`) pour Paris (80 quartiers), Lyon et
  Villeurbanne (IRIS), Montpellier (5 secteurs), Est Ensemble et Plaine Commune (contours communaux). Pour Lille et
  Bordeaux (cartes non téléchargées) ou une adresse en limite, l'utilisateur choisit son secteur dans une liste.
- **Arrêté applicable** : choisi selon la date de signature (Paris 2023, 2024, 2025 ; Lyon 2023-24, 2024-25, 2025-26 ;
  autres villes : 2023 seulement). Un avertissement s'affiche si la date sort des données.
- **Verdict** : plafond, loyer de référence, loyer de base, écart, conforme ou non, trop-perçu (limité à 3 ans). Source
  et date de vérification affichées sous chaque montant.
- **Complément de loyer** : explication en clair, cases à cocher pour les défauts qui l'interdisent, vérification
  « loyer de base = plafond », date limite de contestation (3 mois).
- **Suite** : lettre → commission départementale de conciliation → juge des contentieux de la protection, amende du
  préfet.
- **Lettre de mise en demeure** préremplie, impression seule en PDF (`@media print`), copie du texte.
- **Hors zone** : estimation du loyer d'annonce de la commune (« Carte des loyers » 2025, par typologie, avec
  fourchette) et avertissement sur son caractère indicatif. Territoires encadrés non couverts (Pays basque,
  Grenoble) signalés.
- **Lien de partage** : adresse sans numéro + saisie + résultat dans le `#fragment` (jamais envoyé au serveur).

## Ce qui ne marche pas / limites

- Paris : le jeu open data s'arrête à l'arrêté du 1er juillet 2025. Pour un bail signé depuis le 1er juillet 2026,
  les valeurs 2025 sont utilisées (avertissement affiché).
- Montpellier, Lille, Bordeaux, Est Ensemble, Plaine Commune : **valeurs 2023** republiées sur data.gouv.fr (statut
  `A_VERIFIER`), donc possiblement dépassées.
- Lille et Bordeaux : pas de géolocalisation du secteur (choix manuel).
- Pays basque, Grenoble-Alpes Métropole : non couverts (aucun jeu de données trouvé).
- Les règles juridiques (`data/regles.json`) sont reformulées sans avoir pu relire Légifrance : `A_VERIFIER`.
- La fin de l'expérimentation (novembre 2026) et sa prolongation éventuelle sont à suivre.
- Pas de test des composants React (seule la logique métier est testée), et pas de test de bout en bout dans un
  navigateur.
- Estimation : l'outil ne remplace ni la démarche officielle ni un conseil juridique.

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm test
```

## Régénérer les données

Node ≥ 22.6 (TypeScript exécuté avec `--experimental-strip-types`, aucune dépendance) :

```bash
npm run import:paris            # opendata.paris.fr — accepte des années : node … scripts/import-paris.ts 2026
npm run import:lyon             # data.grandlyon.com (WFS)
npm run import:montpellier      # data.gouv.fr (republication 2023)
npm run import:lille            # data.gouv.fr (valeurs 2023, sans zonage)
npm run import:bordeaux         # data.gouv.fr (valeurs 2023, sans zonage)
npm run import:est-ensemble     # data.gouv.fr
npm run import:plaine-commune   # data.gouv.fr
npm run import:carte-loyers     # Carte des loyers 2025 (hors zone) + src/donnees/carte-loyers-index.ts
```

Après l'ajout d'un nouvel arrêté, ajouter son chargeur dans `src/donnees/registre.ts` et son id dans
`data/villes.json`.

## Organisation

- `data/encadrement/<ville>/zones.json` (GeoJSON simplifié) et `loyers-<millésime>.json` (loyers €/m² par zone,
  pièces, époque, meublé, éventuellement maison), avec `source`, `verifie_le`, `statut`.
- `data/villes.json` (territoires, dates d'entrée en vigueur, liens officiels), `data/regles.json` (règles et délais),
  `data/carte-loyers/<département>.json` (hors zone).
- `src/lib/` : logique métier testée (référence, verdict, complément, trop-perçu, lettre, partage, hors zone).
- `src/composants/` : interface. `scripts/` : imports. `tests/` : Vitest (58 tests, dont le snapshot « studio meublé
  Paris 11e à 950 € »).
