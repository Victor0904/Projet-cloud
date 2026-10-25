# 08-changer-de-boulot — Et si je change de boulot ?

Comparateur de rémunération **réelle** : jusqu'à 3 scénarios côte à côte (CDI, micro-entreprise, société à l'IS,
portage salarial), comparés sur ce qui reste après cotisations, impôt sur le revenu, frais professionnels, et sur le
salaire horaire réel trajet compris. Tout est calculé dans le navigateur ; aucune donnée n'est envoyée.

**État : fonctionnel (version 1).** Build, lint et tests (42 tests Vitest) passent.

## Ce qui marche

- **Statuts** : salarié non-cadre, salarié cadre, micro-entrepreneur BNC ou BIC services, société à l'IS (SASU ; EURL en
  approximation), portage salarial.
- **Brut → net** (`src/paie/salarie.ts`) : cotisations salariales 2026 par tranches (vieillesse, Agirc-Arrco T1/T2,
  CEG, CET, APEC), CSG/CRDS sur 98,25 %, mutuelle (part salariale déduite, part patronale réintégrée), prévoyance cadre,
  13e mois (affichage de la fiche de paie), variable, participation/intéressement (PEE ou non). Cotisations
  patronales pour le portage et la SASU, et inversion coût employeur → brut.
- **Micro-entreprise** (`src/paie/micro.ts`) : cotisations 2026 (25,6 % BNC, 21,2 % BIC services + formation pro),
  ACRE, abattement forfaitaire (34 % / 50 %, minimum 305 €), versement libératoire (avec taux effectif pour le reste du
  foyer), alertes de dépassement du plafond micro et des seuils de franchise de TVA, TVA prise sur la marge si les
  clients sont des particuliers.
- **Société** (`src/paie/societe.ts`) : IS 15 % / 25 %, dividendes au prélèvement forfaitaire unique (12,8 % + 18,6 %
  de prélèvements sociaux 2026), arbitrage automatique rémunération/dividendes (pas de 1 %) qui maximise le net après
  impôt du foyer, ou répartition manuelle.
- **Portage** (`src/paie/portage.ts`) : CA → frais de gestion → frais remboursés → enveloppe = coût employeur → brut →
  net (cadre, avec chômage).
- **Impôt sur le revenu** (`src/paie/impot.ts`) : parts (couple, enfants, parent isolé), barème LF 2026, plafonnement
  du quotient familial, décote, CEHR, abattement 10 % ou frais réels (choix automatique), conjoint et autres revenus,
  impôt réparti au prorata, taux de prélèvement à la source estimé et taux neutre.
- **Frais pro** (`src/paie/frais.ts`) : transports en commun (remboursement employeur), voiture au barème kilométrique
  (distance plafonnée à 40 km pour les frais réels), titres-restaurant, indemnité de télétravail, jours de télétravail
  qui réduisent les trajets.
- **Temps** : heures travaillées + heures de trajet, salaire horaire réel (net après impôt / heures totales) et reste
  horaire après frais.
- **Résultat** : tableau comparatif (meilleur scénario signalé par ligne), graphique SVG, carte « ce qui vous reste le
  plus », **point d'indifférence** (« l'offre B vaut l'offre A à partir de X € brut / d'un TJM de X € »), hypothèses et
  alertes par scénario, détail des cotisations, liste de toutes les sources avec date de vérification.
- **Export** : PDF via l'impression du navigateur (formulaires masqués), lien de partage dans le fragment `#e=…`
  (situation du foyer exclue par défaut), export/import JSON, sauvegarde automatique en `localStorage`.
- Exemple pré-rempli : « CDI cadre 48 k€ à Paris » vs « freelance 450 €/j × 200 j » (micro) vs la même mission en
  portage.

## Ce qui ne marche pas / limites connues

- Pas d'assurance chômage (ARE), ni de valorisation des droits retraite/prévoyance (évolution prévue).
- EURL : cotisations TNS approchées par un taux global (≈ 31 %) calibré sur le simulateur Urssaf — à ne pas utiliser
  pour une décision fine.
- Pas de réduction générale de cotisations patronales (RGDU) : le coût employeur n'est calculé que pour le portage et la
  SASU, où elle s'applique rarement.
- Pas d'heures supplémentaires, ni d'Alsace-Moselle, ni d'outre-mer, ni de crédits/réductions d'impôt, ni de CDHR.
- Barème IR : celui de la loi de finances pour 2026 (revenus 2025), appliqué aux revenus 2026.
- ACRE appliquée à toute l'année ; seuils TVA en « régime de croisière » (pas de calcul en cours d'année).
- Plusieurs valeurs sont marquées `A_VERIFIER` dans `data/taux-2026.json` (seuils de TVA, barème kilométrique,
  frais de portage…) : voir `JOURNAL.md`.

## Données

- `data/taux-2026.json` : tous les taux et seuils, chacun avec `source`, `verifie_le` et `statut`
  (`VERIFIE` / `A_VERIFIER`).
- `data/hypotheses-par-defaut.json` : valeurs de pré-remplissage des formulaires (mutuelle, jours, TJM…).
- `tests/references-urssaf.json` : valeurs de référence relevées le 2026-10-25 dans le moteur officiel
  mon-entreprise.urssaf.fr.

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint + tsc --noEmit
npm test        # vitest
```

## Organisation

```
src/paie/        moteur de calcul pur (testé) : taux, salarie, micro, societe, portage, impot, frais, scenario,
                 indifference, partage
src/components/  interface (Comparateur, formulaires, tableau, graphique, détails et sources)
tests/           tests Vitest + valeurs de référence
```
