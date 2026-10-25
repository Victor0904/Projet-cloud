# 03 — Décodeur de courrier administratif

## Problème
Un courrier de la CAF, des impôts, de l'URSSAF, de Pôle emploi/France Travail, d'un huissier ou de l'ANTAI est souvent incompréhensible et anxiogène. L'utilisateur colle le texte (ou le dicte), l'outil lui dit en clair ce que c'est, ce qu'il risque, ce qu'il doit faire et **avant quand**, puis génère la réponse.

## Contrainte forte
**Pas d'API LLM.** Tout se fait côté client avec des règles : détection de l'expéditeur, du type de courrier, extraction des montants, dates et références par expressions régulières, puis templates explicatifs. C'est moins magique mais ça marche hors ligne et sans fuite de données.

## Fonctionnalités
1. **Zone de saisie** : coller du texte, ou importer un PDF (extraction texte via `pdfjs-dist`). Pas d'OCR d'image dans la première version.
2. **Classifieur à règles** dans `src/classif/` : une fiche par type de courrier, avec mots-clés et motifs. Couvrir au minimum 25 types, dont :
   - CAF : indu / trop-perçu, demande de pièces, révision de droits, suspension, contrôle
   - Impôts : avis d'imposition, mise en demeure, proposition de rectification, relance, prélèvement
   - URSSAF : appel de cotisations, mise en demeure, majorations
   - France Travail : convocation, radiation, trop-perçu, demande de justificatifs
   - ANTAI : avis de contravention, amende majorée, désignation du conducteur
   - Huissier / commissaire de justice : sommation, commandement de payer, injonction
   - Bailleur : relance de loyer, congé, régularisation de charges
   - Banque : rejet de prélèvement, clôture, frais
   - Mutuelle / assurance : résiliation, augmentation, mise en demeure
3. **Fiche de décodage** : en 4 blocs — « C'est quoi ? », « Ce que je risque », « Ce que je dois faire », « Délai » (date calculée à partir des dates trouvées dans le texte, en jours calendaires ou francs selon le cas, avec le calcul affiché).
4. **Générateur de réponse** : pour chaque type, 1 à 3 lettres types (contestation, demande de délai de paiement, demande d'échéancier, demande de remise gracieuse, désignation du conducteur, recours RAPO…) préremplies avec les références extraites. Export PDF et copie du texte. Mention des modalités d'envoi (LRAR, espace en ligne, courrier simple).
5. **Mode « je ne comprends toujours pas »** : glossaire des termes repérés dans le texte (indu, forclusion, RAPO, titre exécutoire…) affiché en surlignage interactif.
6. **Orientation** : pour chaque type, les contacts utiles gratuits (Défenseur des droits, point-justice, conciliateur, assistante sociale, associations) avec le lien.

## Données
- `data/types-courrier/*.json` : patterns, explication, risques, actions, délais légaux avec `source`.
- `data/lettres/*.md` : templates avec variables `{{reference}}`, `{{montant}}`, `{{date_courrier}}`.

## Tests obligatoires
- Un corpus de 30 courriers fictifs mais réalistes dans `tests/corpus/` (les écrire), chacun avec le type attendu, les montants et dates attendus. Précision du classifieur ≥ 90 % sur ce corpus.
- Calcul des délais : tests sur jours ouvrés, week-ends, jours fériés français.

## Hors périmètre
Pas de conseil juridique individualisé ; toujours afficher « ceci est une aide à la compréhension ».

## Critère de fin
Un courrier CAF d'indu collé dans l'outil produit en moins de 10 secondes une explication claire, la date limite de contestation et une lettre de recours prête à imprimer.
