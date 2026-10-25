# Journal — 08-changer-de-boulot

Session du 2026-10-25.

## Ce qui a été fait

1. Récupération des données 2026 : les sites service-public.fr, urssaf.fr, legifrance.gouv.fr et economie.gouv.fr
   n'étaient pas joignables depuis l'environnement, impots.gouv.fr était en maintenance. Le moteur public des
   simulateurs Urssaf (`https://mon-entreprise.urssaf.fr/api/v1/rules` et `/api/v1/evaluate`, sans compte, et le
   paquet npm `modele-social` 11.1.0) était accessible : chaque taux y est lu avec sa référence officielle. Dans
   `data/taux-2026.json`, `source` pointe vers la page officielle citée, `verifie_le` = 2026-10-25.
2. Moteur de calcul pur dans `src/paie/` (salarié, micro, société, portage, impôt, frais, scénario, point
   d'indifférence, partage).
3. Interface : une page, onglets de scénarios, foyer fiscal, tableau, graphique SVG, hypothèses/alertes, sources,
   PDF (impression), lien de partage, JSON, localStorage.
4. Tests Vitest (42) et README.

## Écarts mesurés avec les simulateurs publics

Référence : moteur Urssaf (date de calcul 01/07/2026, mutuelle 40 €/mois à 50 %).

| Cas | Net mensuel calculé | Urssaf | Écart |
| --- | --- | --- | --- |
| SMIC (22 404,20 €) | 1 455,99 € | 1 455,99 € | 0,00 % |
| 30 000 € non-cadre | 1 957,05 € | 1 957,05 € | 0,00 % |
| 45 000 € cadre | 2 940,19 € | 2 940,19 € | 0,00 % |
| 70 000 € cadre | 4 602,08 € | 4 602,08 € | 0,00 % |
| 120 000 € cadre | 7 943,15 € | 7 943,15 € | 0,00 % |

- **Net imposable** : identique pour les non-cadres ; −1,8 % (45 k€), −1,2 % (70 k€), −0,7 % (120 k€) pour les cadres.
  Cause : l'Urssaf réintègre la prévoyance cadre patronale (1,5 % T1) dans le net imposable ; je ne la réintègre pas,
  car l'article 83 du CGI l'exclut dans la limite de 5 % PASS + 2 % du salaire. **Question pour Victor** ci-dessous.
- **IR (8 foyers)** : écart < 1 € avec le moteur Urssaf pour célibataire bas/haut revenu (décote, CEHR), couple sans
  enfant, 1 enfant, 2 enfants hauts revenus (plafonnement QF), parent isolé, couple 2 enfants non imposable, 3 enfants.
  Le simulateur impots.gouv.fr n'a pas pu être utilisé (maintenance) : **à recouper**.
- **SASU** (coût 50 000 €) : brut 35 506 € vs 35 510 € ; net 27 791 € vs 27 795 € (avec AT/MP 2,08 % comme l'Urssaf ;
  l'application utilise 0,64 %, taux « fonctions support », plus réaliste pour un consultant).
- **EURL** (approximation) : −2,5 % à 20 k€, +0,4 % à 50 k€, −0,2 % à 100 k€.
- **Micro BNC 90 000 €** : cotisations 23 220 €, revenu abattu 59 400 €, IR 10 924 € — identiques à l'Urssaf.

## Choix pris

- **Calcul annualisé** (PASS annuel) : pas de régularisation mensuelle ; net mensuel = moyenne sur 12 mois. Le 13e mois
  ne change que l'affichage du montant de la fiche de paie.
- **Impôt réparti au prorata** des revenus imposables du foyer (comme le taux du prélèvement à la source par défaut),
  plutôt qu'en différentiel. Le versement libératoire utilise la règle du taux effectif pour le reste du foyer.
- **Indicateur du point d'indifférence** : « reste après frais pro » annuel ; on fait varier le brut annuel (salarié)
  ou le TJM (indépendant) de l'offre B, tout le reste égal (balayage puis dichotomie).
- **TVA micro** : dès que le CA dépasse le seuil de base, on raisonne en régime de croisière (TVA applicable). Avec des
  clients professionnels, la TVA est neutre ; avec des particuliers, elle est prise sur le prix.
- **Titres-restaurant** : seul l'apport de l'employeur compte comme gain (la part salariée achète des titres de même
  valeur).
- **Voiture** : coût réel estimé au barème kilométrique fiscal ; frais réels plafonnés à 40 km aller.
- **Portage** : frais de trajet à la charge du salarié porté (ou remboursés sur l'enveloppe, ce qui revient au même).
- **Société** : mutuelle individuelle payée personnellement ; frais d'activité payés par la société ; bénéfice non
  distribué non compté dans le revenu.
- **Pas de nouvelle dépendance** : graphique en SVG, PDF par `window.print()`.
- **Composants partagés** : j'ai utilisé `Gabarit`, `Champ`, `ChampSelect`, `CarteResultat`, `BoutonExportPdf` de
  `@vie-fr/ui` et `euros`, `encoderEtat`, `decoderEtat` de `@vie-fr/fr-data`, sans les modifier. Composants écrits
  dans ce projet et qui pourraient remonter dans `packages/ui` : `ChampNombre` (saisie numérique tolérante, mode %),
  `CaseACocher`, `Rubrique` (bloc repliable) — `src/components/champs.tsx`.

## Données marquées A_VERIFIER

Dans `data/taux-2026.json` :

- `micro.tva_franchise_services` (37 500 €), `tva_franchise_services_majore` (41 250 €), `tva_franchise_ventes`
  (85 000 €), `tva_franchise_ventes_majore` (93 500 €) — impots.gouv.fr en maintenance, valeurs non recoupées pour 2026.
- `bareme_kilometrique.voiture` et `majoration_electrique` (+20 %) — barème des revenus 2023/2024, non recoupé pour 2025-2026.
- `avantages.teletravail_allocation_exoneree_mois` (59,40 €/mois, 2,70 €/jour).
- `impot.frais_reels_distance_max_km` (40 km).
- `salarie.csg_crds_epargne_salariale` (9,7 % sur participation / intéressement).
- `general.heures_smic_par_trimestre_retraite` (150 h).
- `societe.tns_*` (approximations EURL calibrées sur le simulateur Urssaf).
- `portage.frais_gestion_defaut` (7 %, hypothèse de marché) et `portage.salaire_minimum_part_pass` (75 % du PASS).

Dans `data/hypotheses-par-defaut.json` : `abonnement_navigo_mensuel` (90,80 €). Les autres entrées sont des
hypothèses de pré-remplissage (statut `HYPOTHESE`).

## Questions ouvertes pour Victor

1. Net imposable des cadres : faut-il s'aligner sur l'Urssaf (réintégrer la prévoyance cadre patronale) ou garder la
   lecture de l'article 83 CGI (écart de 0,7 à 1,8 % sur l'imposable, quelques dizaines d'euros d'impôt) ?
2. Impôt d'un scénario quand il y a un conjoint : prorata (choix actuel) ou différentiel « impôt du foyer avec ce job −
   sans ce job » ? Le différentiel parle mieux à un couple, le prorata colle au prélèvement à la source.
3. Faut-il ajouter les droits au chômage (ARE) et une valorisation de la protection sociale (retraite, congés,
   prévoyance) pour rendre la comparaison CDI / freelance plus juste ? Prévu hors périmètre v1.
4. EURL : faut-il un vrai calcul TNS (cotisations sur assiette, CSG déductible, minimums) plutôt que le taux global ?
5. L'exemple du cahier des charges (450 €/j × 200 j = 90 000 €) dépasse le plafond micro (83 600 €) et la franchise
   de TVA : l'outil l'affiche en alerte et propose la même mission en portage. Faut-il aussi proposer d'office la SASU ?
6. Faut-il appliquer le seuil de mise en recouvrement de l'IR (61 €) ? Non appliqué pour l'instant.

## Évolutions possibles

- Droits au chômage (ARE) et maintien partiel (ARCE) pour une création d'entreprise.
- Option barème progressif sur les dividendes, report de déficit, plusieurs années.
- Réduction générale dégressive unique (RGDU) pour afficher le coût employeur des salariés.
- Comparaison sur plusieurs années (ACRE la 1re année, sortie du régime micro).
