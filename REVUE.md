# Revue — état des 8 projets (25/10/2026)

Revue faite par le coordinateur après la construction en parallèle des 8 applications. Elle s'appuie sur les vérifications rejouées à la racine, les rapports des sous-agents et leurs `JOURNAL.md` ; la logique métier n'a pas été relue en détail.

## Vérification d'intégration

- `npm install` puis `npm ci` à la racine : OK, 0 vulnérabilité. Le `package-lock.json` a été régénéré et commité à part (`socle: lockfile…`). Il intègre `pdfjs-dist` (03), `ical.js` (04), `@turf/boolean-point-in-polygon` (05) et `leaflet` (10).
- Aucun projet n'a modifié `packages/` ni la racine. Tous importent `@vie-fr/ui` et/ou `@vie-fr/fr-data` sans erreur.
- `packages/fr-data` : 8 tests OK ; `packages/ui` et `packages/fr-data` : `tsc` OK.
- Aucune correction d'intégration n'a été nécessaire au-delà du lockfile.

| Projet | build | lint | test |
|---|---|---|---|
| 01-aides | ✅ | ✅ | ✅ 65 |
| 02-quotient | ✅ | ✅ | ✅ 161 |
| 03-decodeur-courrier | ✅ | ✅ | ✅ 117 |
| 04-mes-delais | ✅ | ✅ | ✅ 122 |
| 05-loyer | ✅ | ✅ | ✅ 58 |
| 08-changer-de-boulot | ✅ | ✅ | ✅ 42 |
| 10-ecoles | ✅ | ✅ | ✅ 45 |
| 12-succession | ✅ | ✅ | ✅ 84 |

## Constat transversal

- **Sources officielles inaccessibles.** Depuis l'environnement cloud, Légifrance, service-public, ameli, urssaf.fr et caf.fr étaient bloqués (403, anti-robot ou DNS), et impots.gouv.fr était en maintenance. Une grande partie des valeurs vient donc de sources secondaires ou du moteur de recherche. Elles sont marquées `A_VERIFIER` (ou « recoupé ») : entre 13 et 79 occurrences par projet. **Une passe de vérification depuis un poste normal est la priorité n° 1 de tout le dépôt.**
- **Tests dans un vrai navigateur.** Seuls 04 et 10 ont été parcourus dans un Chromium headless. Pour 01, 02, 03, 05, 08 et 12, l'interface n'est vérifiée que par un rendu serveur ou pas du tout.
- **Composants réécrits dans plusieurs projets** (candidats pour `packages/`) :
  - `telecharger()` et un `localStorage` protégé : dans 02, 03 et 04 ;
  - `ChampNombre`, `CaseACocher` et les radios accessibles : dans 01, 02, 08 et 12 ;
  - `Source` (source, date et badge de statut) : dans 02, 03 et 12. Il faudrait ajouter à `CarteResultat` un paramètre `statut` et le formatage de `verifieLe` : aujourd'hui, une date ISO passée telle quelle s'affiche brute (remarque de 02) ;
  - recherche de commune ou d'adresse avec voie et numéro (`ChampCommune` dans 01, `ChampAdresse` dans 05, `adresse.ts` dans 10) : il faut étendre `fr-data` (option `type=municipality`, champs voie et numéro) ;
  - une option « large » pour `Gabarit` (10) et l'impression de la lettre seule (03 et 05) ;
  - le `vitest.config.mts` qui active le JSX pour les tests de composants, recopié dans 4 projets : il pourrait aller dans un preset racine.

---

## 01-aides

- **État :** build ✅, lint ✅, test ✅ (65). Il y a 14 règles d'aides, la famille témoin de Nancy est figée à 7 764 €/an, et la comparaison avec OpenFisca tombe au centime sur la plupart des aides.
- **Manquant ou `A_VERIFIER` :**
  - La comparaison avec mesdroitssociaux n'a pas été faite (site inaccessible).
  - L'ASF et la PAJE ne sont pas simulées, donc le RSA des parents isolés est surestimé : 1 131 € au lieu de 609 €. La réduction de loyer de solidarité (RLS) ne l'est pas non plus.
  - Valeurs à vérifier : plafond CSS 2026 et participations, barème du chèque énergie (2021), bourses (2023), Mobili-Jeune, frais bancaires (seuil inventé), ratio net/brut de 0,78, zonage APL de 2014. Les liens « Faire la démarche » n'ont pas été vérifiés.
