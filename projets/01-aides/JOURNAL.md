# Journal — 01-aides (session du 25/10/2026)

## Ce qui a été fait

1. Récupération des données : la plupart des sites officiels (service-public, caf.fr, Légifrance, ameli, chequeenergie, data.gouv, geo.api) étaient **inaccessibles** depuis l'environnement (403, bot-protection, DNS). Source principale retenue : les **paramètres d'OpenFisca-France** (commit `5cc6563` du 23/10/2026), qui donnent pour chaque valeur le texte officiel (Légifrance, Bulletin officiel social). Chaque valeur de `data/baremes-2026.json` reprend l'URL du texte officiel dans `source`, plus `via` = OpenFisca. Le barème MaPrimeRénov' vient directement du guide Anah « Les aides financières en 2026 » (PDF téléchargé sur anah.gouv.fr).
2. Génération reproductible : `scripts/generer-donnees.py` (lit un clone d'OpenFisca-France, écrit `data/*.json`).
3. Moteur `src/moteur/` : 14 règles pures, une par aide (fichiers `aides/*.ts`), agrégées par `evaluer()` (tri par montant annuel, totaux).
4. Interface : formulaire 4 écrans, page résultats avec badges, sources, questions inline, PDF (impression + QR code), lien de partage, export/import JSON, `localStorage`.
5. Tests : 65 tests Vitest (3 cas par aide minimum, snapshot famille témoin, partage, rendu des composants).

## Choix pris

- **Barème simplifié des APL = barème réel du locatif** (formule CAF complète), car OpenFisca fournit tous les paramètres ; seules les situations rares sont exclues (foyer, accession, meublé, RLS).
- **Revenus** : l'utilisateur donne des revenus nets mensuels. Pour les aides au logement et le RFR estimé, on passe au net imposable (CSG non déductible + CRDS, hypothèse net = 78 % du brut) puis on retire 10 % de frais professionnels. Sans ce correctif, l'APL de la famille témoin était surestimée de 35 €/mois par rapport à OpenFisca.
- **Majoration pour âge des AF** (décret 2026-138) : l'âge passe à 18 ans pour les enfants qui ont eu 14 ans après le 1er mars 2026. Le simulateur applique la majoration aux enfants de 15 ans et plus et la laisse de côté (avec mention) pour ceux de 14 ans.
- **Tarif social de l'électricité** : il n'existe plus depuis 2018 ; la règle « Protections énergie » explique ce qui le remplace (droits liés au chèque énergie) sans montant.
- **AAH, CSS, MaPrimeRénov', frais bancaires, protections énergie** : pas de montant (`montantEstime: null`) ; ils apparaissent dans « Autres droits possibles ». Le total annuel n'additionne que les aides chiffrées « probables » et « possibles ».
- **Confiance** : « probable » = conditions remplies avec les infos données ; « possible » = revenu estimé ou résultat à moins de 8 % d'un seuil, ou petit montant ; « à vérifier » = information manquante (question proposée inline).
- **Famille témoin** (le PROMPT ne précisait pas tout) : salaires 1 500 € + 900 €, enfants de 4 et 8 ans, loyer 750 € hors charges à Nancy (zone 2). Résultat figé : prime d'activité 434,46 €/mois, AF 153,01 €/mois, ARS 429,01 €/an, aide au logement 23,74 €/mois ; total 7 764 €/an.
- **Commune** : géocodage `data.geopf.fr/geocodage/search?type=municipality` appelé directement (la fonction partagée `chercherAdresse` ne permet pas de filtrer sur les communes). Repli : choix du département (zone APL majoritaire du département).

## Composants écrits dans le projet (candidats pour `packages/`)

Rien n'a été modifié dans `packages/`. Utilisés tels quels : `Gabarit`, `BoutonExportPdf` (`@vie-fr/ui`), `encoderEtat`/`decoderEtat`, `qrCodeDataUrl`, `dateLongue` (`@vie-fr/fr-data`). Écrits localement et réutilisables :
- `src/composants/champs.tsx` : `ChampNombre` (valeur `number | null`), `ChampChoix` (boutons radio accessibles), `CaseACocher`, `Bouton`.
- `src/composants/ChampCommune.tsx` : recherche de commune avec repli département → à mettre dans `fr-data` (option `type=municipality`) + `ui`.
- `vitest.config.mts` : transformation JSX pour tester des composants (le `tsconfig` garde `jsx: preserve`).

## Comparaison avec un simulateur de référence

mesdroitssociaux.gouv.fr était **inaccessible** depuis l'environnement (et c'est un formulaire interactif) : la comparaison demandée n'a pas pu être faite. À la place, 4 profils ont été simulés avec **OpenFisca-France 176.1.3** (le moteur de calcul public utilisé par plusieurs simulateurs de l'État), période octobre 2026, mêmes salaires nets :

