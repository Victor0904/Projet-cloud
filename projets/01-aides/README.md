# 01-aides — Simulateur d'aides unifié

Un seul formulaire en 4 écrans (foyer, logement, activité, situations particulières) puis une page de résultats : aides probables triées par montant, badge de confiance, explication courte, bouton vers la démarche officielle, total annuel estimé. Tout est calculé dans le navigateur, rien n'est envoyé à un serveur (seul le nom de commune tapé part vers le géocodeur public de l'IGN).

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint + tsc --noEmit
npm test        # vitest : 65 tests
```

## Ce qui marche

- **Formulaire progressif** (`src/composants/Etapes.tsx`) : âge, couple, enfants et âges ; statut locataire/HLM/propriétaire/hébergé, loyer, colocation, commune (recherche via la Géoplateforme IGN, ou choix du département si la recherche échoue) ; activité et revenus nets de chaque adulte, autres revenus ; handicap, grossesse, apprentissage, alternance, revenu fiscal facultatif. Sauvegarde automatique dans `localStorage`.
- **Moteur** (`src/moteur/`) : une règle par aide, fonction pure `(situation) => { eligible, montantEstime, confiance, explication, … }`. 14 règles :
  - Aide au logement APL / ALF / ALS : barème locatif complet (loyer plafond par zone, forfait charges, participation P0 + TF + TL, R0, dégressivité des loyers élevés, minoration de 5 €, CRDS) ;
  - Prime d'activité (bonification individuelle, forfait logement, plancher étudiants/apprentis), RSA (majoration parent isolé, forfait logement) ;
  - Allocations familiales (modulation selon les revenus, majoration pour âge avec la réforme de mars 2026), complément familial (montant de base/majoré), ARS ;
  - Chèque énergie (RFR par unité de consommation), protections énergie qui remplacent le tarif social de l'électricité ;
  - Bourse sur critères sociaux (échelon selon revenus des parents et points de charge), Mobili-Jeune ;
  - AAH (éligibilité seulement, sans montant), complémentaire santé solidaire (gratuite ou avec participation) ;
  - MaPrimeRénov' (catégorie bleu/jaune/violet/rose, barèmes 2026 de l'Anah, Île-de-France à part) ;
  - Plafonnement des frais bancaires (clientèle fragile).
- **Résultats** : total annuel (aides « probables » + « possibles »), cartes triées par montant annuel, badges « probable / possible / à vérifier », sources et dates de vérification sous chaque aide, mention « valeur à vérifier » quand un barème n'a pas pu être confirmé.
- **Questions manquantes inline** : quand une info manque (loyer, taux d'incapacité, revenus des parents, incidents bancaires, RFR…), le champ s'affiche directement dans la carte de l'aide et le résultat se recalcule.
- **Export** : récapitulatif PDF par l'impression du navigateur (avec QR code du lien), lien de partage `#s=…` qui encode la situation (aucun nom, aucune adresse), export/import JSON.
- **Données** : `data/baremes-2026.json` (chaque valeur : `valeur`, `source`, `date_effet`, `verifie_le`, éventuellement `statut: "A_VERIFIER"`), `data/zones-apl.json` (zonage APL par commune). Les deux sont régénérables avec `scripts/generer-donnees.py` (voir l'en-tête du script).
- **Tests** (`tests/`) : 3 cas au moins par aide (éligible franc, non éligible franc, cas limite au seuil), famille témoin de Nancy figée en snapshot, lien de partage, rendu serveur des composants.

## Ce qui ne marche pas / limites connues

- Ce sont des **estimations** : ressources approchées (net imposable déduit du net avec l'hypothèse net = 78 % du brut, revenus N-2 remplacés par les revenus actuels quand le RFR n'est pas saisi).
- Aides non simulées alors qu'elles comptent dans les ressources du RSA : allocation de soutien familial (ASF), PAJE (allocation de base, prime de naissance). Le RSA des parents isolés avec jeune enfant est donc **surestimé**.
- Aide au logement : pas de logement-foyer, meublé, accession, réduction de loyer de solidarité (HLM), abattements chômage/retraite, patrimoine.
- Zonage APL de 2014 : une commune nouvelle créée depuis est classée en zone 3.
- Pas de régimes outre-mer ni Alsace-Moselle (CSS).
- Les liens « Faire la démarche officielle » n'ont pas pu être vérifiés (service-public.fr inaccessible pendant le développement).
- Le simulateur officiel mesdroitssociaux.gouv.fr n'a pas pu être utilisé pour la comparaison ; la comparaison a été faite avec OpenFisca-France (voir `JOURNAL.md`).

## Structure

```
data/            barèmes 2026 et zonage APL (sources + dates)
scripts/         génération des données depuis OpenFisca-France + guide Anah
src/moteur/      règles d'éligibilité (pures, testées)
src/lib/         lien de partage / import JSON (validation)
src/composants/  formulaire, résultats, questions inline, champ commune
tests/           Vitest
```
