# Journal — 12-succession

## Session du 25 octobre 2026

### Ce qui a été fait

- Données dans `data/` : `delais.json` (19 délais), `droits.json` (26 montants ou seuils), `organismes.json`
  (36 organismes) et `envois.json` (modes d'envoi). Chaque entrée a `source`, `verifie_le` et `statut`.
- Moteur du plan (`src/plan/`) : profil du questionnaire, 35 règles déclaratives, génération et tri par phase puis
  par échéance.
- Calcul des dates (`src/lib/dates.ts`) : mois de date à date avec fin de mois, départ au 1er du mois, report au jour
  ouvrable suivant (jours fériés de `@vie-fr/fr-data`).
- Droits et estimations (`src/droits/`), 8 modèles de courriers (`src/lettres/`), état local avec
  export/import/fusion JSON (`src/etat/`).
- Interface en 6 onglets (situation, plan, organismes, courriers, droits, partage), impression CSS pour le plan,
  la liste et les courriers.
- 84 tests Vitest, dont les 4 profils exigés et le calcul des délais. `npm run build`, `npm run lint` et `npm test`
  passent.

### Choix pris

- **Une seule page, avec des onglets** plutôt que plusieurs routes : l'état (localStorage) est partagé et le
  déploiement reste statique. Le questionnaire doit être validé avant d'ouvrir les autres onglets.
- **Trois natures de délai, affichées différemment** : « fixé par la loi », « conseillé par l'organisme » et
  « repère conseillé » (proposé par l'outil, par exemple « premier mois »). Les repères de l'outil portent le statut
  `conseil_outil`. Ce ne sont pas des chiffres officiels, et l'interface le dit.
- **Les délais sont donnés au plus tôt.** Pour le capital décès, le conjoint et l'enfant ont le délai prioritaire
  (1 mois), même si l'enfant n'était pas forcément à charge ; le parent a le délai de 2 ans.
- **Proche sans lien familial** : il ne voit que les démarches ouvertes à tous (certificat, déclaration, obsèques,
  remboursement des obsèques, animaux, notaire, Agira). La déclaration de succession reste visible mais marquée
  « à transmettre aux héritiers ».
- **Fusion de deux exports** (frère et sœur) : chaque élément d'inventaire porte un horodatage `majLe`, et la version
  la plus récente gagne. Les démarches faites s'additionnent. Le profil est repris de l'export s'il est plus récent.
- **Obsèques : 14 jours calendaires**, et non 6 jours ouvrables. Un décret de juillet 2024 a changé ce délai (actualité
  service-public A17531, vue via le moteur de recherche).
- **Congés pour décès** : 3 jours (conjoint, parent, frère ou sœur), 12 ou 14 jours (enfant), plus 8 jours de deuil
  pour un enfant de moins de 25 ans, selon la fiche F2278. Certaines sources secondaires donnaient d'anciennes durées
  (5 ou 7 jours) : elles n'ont pas été retenues.
- **PDF** : impression du navigateur (`window.print()` et `@media print`), sans dépendance ajoutée.
- **Composants partagés** : je n'ai rien modifié dans `packages/`. J'ai écrit dans le projet de petits composants qui
  pourraient remonter dans `packages/ui` :
  - `src/components/ui.tsx` : `Bouton`, `Source` (source, date et badge « à confirmer »), `Encart`, `GroupeChoix`
    (radios en fieldset), `OuiNon` et `ZoneTexte`. Ils servent à tout projet qui affiche des données `A_VERIFIER`.
  - `CarteResultat` (dans `packages/ui`) n'accepte qu'une source et n'affiche pas de statut « à vérifier ». Un
    paramètre `statut` serait utile.
- **Tests de rendu** : `vitest.config.mts` active la transformation JSX (le tsconfig garde `jsx: preserve` pour
  Next.js). Les écrans sont rendus avec `react-dom/server`, sans dépendance supplémentaire.
- **Dépendances** : aucune ajoutée.

### Données `A_VERIFIER`

Depuis l'environnement de développement, service-public.fr, ameli.fr, legifrance.gouv.fr et urssaf.fr renvoyaient
une erreur 403 ou une erreur réseau. caf.fr était protégé par un anti-robot et impots.gouv.fr était en maintenance.
Seuls lassuranceretraite.fr et agirc-arrco.fr étaient lisibles. Les valeurs ci-dessous viennent de sources secondaires
concordantes ou d'extraits du moteur de recherche ; elles sont à confirmer sur le site officiel indiqué dans
`source` :

| Fichier | Identifiant | Valeur retenue |
|---|---|---|
| droits.json | capital_deces_forfait | 4 009 € (au 1er avril 2026) |
| droits.json | pass_annuel | 48 060 € (déduit de 9 612 € = 20 % du PASS) |
| droits.json | capital_deces_independant_taux / _retraite_taux | 20 % / 8 % du PASS |
| droits.json | veuvage_montant_max | 719,58 € par mois |
| droits.json | veuvage_plafond_trimestriel | 2 698,42 € |
| droits.json | reversion_plafond_seul / _couple | 25 001,60 € / 40 002,56 € par an |
| droits.json | asf_un_parent / asf_deux_parents | 200,78 € / 267,63 € par mois (avril 2026) |
| droits.json | obseques_prelevement_banque, cloture_compte_sans_notaire | 5 965 € |
| droits.json | frais_bancaires_succession_plafond | 857 € |
| droits.json | succession_dispense_ligne_directe / _autres | 50 000 € / 3 000 € |
| droits.json | conge_* (5 entrées) et conge_enfant_age_seuil | 3, 3, 12, 14, 8 jours ; 25 ans |
| delais.json | declaration_deces | 24 heures |
| delais.json | obseques | 14 jours calendaires |
| delais.json | capital_deces_prioritaire / _autres | 1 mois / 2 ans |
| delais.json | impots_conjoint_60j | 60 jours |
| delais.json | revenus_professionnels_6_mois | 6 mois |
| delais.json | declaration_succession / _etranger | 6 mois / 12 mois, avec report au jour ouvrable |
| delais.json | conge_deuil_enfant | 1 an |
| delais.json | **vehicule** | **1 mois : valeur par défaut, non confirmée même indirectement** |
| delais.json | revenus_defunt | printemps de l'année suivante |
| organismes.json | 34 organismes sur 36 | liens et procédures non testés (sites inaccessibles) |
| envois.json | — | textes génériques, sans tarif |

Valeurs **vérifiées** sur le site officiel le 25 octobre 2026 : réversion de base à 54 % et dès 55 ans
(lassuranceretraite.fr) ; allocation de veuvage avant 55 ans, demande dans les 2 ans à partir du 1er jour du mois du
décès, versement pendant 2 ans (lassuranceretraite.fr) ; réversion Agirc-Arrco à 60 %, dès 55 ans, sans condition de
ressources, demande dans les 12 mois pour un effet au 1er du mois suivant le décès (agirc-arrco.fr).

Les numéros de fiches service-public (F909, F80, F1451, F2278, F34300, F1725…) viennent des résultats du moteur de
recherche. Ils n'ont pas été ouverts.

### Questions ouvertes pour Victor

1. Peut-on vérifier depuis un poste qui a accès à service-public.fr, ameli.fr et caf.fr, puis passer les statuts à
   `verifie` ? Un script de vérification de liens pourrait être partagé entre projets.
2. Le délai de 1 mois pour la carte grise est une valeur par défaut : faut-il plutôt afficher « pas de délai tant
   que le véhicule ne roule pas » ?
3. Faut-il remonter `Source`/`Encart`/`GroupeChoix` dans `packages/ui`, et ajouter un `statut` à `CarteResultat` ?
4. Faut-il gérer les DOM (délais de succession de 6 mois à 2 ans selon le lieu) avec une question dédiée ?
5. Faut-il ajouter `output: "export"` dans `next.config.ts` pour un export statique pur ? La page est déjà
   prérendue statiquement.
6. Le capital décès des fonctionnaires et les régimes spéciaux (MSA, SNCF, RATP…) mériteraient des règles propres :
   est-ce prioritaire ?
