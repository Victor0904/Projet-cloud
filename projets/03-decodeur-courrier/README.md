# 03-decodeur-courrier — Décodeur de courrier administratif

On colle le texte d'un courrier (ou on importe un PDF). L'outil dit ce que c'est, ce qu'on risque, ce qu'il faut
faire et **avant quelle date**, puis prépare une lettre de réponse prête à imprimer. **Aucune API, aucun LLM, aucun
envoi réseau** : tout est fait dans le navigateur avec des règles (mots-clés pondérés + expressions régulières).

## Ce qui marche

- **Saisie** : zone de texte, import PDF (extraction du texte avec `pdfjs-dist`, dans le navigateur), 3 exemples fictifs.
  La dictée passe par le clavier du téléphone ou de l'ordinateur (voir JOURNAL).
- **Classifieur à règles** (`src/classif/`) : **33 types de courrier** couvrant CAF (indu, pièces, révision, suspension,
  contrôle), impôts (avis, mise en demeure, rectification, relance, prélèvement à la source), URSSAF (appel, mise en
  demeure, majorations), France Travail (convocation, radiation, trop-perçu, justificatifs), ANTAI (avis de
  contravention, amende majorée, désignation du conducteur, forfait post-stationnement), commissaire de justice
  (sommation, commandement de payer, injonction de payer), bailleur (relance, congé, régularisation des charges),
  banque (rejet de prélèvement, clôture, frais) et assurance/mutuelle (résiliation, augmentation, mise en demeure).
  Précision sur le corpus de test : **33/33 (100 %)**. Si le type est faux ou non reconnu, l'utilisateur le choisit
  dans une liste.
- **Extraction** (`src/extraction/`) : montants (formats français, €, euros, EUR), dates (numériques et en lettres,
  « 1er »), date du courrier, date limite, références (n° allocataire, n° fiscal, n° d'avis, immatriculation,
  identifiant France Travail, n° de contrat, de compte, de dossier, SIRET…).
- **Fiche de décodage en 4 blocs** : « C'est quoi ? », « Ce que je risque », « Ce que je dois faire », « Délai ».
  Le délai est calculé (`src/delais/`) en jours calendaires, francs, ouvrés, semaines, mois ou « 31 décembre de
  l'année N+x », à partir de la date de réception (modifiable) ou de la date du courrier, avec le **calcul affiché pas
  à pas**, jours fériés français (et Alsace-Moselle en option) et report de week-end/férié (art. 642 CPC) signalé.
  La date affichée est la date **prudente** (avant report). Chaque délai affiche sa source, sa date de vérification
  et un badge « Vérifié / Recoupé / À vérifier ».
- **Contrôles automatiques** : ex. frais de rejet de prélèvement supérieurs au plafond de 20 € → alerte.
- **Générateur de réponse** : 23 modèles (`data/lettres/*.md`), 1 à 3 par type (recours CRA, remise de dette,
  échéancier, RAPO, désignation du conducteur, requête en exonération, opposition à injonction de payer…),
  préremplis avec la référence, le montant et les dates extraits. Coordonnées de l'utilisateur mémorisables en
  `localStorage` (case à cocher). Texte modifiable, **copie** et **impression / PDF** (impression CSS de la lettre
  seule). Modalités d'envoi (LRAR, espace en ligne, courrier simple, greffe) pour chaque lettre.
- **« Je ne comprends toujours pas »** : 41 termes de glossaire repérés dans le texte et surlignés ; chaque terme est un
  bouton accessible au clavier qui affiche sa définition en langage clair.
- **Orientation** : contacts gratuits par type (Défenseur des droits, point-justice, conciliateur, médiateurs CAF /
  France Travail / URSSAF / fiscal / bancaire / assurance, ADIL, Banque de France, France services, Crésus…).
- **Sauvegarde locale** : dernière analyse reprise à l'ouverture, export/import JSON, bouton « Tout effacer ».
- Avertissement permanent « ceci est une aide à la compréhension » + mention « rien ne quitte votre appareil ».
- **Critère de fin** vérifié par un test : le courrier CAF d'indu du corpus produit explication, date limite de
  recours CRA (3 mai 2026 pour un courrier reçu le 3 mars 2026) et lettre de recours en quelques millisecondes.

## Ce qui ne marche pas / limites

- Pas d'OCR : un PDF scanné ou une photo ne donne pas de texte (message explicite à l'utilisateur).
- Le classifieur est à mots-clés : un courrier atypique peut être mal classé (le choix manuel est toujours possible).
  Le corpus de test a été écrit par la même session que les règles ; la précision réelle sera plus basse.
- Beaucoup de délais n'ont pas pu être vérifiés sur Légifrance / service-public.fr (sites inaccessibles depuis
  l'environnement de développement) : ils sont marqués « Recoupé » ou « À vérifier » dans l'interface et listés
  dans `JOURNAL.md`.
- Le point de départ réel d'un délai (date de notification, première présentation d'un recommandé, signification à
  personne ou non) n'est pas toujours déductible du texte : l'utilisateur doit saisir la date de réception.
- Les tests d'interface sont des rendus serveur (`renderToStaticMarkup`), pas des tests dans un vrai navigateur.

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install` (ajoute `pdfjs-dist`, déclaré dans le `package.json`
de ce projet). Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint + tsc
npm test        # vitest : corpus, extraction, délais, données, lettres, glossaire, PDF, rendu
```

## Organisation

```
data/types-courrier/*.json  une fiche par type : mots-clés, explication, risques, actions, délais (source, verifie_le, statut)
data/lettres/*.md           modèles de lettres (en-tête titre / envoi / conseil_envoi, variables {{reference}}…)
data/organismes.json        mots-clés de détection de l'expéditeur
data/contacts.json          contacts gratuits (url, statut de vérification)
data/glossaire.json         termes et définitions en langage clair
data/exemples.json          courriers fictifs de démonstration
src/classif/                classifieur à règles
src/extraction/             montants, dates, références, normalisation du texte
src/delais/                 calcul des délais (jours calendaires / francs / ouvrés / mois, fériés)
src/lettres/                lecture et remplissage des modèles
src/glossaire/              repérage des termes dans le texte
src/components/             interface (client)
tests/corpus/               33 courriers fictifs + attendus.json
```

Pour ajouter un type : créer `data/types-courrier/<id>.json`, l'importer dans `src/donnees/index.ts` (un test vérifie
que chaque fichier y figure), ajouter un courrier au corpus et son attendu.