- **Aurait voulu partager :** `ChampCommune`, ainsi que `ChampNombre`, `ChampChoix`, `CaseACocher` et `Bouton`.
- **3 corrections prioritaires :**
  1. Simuler l'ASF et la PAJE, ou au minimum bloquer ou avertir le RSA des parents isolés : l'erreur actuelle dépasse 500 €/mois.
  2. Vérifier le plafond CSS 2026 et le barème du chèque énergie 2026 sur les textes officiels.
  3. Faire la comparaison avec mesdroitssociaux sur les 4 profils du JOURNAL, puis trancher la règle « frais bancaires », dont le seuil est inventé.

## 02-quotient

- **État :** build ✅, lint ✅, test ✅ (161). Le QF, les grilles de 15 communes, la comparaison, la crèche PSU, le CMG et le formulaire de contribution fonctionnent.
- **Manquant ou `A_VERIFIER` :**
  - Grenoble et Reims n'ont aucune grille. La grille est partielle pour Paris, Marseille, Bordeaux, Lyon, Metz et Montpellier, et Nantes et Rennes n'ont qu'une fourchette.
  - Les paramètres CMG 2026 (4,91 € et 8,09 €) viennent de sources non officielles. Il n'y a pas de tarif départemental d'assistante maternelle. Le crédit d'impôt et les 36 semaines scolaires sont aussi à vérifier.
  - L'interface n'a pas été testée dans un navigateur.
- **Aurait voulu partager :** `ChampNombre`, `Section`, `Source`, `Alerte`, `montant()`, `dateFr()` et `telecharger()`.
- **3 corrections prioritaires :**
  1. Confirmer les paramètres CMG 2026 sur caf.fr ou pajemploi : ils entrent dans chaque comparaison crèche / assistante maternelle.
  2. Compléter à la main les grilles de Grenoble, Reims et Paris à partir des PDF officiels.
  3. Faire un passage dans un vrai navigateur (mobile 390 px, clavier) sur le parcours en 5 étapes.

## 03-decodeur-courrier

- **État :** build ✅, lint ✅, test ✅ (117). Le projet compte 33 types de courrier, 23 lettres, la lecture de PDF dans le navigateur, le calcul de délai pas à pas et un glossaire. Le critère de fin (indu CAF) est couvert par un test.
- **Manquant ou `A_VERIFIER` :**
  - Pas d'OCR ni de dictée : la dictée a été écartée volontairement, car l'audio partirait chez Google.
  - Le classifieur obtient 33/33 sur un corpus écrit en même temps que les règles, donc sa précision réelle est inconnue.
  - Délais `A_VERIFIER` : pièces CAF, remise de dette, majorations URSSAF, sanction France Travail, saisie-vente, congés du bailleur, clôture de compte, loi Chatel. Les liens Légifrance sont des liens de recherche.
  - L'interface n'a pas été testée dans un navigateur.
- **Aurait voulu partager :** `Source` avec statut, `TexteSurligne`, ainsi que les helpers `stockage` et `pdf`.
- **3 corrections prioritaires :**
  1. Faire relire les délais et les 23 modèles de lettres par un juriste ou un point-justice : un mauvais délai de recours est le pire bug possible ici.
  2. Construire un corpus de test avec de vrais courriers anonymisés, écrit par quelqu'un d'autre que l'auteur des règles, pour mesurer la précision réelle.
  3. Remplacer les liens de recherche Légifrance par les identifiants exacts des articles.

## 04-mes-delais

