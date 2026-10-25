# 12-succession — Après un décès : l'assistant des démarches

Un proche qui prend en charge les démarches après un décès répond à une douzaine de questions. Il obtient alors une
liste ordonnée de ce qu'il doit faire, avec les dates limites calculées depuis la date du décès, les organismes à
prévenir, les courriers préremplis et un fichier à partager avec ses frères et sœurs. Tout reste dans le navigateur.

## Ce qui marche

- **Questionnaire d'entrée** : date du décès, lien avec le défunt, situation de couple, enfants (et enfants à charge),
  logement, activité, testament, assurance-vie, véhicule, animaux, entreprise, décès hors métropole, proche salarié,
  âge du conjoint (facultatif).
- **Plan personnalisé** (`src/plan/`) : 35 règles, chacune avec un titre, le pourquoi en langage clair, qui contacter
  (avec un lien), les pièces à fournir, un délai daté et un courrier quand il y en a un. Les règles sont classées en
  4 phases (premiers jours, premier mois, six premiers mois, après), puis par échéance. Chaque délai indique s'il est
  fixé par la loi, conseillé par l'organisme ou seulement repère de l'outil, avec sa source. On peut cocher une
  démarche comme faite (la date est enregistrée). L'encart « À faire en priorité » montre les 3 prochaines échéances.
  Un proche sans lien familial ne voit que ce qui le concerne, et ce qui revient aux héritiers est signalé comme tel.
- **Calcul des délais** (`src/lib/dates.ts`) : heures, jours, mois de date à date (31 août + 6 mois = 28 février),
  années, départ au 1er jour du mois (allocation de veuvage), report au jour ouvrable suivant (succession : dimanches
  et jours fériés via `@vie-fr/fr-data`).
- **Catalogue de 36 organismes** (`data/organismes.json`) : mairie, pompes funèbres, employeur, France Travail, CPAM,
  MSA, retraites de base et complémentaire, info-retraite, CAF, impôts, banque, Ficoba, assureurs, mutuelle,
  assurance-vie, Agira, bailleur, syndic, énergie, eau, box, mobile, La Poste, Netflix, Spotify, Apple, Google,
  Amazon, Meta, autres réseaux sociaux, autres abonnements, carte grise (ANTS), I-CAD, notaire, formalités
  d'entreprise. Pour chacun : canaux, canal conseillé, délai, pièces, lien et procédure (compte de commémoration ou
  suppression pour les comptes en ligne).
- **Inventaire et suivi** : on coche ce qui existait, on ajoute en un clic les organismes du plan ou un contrat absent
  du catalogue. Chaque ligne a un statut (à prévenir, en attente de réponse, fait, pas concerné), une date de contact
  et une date de réponse (remplies automatiquement au changement de statut), une référence et une note. La liste
  s'imprime.
- **Courriers** (`src/lettres/`) : 8 modèles (information du décès, résiliation, clôture, capital
  décès, réversion ou veuvage, inventaire des comptes, remboursement des obsèques, versement d'une assurance-vie ;
  la résiliation du bail propose aussi la demande de transfert), préremplis avec les informations saisies une seule fois. Copie dans le presse-papiers, impression ou PDF via le
  navigateur. Une page explique la différence entre lettre recommandée, courrier simple, espace en ligne, guichet,
  téléphone et formulaire officiel.
- **Droits et aides** (`src/droits/`) : capital décès (forfait salarié, indépendant à 20 % du PASS, cas du retraité et
  du fonctionnaire), allocation de veuvage, réversion de base et Agirc-Arrco, allocation de soutien familial, paiement
  des obsèques par la banque, autres aides aux obsèques, congé pour décès du proche salarié. Chaque montant affiche sa
  source et sa date. Pour le conjoint marié, un simulateur estime la réversion (avec le plafond de ressources) et
  l'allocation de veuvage (différentielle).
- **Partage sans compte** : export d'un fichier JSON, import avec deux choix : remplacer, ou réunir (pour chaque
  organisme, la mise à jour la plus récente est gardée ; les démarches faites s'additionnent). Un bouton efface les
  données de l'appareil. Le plan complet s'imprime ou s'enregistre en PDF (`@media print`).
- **Tests** : 84 tests Vitest. Ils couvrent les 4 profils exigés (conjoint locataire, enfant d'un parent propriétaire,
  parent d'un indépendant, proche sans lien), le calcul des délais, les droits et estimations, les lettres,
  l'export/import/fusion, la cohérence des données (source et date partout) et un rendu de fumée de tous les écrans.

## Ce qui ne marche pas ou reste à faire

- **La plupart des montants et délais sont marqués `A_VERIFIER`.** service-public.fr, ameli.fr, legifrance, caf.fr et
  urssaf.fr étaient inaccessibles depuis l'environnement de développement. Les valeurs viennent de sources
  secondaires concordantes ou d'extraits du moteur de recherche. Seules les règles lues sur lassuranceretraite.fr et
  agirc-arrco.fr sont marquées `verifie`. L'interface affiche « à confirmer sur le site officiel » à côté de chaque
  valeur concernée. La liste complète est dans `JOURNAL.md`.
- Les liens vers les centres d'aide des plateformes (Google, Apple, Meta, Netflix…) n'ont pas pu être testés.
- Pas d'export PDF « fichier » : on passe par l'impression du navigateur (« Enregistrer au format PDF »).
- Les départements d'outre-mer ne sont traités que par un message : leurs délais de succession varient (6 mois à 2 ans).
- Le simulateur de réversion simplifie les ressources (pas d'abattement sur les revenus d'activité, pas de biens
  propres) ; ni le montant minimum ni le maximum de la réversion ne sont appliqués.
- Le régime des fonctionnaires, la MSA et les régimes spéciaux ne sont pas détaillés (le capital décès des agents
  publics renvoie à l'employeur).
- Hors périmètre, volontairement : calcul des droits de succession, évaluation du patrimoine (renvoi au notaire).

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint    # ESLint + tsc --noEmit
npm test        # Vitest
```

## Organisation

```
data/
  delais.json       délais (unité, départ, report, nature légale/conseillée, source, verifie_le, statut)
  droits.json       montants et seuils (capital décès, veuvage, réversion, ASF, obsèques, congés…)
  organismes.json   catalogue des organismes
  envois.json       recommandé / courrier simple / en ligne…
src/
  plan/             profil (questionnaire), règles, génération du plan
  lib/              accès typé aux données, calcul des dates
  droits/           droits applicables et estimations
  lettres/          modèles de courriers
  etat/             état local, export/import/fusion JSON
  components/       écrans (questionnaire, plan, organismes, courriers, droits, partage)
tests/              Vitest
```

Aucune donnée ne quitte le navigateur. L'outil ne remplace ni les démarches officielles ni le notaire.