| Profil | Aide | Ce simulateur | OpenFisca | Écart / cause |
|---|---|---|---|---|
| Famille témoin Nancy (nets 1 522 + 913 €, loyer 750 €) | Aide logement | 13,05 € | 13,05 € | aucun |
| | Prime d'activité | 439,66 € | 452,71 € | −13 € : OpenFisca prend le forfait logement des 3 mois précédents (avant la revalorisation APL d'octobre) |
| | AF | 153,01 € | 153,01 € | aucun |
| | RSA / CF / chèque énergie | 0 | 0 | aucun |
| Seul, 40 ans, sans revenu, Lyon, loyer 450 € | RSA | 573,49 € | 573,49 € | aucun |
| | Aide logement | 308,41 € | 308,41 € | aucun |
| | Chèque énergie | 194 €/an | 0 | OpenFisca exige un RFR N-2 déclaré ; à vérifier |
| Salarié seul, 1 472 € nets, Paris, loyer 550 € | Prime d'activité | 231,86 € | 231,86 € | aucun |
| | Aide logement | 0 | 0 | aucun |
| Mère isolée, 3 enfants (1, 5, 9 ans), sans revenu, HLM Lille | RSA | 1 131,09 € | 609,17 € | ASF (605 €) et PAJE (199 €) non simulées mais comptées dans les ressources par OpenFisca |
| | Aide logement | 471,17 € | 416,98 € | réduction de loyer de solidarité (55,58 €) non simulée |
| | AF | 349,06 € | 349,06 € | aucun |

## Données `A_VERIFIER`

- `css.plafond_base` (10 421 €, 1er avril 2026) : relevé dans un résumé de recherche web citant la fiche DSS ; le PDF officiel n'a pas pu être téléchargé. Ancienne valeur OpenFisca : 10 166 € (2024).
- `css.participation_*` (8 / 14 / 21 / 25 / 30 € par mois) : valeurs 2019 d'OpenFisca sans référence officielle.
- `cheque_energie.baremes` et unités de consommation : barème 2021 d'OpenFisca ; la campagne 2026 n'a pas pu être vérifiée.
- `bourse_superieur.montants_mensuels` et `plafonds_par_echelon` : dernière revalorisation connue rentrée 2023 ; à vérifier pour 2026-2027.
- `mobili_jeune.montant_maximum` (100 €) et `plafond_salaire_pct_smic` (100 % du Smic brut) : site Action Logement inaccessible.
- `frais_bancaires.*` (25 €/mois, offre spécifique 3 €/mois, 20 €/mois) : Légifrance inaccessible, pas d'URL ; le seuil de « faibles ressources » (Smic brut) est une hypothèse du simulateur, il n'existe pas de seuil national.
- `energie_protections.description` : liste des protections non revérifiée.
- `aides_logement.abattement_frais_pro` (10 %) : approximation des ressources retenues par la CAF.
- `prelevements.ratio_net_sur_brut` (0,78) : hypothèse du simulateur.
- `zones-apl.json` : zonage 2014 (OpenFisca), communes nouvelles non couvertes.
- Liens « Faire la démarche » vers service-public.fr (F12006, F2882, F19778, F13213, F13214, F1878, F12242, F10027), messervices.etudiant.gouv.fr, actionlogement.fr, france-renov.gouv.fr, chequeenergie.gouv.fr, mesquestionsdargent.fr : non vérifiés (sites inaccessibles).

## Questions ouvertes pour Victor

1. Faut-il ajouter l'**ASF** et la **PAJE** (allocation de base) ? Sans elles, le RSA des parents isolés est surestimé (voir tableau). Elles demandent 1 ou 2 questions de plus (pension alimentaire reçue, enfant de moins de 3 ans).
2. Pouvez-vous lancer les 3 profils du tableau sur **mesdroitssociaux.gouv.fr** (inaccessible ici) et noter les écarts ?
3. La règle « frais bancaires » s'appuie sur un seuil de ressources inventé (Smic brut) faute de critère national : on la garde, ou on la réduit à une information ?
4. Faut-il traiter les **enfants étudiants** du foyer pour la bourse (aujourd'hui seule la personne qui remplit le formulaire est prise en compte) ?
5. Le total annuel compte les aides « possibles » : préférez-vous n'afficher que les « probables » en gros chiffre ?
6. `ChampCommune` et les champs numériques pourraient rejoindre `packages/ui` et `packages/fr-data` : à décider par le coordinateur.