- **État :** build ✅, lint ✅, test ✅ (122). Le projet compte 41 types d'échéances, un tableau de bord, un export `.ics` avec alertes (relu par `ical.js`), le mode foyer, un lien de rappel avec QR code et l'export JSON. Il a été parcouru dans un Chromium headless.
- **Manquant ou `A_VERIFIER` :**
  - Valeurs à vérifier : pneus hiver, titre de séjour (fenêtre de 120/60 j), dates de la taxe foncière 2026, diagnostic gaz, rappels DTP, dépistages, visite médicale du travail, déclaration trimestrielle. Les fiches service-public citées n'ont pas été ouvertes.
  - Les notifications ne partent que si la page est ouverte, et Google Agenda ignore les alertes du `.ics`.
- **Aurait voulu partager :** `ui.tsx` (boutons, badges, onglets, encadré) et `telecharger()`.
- **3 corrections prioritaires :**
  1. Relire les fiches service-public des 41 types, puis passer les statuts en « vérifié ».
  2. Décider du passage du lien de rappel de `?data=` à `#data=` : le fragment n'est pas envoyé à l'hébergeur, ce qui va dans le sens de la règle de confidentialité.
  3. Revoir la règle « CT sans date = en retard », prudente mais anxiogène, au minimum avec un message plus explicite.

## 05-loyer

- **État :** build ✅, lint ✅, test ✅ (58).
  - Le secteur est trouvé par point-dans-polygone pour Paris, Lyon-Villeurbanne, Montpellier, Est Ensemble et Plaine Commune.
  - L'outil donne le verdict, le trop-perçu sur 3 ans et la lettre de mise en demeure, avec une estimation Carte des loyers hors zone.
  - Le snapshot « Paris 11e, 950 € » donne un plafond de 854 €.
- **Manquant ou `A_VERIFIER` :**
  - Lille et Bordeaux n'ont pas de carte des secteurs (choix dans une liste).
  - Montpellier, Lille, Bordeaux, Est Ensemble et Plaine Commune utilisent des valeurs 2023.
  - Pays basque et Grenoble ne sont pas couverts, et l'arrêté de Paris de juillet 2026 manque.
  - Toutes les règles juridiques de `regles.json` sont `A_VERIFIER`, et l'expérimentation finit le 23/11/2026.
  - Les composants ne sont pas testés et l'interface n'a pas été testée dans un navigateur.
  - `data/` pèse 5,6 Mo, ce qui reste acceptable.
- **Aurait voulu partager :** `ChampAdresse`, `Donnees` (export / import) et l'impression de la lettre seule.
- **3 corrections prioritaires :**
  1. Mettre à jour les valeurs 2024-2026 de Montpellier, Lille, Bordeaux et de la Seine-Saint-Denis : avec des plafonds de 2023, l'outil peut annoncer un dépassement à tort.
  2. Relire `regles.json` sur Légifrance et suivre la prolongation de l'expérimentation au-delà du 23/11/2026 : c'est urgent, l'échéance tombe dans un mois.
  3. Importer le zonage de Lille et de Bordeaux.

## 08-changer-de-boulot

- **État :** build ✅, lint ✅, test ✅ (42).
  - Le projet compare jusqu'à 3 scénarios : salarié, micro, SASU, EURL ou portage.
  - Le net est identique à l'Urssaf (0,00 % d'écart sur 5 salaires de référence) et l'impôt sur le revenu à moins de 1 € près sur 8 foyers.
  - Il calcule le point d'indifférence.
- **Manquant ou `A_VERIFIER` :**
  - Il n'y a ni chômage (ARE) ni valorisation de la retraite.
  - L'EURL n'est qu'approchée par un taux global.
  - Valeurs à vérifier : seuils de franchise de TVA, barème kilométrique, allocation télétravail, frais et minimum du portage. L'impôt n'a pas été recoupé sur impots.gouv.fr.
  - Le net imposable des cadres s'écarte de 0,7 à 1,8 % de l'Urssaf (traitement de la prévoyance).
  - L'interface n'a pas été testée dans un navigateur.
