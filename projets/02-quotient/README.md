# 02-quotient — Comparateur de coûts selon le quotient familial

Un parent saisit ses revenus et la composition de son foyer, indique ce que ses enfants utilisent (cantine, garderie, centre de loisirs) et obtient le **coût annuel et mensuel** dans sa commune, comparé avec deux autres villes au maximum. Un second module compare **crèche conventionnée CAF** et **assistante maternelle avec CMG**. Tout est calculé dans le navigateur : aucune donnée ne quitte l'appareil.

## Ce qui marche

1. **Quotient familial CAF** : (revenus annuels / 12 + prestations du mois) / parts, avec le détail des parts (2 pour les parents, 0,5 + 0,5 + 1 + 0,5…, AEEH, résidence alternée). Un QF connu peut remplacer le calcul.
2. **Base de 15 communes** (`data/grilles/<code-insee>.json`). Chaque fichier et chaque prestation ont leur `source` et leur `verifie_le`. La qualité des grilles varie selon la ville :

   | Grilles complètes (5/5) | Partielles | Fourchette seulement | Aucune grille trouvée |
   |---|---|---|---|
   | Nancy, Strasbourg, Toulouse, Lille, Dijon | Metz (4/5), Lyon (4/5), Montpellier (4/5 dont 1 fourchette), Paris, Marseille, Bordeaux (cantine seule) | Nantes (cantine, matin, soir), Rennes (cantine) | Grenoble, Reims |

   Les grilles prennent en charge des tranches à tarif fixe, des tarifs selon le nombre d'enfants (Toulouse), des formules « taux d'effort » linéaires ou du second degré (Nancy, Dijon, Montpellier, Bordeaux), des tarifs interpolés (Lyon), des fourchettes (Nantes, Rennes), un plancher et un plafond, les réductions pour fratrie (Metz) et les forfaits qui en couvrent d'autres (Strasbourg).
3. **Coût annuel** : jours par semaine x 36 semaines, forfaits mensuels (10 mois) ou annuels, journées de centre de loisirs, nombre d'enfants. Le détail de chaque ligne affiche le tarif unitaire, le calcul et la source.
4. **Comparaison de 3 communes** : tableau côte à côte. L'écart en euros par an est calculé seulement sur les prestations connues dans toutes les communes choisies, pour ne pas fausser le résultat quand une grille manque.
5. **Crèche et assistante maternelle** : barème PSU 2026 (plancher 814,62 €, plafond 8 500 €, taux d'effort selon le nombre d'enfants), CMG réformé (depuis septembre 2025) et crédit d'impôt de 50 %. Le résultat indique quelle solution coûte le moins cher sur l'année.
6. **Contribution** : formulaire de saisie d'une grille avec validation (ordre, trous, chevauchements). Il recherche le code INSEE par l'API Géo, génère le fichier JSON à télécharger et le texte d'un ticket GitHub.
7. Les saisies sont gardées dans le `localStorage`. On peut les exporter ou les importer en JSON, ou tout effacer. La page s'imprime ou s'enregistre en PDF par l'impression du navigateur.

## Ce qui ne marche pas, ou pas encore

- **Grenoble et Reims** n'ont aucune grille (sites inaccessibles lors de la collecte). Paris, Marseille, Bordeaux et Rennes n'ont que la cantine.
- Pour **Nantes et Rennes**, la ville ne publie qu'un minimum et un maximum : le résultat est une fourchette.
- Pour **Strasbourg, Lyon, Bordeaux et Toulouse**, le tarif ne se base pas sur le QF CAF mais sur un quotient calculé par la ville à partir de l'avis d'imposition. L'outil l'approche par revenu fiscal de référence / 12 / parts fiscales.
- Le **tarif horaire médian des assistantes maternelles par département** n'a pas été trouvé en données ouvertes. La valeur nationale de référence (4,91 €, à vérifier) est utilisée partout et l'utilisateur peut saisir le tarif réel.
- Les paramètres du **CMG 2026** et du **crédit d'impôt** proviennent de sources secondaires et sont marqués `A_VERIFIER`.
- L'outil ne tient pas compte des majorations sans réservation, des tarifs hors commune, des adhésions associatives, des repas PAI ni des indemnités d'entretien.
- La liste complète des points à vérifier se trouve dans `JOURNAL.md`.

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint    # ESLint + tsc --noEmit
npm test        # Vitest : QF, grilles, coûts, PSU/CMG, contribution, rendu
```

## Organisation

- `data/grilles/*.json` : une grille par commune (format décrit dans `src/lib/types.ts`).
- `data/psu.json`, `data/cmg.json`, `data/credit-impot.json`, `data/quotient.json`, `data/parametres.json`, `data/assmat-departements.json` : les barèmes nationaux et les paramètres.
- `src/lib/` : la logique métier (quotient, tarifs, coût annuel, comparaison, crèche/CMG, validation, contribution), sans dépendance à l'interface.
- `src/components/` : l'interface, une section par étape.
- `tests/` : les tests Vitest, dont le cas figé « 2 enfants, QF 900, Nancy vs Metz » (`tests/__snapshots__/`).

## Ajouter une commune

Avec le formulaire « Proposer la grille » (ou à la main), créer `data/grilles/<code-insee>.json`, l'importer dans `src/lib/catalogue.ts`, puis lancer `npm test` : les tests vérifient que chaque fichier est importé, valide, et que chaque valeur de QF tombe dans une seule tranche.
