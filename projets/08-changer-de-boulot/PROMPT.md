# 08 — Et si je change de boulot ? (comparateur de rémunération réelle)

## Problème
Comparer deux offres, ou un CDI avec un statut d'indépendant, se fait au brut annuel alors que ce qui compte est ce qui reste **après** cotisations, impôt, mutuelle, transport, tickets resto, télétravail et temps de trajet.

## Utilisateur cible
Salarié qui a une proposition, ou qui envisage le freelance / la micro-entreprise / le portage.

## Fonctionnalités
1. **Jusqu'à 3 scénarios côte à côte**, chacun avec un statut : salarié non-cadre, salarié cadre, micro-entrepreneur (BNC ou BIC services), EURL/SASU à l'IS (simplifié), portage salarial.
2. **Brut → net** : moteur dans `src/paie/` avec les taux de cotisations salariales 2026 par statut (tranches, CSG/CRDS, retraite complémentaire, prévoyance cadre), 13e mois, variable, participation. Pour la micro-entreprise : abattement forfaitaire, cotisations URSSAF, ACRE, versement libératoire, et la TVA au-dessus des seuils. Pour la SASU : rémunération vs dividendes avec un arbitrage simple.
3. **Net → net après impôt** : calcul de l'IR par tranches pour le foyer (parts, situation), avec la décote et la contribution exceptionnelle, prélèvement à la source estimé. Option : prendre en compte le conjoint.
4. **Coûts de la vie professionnelle** : mutuelle (part salariée), transport (abonnement remboursé 50 %, ou km × barème fiscal), tickets resto (valeur faciale et part employeur), jours de télétravail, frais réels vs 10 %.
5. **Temps** : temps de trajet quotidien converti en heures/an et en « salaire horaire réel » (net après impôt / (heures travaillées + trajet)).
6. **Résultat** : tableau comparatif avec net mensuel, net après impôt, « reste après frais pro », salaire horaire réel, et un graphique simple. Mettre en évidence le point d'indifférence : « l'offre B vaut l'offre A à partir de X € brut ».
7. **Export** PDF et lien de partage des scénarios (sans identité).

## Données
- `data/taux-2026.json` : tous les taux et seuils avec `source` (URSSAF, impots.gouv.fr, service-public.fr) et `verifie_le`. Toute valeur introuvable est marquée `A_VERIFIER`.

## Tests obligatoires
- Brut → net salarié sur 5 salaires de référence (SMIC, 30k, 45k cadre, 70k cadre, 120k cadre) avec tolérance de 2 % par rapport aux simulateurs publics ; noter les écarts dans `JOURNAL.md`.
- IR sur 6 foyers types (célibataire, couple, 1 et 2 enfants, revenus bas et hauts) comparé au simulateur impots.gouv.fr.
- Micro-entreprise : seuils de TVA et de chiffre d'affaires.

## Hors périmètre
Pas de conseil : l'outil affiche des estimations et leurs hypothèses. Pas de gestion des chômage/ARE dans la première version (le noter comme évolution).

## Critère de fin
Un utilisateur compare « CDI cadre 48k à Paris » et « freelance 450 €/jour à 200 jours » et obtient une comparaison honnête, avec les hypothèses visibles, en moins de 5 minutes.