- **Aurait voulu partager :** `ChampNombre` (avec un mode %), `CaseACocher` et `Rubrique`.
- **3 corrections prioritaires :**
  1. Trancher le traitement de la prévoyance cadre dans le net imposable : s'aligner sur l'Urssaf, ou garder la lecture de l'article 83 du CGI et la documenter.
  2. Vérifier les seuils de franchise de TVA 2026 : ils déclenchent l'alerte de l'exemple du cahier des charges.
  3. Remplacer l'approximation de l'EURL par un vrai calcul TNS, ou l'afficher clairement comme une estimation grossière.

## 10-ecoles

- **État :** build ✅, lint ✅, test ✅ (45).
  - L'outil propose une carte Leaflet, des filtres, et pour chaque taux sa valeur ajoutée et une explication en clair, sans aucun classement.
  - Il donne le collège de secteur grâce à la carte scolaire nationale, permet de comparer 4 établissements, génère une lettre de dérogation, et a été parcouru dans un navigateur headless.
- **Manquant ou `A_VERIFIER` :**
  - Seuls 5 départements sont chargés (54, 57, 75, 69, 31), soit 7,7 Mo dans `public/donnees`.
  - Il n'y a pas de sectorisation des écoles et des lycées, ni d'horaires, et les limites de département ne sont pas gérées.
  - Les seuils de verdict (±3 points, écart d'IPS de 10) sont un choix éditorial.
  - Valeurs à vérifier : URLs de la DEPP, fiche F1856, article D211-11.
  - Les données brutes (29 Mo) sont exclues par `.gitignore` et se régénèrent avec les scripts.
- **Aurait voulu partager :** `Cadre` (une option « large » pour `Gabarit`) et `adresse.ts` (voie et numéro) dans `fr-data`.
- **3 corrections prioritaires :**
  1. Choisir la stratégie pour la couverture nationale : environ 100 à 150 Mo dans le dépôt, ou une génération au déploiement. C'est une décision d'architecture à prendre avant d'ajouter des départements.
  2. Faire valider les seuils de verdict, ou n'afficher que la valeur ajoutée, pour éviter un classement implicite.
  3. Gérer les adresses proches d'une limite de département en chargeant les départements voisins.

## 12-succession

- **État :** build ✅, lint ✅, test ✅ (84). L'outil construit un plan daté de 35 règles en 4 phases, suit 36 organismes, propose 8 courriers, un estimateur de réversion et de veuvage, et la fusion des exports JSON entre proches. Les 4 profils exigés sont testés.
- **Manquant ou `A_VERIFIER` :**
  - La plupart des montants et délais sont `A_VERIFIER` : capital décès, ASF, plafonds de réversion, dispenses de succession, congés, délais de déclaration. Seules les règles de lassuranceretraite.fr et agirc-arrco.fr sont vérifiées.
  - Le délai d'un mois pour la carte grise est une valeur par défaut trouvée nulle part.
  - Les délais outre-mer ne sont pas gérés, les liens des organismes n'ont pas été testés et l'interface n'a pas été testée dans un navigateur.
- **Aurait voulu partager :** `Source`, `Encart`, `GroupeChoix`, `OuiNon` et `ZoneTexte`, ainsi qu'un paramètre `statut` pour `CarteResultat`.
- **3 corrections prioritaires :**
  1. Vérifier sur service-public et ameli les délais légaux affichés comme « fixés par la loi » (obsèques en 14 jours, déclaration de succession en 6 mois, capital décès) : un public en deuil n'a pas le droit à l'erreur.
  2. Remplacer le délai fictif d'un mois pour la carte grise par « pas de délai légal » ou par une source.
  3. Tester les liens des 36 organismes.

---

## Prochaines étapes suggérées pour le dépôt

1. Une session « vérification des sources » depuis un réseau qui accède à Légifrance et service-public, avec un script commun qui liste les `A_VERIFIER` de chaque `data/`.
2. Une session « socle v2 » qui remonte dans `packages/` `telecharger`, `ChampNombre`, `Source`, `CarteResultat` avec `statut`, la recherche de commune ou d'adresse, `Gabarit` en version large et un preset Vitest avec JSX.
3. Un passage dans un vrai navigateur sur le « Critère de fin » de chaque `PROMPT.md` (session « Revue croisée » de `LANCEMENT.md`).
