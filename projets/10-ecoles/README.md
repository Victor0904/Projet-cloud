# 10-ecoles — Comparateur d'écoles, collèges et lycées

Un parent tape son adresse, voit les écoles / collèges / lycées autour sur une carte, apprend quel est son
**collège public de secteur**, ouvre des fiches lisibles (résultats sur 3 ans **toujours avec la valeur
ajoutée**, IPS, effectifs, options) et compare jusqu'à 4 établissements, avec un export PDF.

## Ce qui marche

- **Recherche par adresse** (Géoplateforme IGN, et en secours l'API Adresse) → carte Leaflet + tuiles OSM,
  rayon de 1 à 20 km, liste triée par **distance** (jamais par palmarès).
- **Filtres** : niveau (école / collège / lycée), public / privé, options (section européenne,
  internationale, sportive, langue moins répandue, SEGPA, ULIS, internat), distance.
- **Mon secteur** (collèges publics) à partir du jeu national « Carte scolaire des collèges publics » :
  commune à secteur unique, voie entière ou tronçon pair/impair. Quand la voie n'est pas reconnue, quand
  plusieurs collèges sont possibles ou quand le département ne publie pas sa carte (ex. Haute-Garonne), un
  message clair renvoie vers la mairie / la DSDEN.
- **Dérogations** (`/secteur`) : principe, qui décide, critères par ordre de priorité avec justificatifs,
  calendrier, recours, cas des écoles et lycées, et **lettre type** remplie dans le navigateur et
  imprimable en PDF.
- **Fiche établissement** (`/etablissement?uai=…`) : contact, lien vers l'annuaire officiel et ONISEP,
  brevet ou bac sur 3 sessions (taux réel, taux attendu, valeur ajoutée, verdict en français simple),
  taux d'accès, IPS comparé au département / à l'académie / à la France, effectifs, options, langues,
  sections internationales. Chaque bloc affiche sa source et sa date de téléchargement.
- **Comparaison** (`/comparer`) : 4 établissements max (sélection gardée en `localStorage`), mises en
  garde automatiques (niveaux différents, publics sociaux très différents, public / privé), export PDF par
  l'impression du navigateur.
- **Sources et méthode** (`/a-propos`) : jeux utilisés, lecture des indicateurs, couverture de la
  sectorisation, contrôle de la jointure par UAI, limites.

Départements importés : **Meurthe-et-Moselle (54), Moselle (57), Paris (75), Rhône (69), Haute-Garonne (31)**
(cette dernière sans carte scolaire publiée, pour montrer le message dédié). Fichiers de 0,3 à 1,4 Mo par
département, chargés à la demande.

## Ce qui ne marche pas / limites

- Seuls 5 départements sont importés ; ajouter un département = une ligne dans `scripts/config.ts`.
- Près d'une limite de département, les établissements du département voisin ne sont pas chargés.
- Sectorisation des **écoles** (mairies) et des **lycées** (Affelnet) : pas de jeu national, non intégrée.
- Horaires des établissements : non publiés en open data (la fiche le dit).
- Rapprochement adresse ↔ carte scolaire par nom de voie normalisé : les indices bis/ter sont ignorés et une
  voie orthographiée très différemment n'est pas reconnue (l'outil le signale).
- Seuils « conforme à l'attendu » (±3 points, ±0,3 point de note) et écart d'IPS notable (10) : choix
  éditoriaux marqués `A_VERIFIER` dans `data/indicateurs.json`.
- Distances à vol d'oiseau.

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm test
```

### Mettre à jour les données

```bash
npm run donnees:telecharger          # tous les départements de scripts/config.ts → scripts/brut/ (ignoré par git)
npm run donnees:telecharger -- 54    # un seul département ; --forcer pour retélécharger, --jeu=annuaire pour un seul jeu
npm run donnees:construire           # nettoyage + jointure → public/donnees/<dep>/*.json et index.json
```

Le téléchargement réessaie automatiquement (jusqu'à 40 fois) en cas de coupure réseau. `construire`
affiche la perte de jointure par jeu ; elle est sous 5 % partout (max 4,3 % : IVAL pro du 54).

## Organisation

```
scripts/config.ts        jeux de données (id, filtres, champs) et départements importés
scripts/telecharger.ts   étape 1 : API data.education.gouv.fr → scripts/brut/
scripts/construire.ts    étape 2 : brut → public/donnees/
src/lib/import/          transformations pures (annuaire, indicateurs, carte scolaire, jointure)
src/lib/                 géo (distance, filtres), géocodage, secteur, interprétation, comparaison, lettre
src/components/, src/app/  interface (Next.js App Router, rendu statique, données chargées côté client)
data/                    règles éditoriales et textes : indicateurs.json, derogations.json, sectorisation.json
tests/                   Vitest ; tests/fixtures/ = échantillon réel figé du 54 + réponse de géocodage
```

Aucune donnée personnelle n'est envoyée ailleurs qu'au géocodeur public (l'adresse saisie) ; la lettre de
dérogation est fabriquée dans le navigateur.
