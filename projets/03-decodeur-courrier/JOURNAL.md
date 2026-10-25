# Journal — 03-decodeur-courrier

Session du 25 octobre 2026.

## Ce qui a été fait

- Application complète Next.js 15 / TypeScript strict / Tailwind, une seule page client.
- 33 fiches de types de courrier (`data/types-courrier/`), 23 modèles de lettres (`data/lettres/`), 18 contacts,
  41 termes de glossaire, 9 organismes.
- Classifieur à règles, extraction regex (montants, dates, références), calcul de délais, générateur de lettres,
  glossaire surligné, orientation, sauvegarde locale + export/import JSON.
- 117 tests Vitest : corpus de 33 courriers fictifs (précision 100 %, montants/dates/références attendus),
  délais (week-ends, Pâques, 14 juillet, 1er mai, Ascension, Noël, Alsace-Moselle, mois courts, bissextile, jours
  francs, ouvrés), intégrité des données, lettres, glossaire, import PDF réel (fichier `tests/fixtures/caf-indu.pdf`),
  rendu serveur de tous les composants pour chaque courrier, critère de fin.
- `npm run build`, `npm run lint`, `npm test` passent.

## Choix

- **Mots-clés sans accents** : le texte est normalisé (minuscules, sans accents, longueur conservée pour pouvoir
  surligner le texte d'origine). Score = mots-clés pondérés + bonus si l'organisme détecté correspond − exclusions.
  Les seuils (`bonusOrganisme`, `scoreMinimum`) sont des paramètres d'algorithme dans `src/classif/classifieur.ts`,
  pas des données juridiques.
- **Date limite prudente** : la date affichée est celle AVANT le report de week-end / jour férié (art. 642 CPC) ;
  le report est expliqué à part. Mieux vaut agir un jour trop tôt.
- **Point de départ** : chaque délai précise s'il court de la réception, de la date du courrier (ANTAI, FPS) ou d'une
  date fixée par le courrier. La date de réception est préremplie avec la date du courrier et doit être corrigée par
  l'utilisateur.
- Quand plusieurs sources divergent, le délai le plus court est retenu (ex. amende majorée : 1 mois plutôt que 3 ;
  majorations URSSAF : 1 mois).
- Statuts des valeurs : `verifie` (source officielle consultée), `recoupe` (plusieurs sources secondaires concordantes,
  texte officiel inaccessible), `A_VERIFIER`. Affichés en badge dans l'interface.
- **Import des `.md`** : règle webpack `asset/source` dans `next.config.ts` et petit plugin dans `vitest.config.ts`.
  Index des données écrit à la main (`src/donnees/index.ts`) ; un test vérifie qu'aucun fichier n'est oublié.
- **PDF** : `pdfjs-dist@4.10.38`, importé dynamiquement au clic (n'alourdit pas la page), worker servi en local.
- **Impression** : CSS `@media print` ; la lettre seule s'imprime via une classe posée sur `<body>`. La fiche s'imprime
  avec le `BoutonExportPdf` de `packages/ui`.
- **Dictée** : pas de bouton de reconnaissance vocale. L'API Web Speech de Chrome envoie l'audio aux serveurs de
  Google, ce qui violerait la règle « aucune donnée ne quitte le navigateur ». L'interface invite à utiliser la dictée
  du clavier du téléphone.
- Composants écrits dans le projet (non partagés, à remonter éventuellement dans `packages/ui`) :
  `Source` (badge source + date + statut, plus riche que `CarteResultat`), `TexteSurligne` (texte surligné avec
  définitions), helpers `src/lib/stockage.ts` (localStorage protégé + téléchargement de fichier) et `src/lib/pdf.ts`
  (extraction de texte PDF). Ils pourraient servir à 04-mes-delais et 12-succession.
- `packages/fr-data` réutilisé tel quel (jours fériés, jours ouvrés, formats de dates et d'euros).

## Point d'attention pour le coordinateur

- `pdfjs-dist` a été ajouté au `package.json` du projet. Pour respecter la consigne « ne pas toucher la racine »,
  le `package-lock.json` racine a été **restauré** après mon installation. En fin de session, le lock racine
  apparaît modifié par une autre session parallèle et contient déjà `pdfjs-dist@^4.10.38` pour ce projet ; à
  vérifier avant commit (`npm install` à la racine puis `npm ci` pour confirmer).

## Données A_VERIFIER ou seulement recoupées

Sites inaccessibles depuis l'environnement : legifrance.gouv.fr (403), service-public.fr, urssaf.fr, justice.fr,
economie.gouv.fr, banque-france.fr, mediation-assurance.org, conciliateurs.fr, france-services.gouv.fr. Recherches web
faites à la place le 25/10/2026.

Vérifiés (source officielle) : ANTAI 45 jours (avis, désignation), amende majorée 1 mois / 3 mois (antai.gouv.fr) ;
trop-perçu France Travail 2 mois (francetravail.fr) ; réclamation impôt sur le revenu 31/12 N+2 (impots.gouv.fr).

Recoupés (à confirmer sur Légifrance) :
- CAF : recours CRA 2 mois (CSS R142-1) — aussi utilisé pour révision, suspension, contrôle.
- Impôts : mise en demeure 30 jours / 8 jours si relance (LPF L257-0 A et B, BOFiP) ; proposition de rectification
  30 jours + 30 jours (LPF L57, R*57-1).
- URSSAF : mise en demeure 1 mois (CSS L244-2) ; CRA 2 mois.
- France Travail : recours préalable radiation 2 mois (C. trav. R5412-8).
- ANTAI : amende minorée 15 jours (article cité par les sources : 529-8 CPP, à confirmer).
- FPS : RAPO 1 mois (articles du CGCT à confirmer ; notification = envoi + 5 jours selon certaines villes).
- Bail : commandement visant la clause résolutoire 6 semaines (loi 89-462 art. 24, loi du 27/07/2023).
- Injonction de payer : opposition 1 mois (CPC 1416).
- Banque : frais de rejet ≤ 20 € et ≤ montant de l'opération (CMF D133-6).
- Assurance : suspension 30 jours puis résiliation 10 jours après (C. assur. L113-3).

A_VERIFIER :
- CAF demande de pièces : 1 mois par défaut (aucun texte trouvé).
- CAF remise de dette : pas de délai trouvé.
- Majoration de 10 % des impôts (CGI 1730) mentionnée dans les risques de l'avis d'imposition.
- URSSAF : CRA 1 mois pour les majorations (R243-20 ?).
- France Travail : 10 jours d'observations avant sanction (réforme 2025, décret n° 2025-478 cité par une source non officielle).
- Commandement aux fins de saisie-vente : 8 jours (CPCE).
- Sommation de payer : interdiction des frais de recouvrement amiable à la charge du débiteur (CPCE L111-8).
- Congé du bailleur : 6 mois (vide, art. 15) / 3 mois (meublé, art. 25-8).
- Régularisation des charges : justificatifs 6 mois (art. 23), paiement étalé sur 12 mois si régularisation tardive.
- Clôture de compte : préavis 2 mois (CMF L312-1-1).
- Frais bancaires : délai de saisine du médiateur (2 mois).
- Assurance : loi Chatel 20 jours (L113-15-1) ; code de la mutualité L221-7.
- URL des contacts marqués A_VERIFIER dans `data/contacts.json` (sites injoignables).
- Les liens « source » vers Légifrance sont des liens de **recherche** (identifiants d'articles non vérifiables).

## Questions pour Victor

1. Faut-il afficher la date « reportée » (art. 642 CPC) comme date principale plutôt que la date prudente ?
2. Pour l'ANTAI, faut-il prévoir le cas du télépaiement (+15 jours) dans le calcul, avec une case à cocher ?
3. Veut-on un vrai bouton de dictée malgré l'envoi de l'audio à Google par Chrome (avec avertissement explicite) ?
4. OCR local (Tesseract.js, ~10 Mo de modèles) dans une version 2 ?
5. Remonter `Source`, `TexteSurligne` et les helpers `stockage` / `pdf` dans `packages/` ?
6. Faire relire les modèles de lettres et les délais par un juriste (point-justice, association) avant publication.
