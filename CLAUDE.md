# Monorepo « Vie FR » — règles communes

Ce dépôt regroupe plusieurs applications web indépendantes destinées à simplifier la vie administrative des Français. Chaque application vit dans son propre dossier sous `projets/` et possède un `PROMPT.md` qui décrit ce qu'il faut construire. **Ce fichier décrit comment travailler ; le `PROMPT.md` décrit quoi construire.**

## Comment une session doit travailler

1. Lire ce fichier en entier, puis le `PROMPT.md` du projet assigné (indiqué dans l'instruction de lancement, ex. « Construis `projets/03-decodeur-courrier` »).
2. Ne toucher qu'au dossier du projet assigné et, si nécessaire, à `packages/` (code partagé). Ne jamais modifier un autre projet.
3. Travailler par étapes commitées : squelette → fonctionnalité principale → cas limites → tests → README. Un commit par étape, message en français, préfixé par le nom du projet : `03-decodeur: ajout du parser de courrier CAF`.
4. Avant de considérer le travail fini : `npm run build`, `npm run lint`, `npm test` passent sans erreur dans le dossier du projet, et le `README.md` du projet décrit ce qui marche, ce qui ne marche pas, et comment lancer.
5. Si une donnée ou une règle est incertaine (barème, seuil, texte de loi), la mettre dans un fichier `data/*.json` avec un champ `source` (URL) et `verifie_le` (date). Ne jamais coder un chiffre en dur dans un composant.
6. En fin de session, écrire `projets/<nom>/JOURNAL.md` : ce qui a été fait, les choix pris, les questions ouvertes pour Victor.

## Stack imposée

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS. Pas d'autre framework.
- Aucune clé d'API payante, aucun service tiers nécessitant un compte. Uniquement des données ouvertes (data.gouv.fr, INSEE, API Adresse, API Géo, Éducation nationale, DVF…) téléchargées dans `data/` ou appelées via des API publiques sans authentification.
- Pas de base de données serveur : état en `localStorage` côté client, export/import JSON. Tout doit fonctionner en déploiement statique ou sur Vercel gratuit.
- Génération de PDF : `@react-pdf/renderer` ou impression CSS (`@media print`). Pas de service externe.
- Tests : Vitest pour la logique métier (calculs, parsers, barèmes) — c'est là que les bugs coûtent cher. Les composants UI ne sont testés que si c'est rapide.
- Aucune donnée personnelle ne quitte le navigateur. Le dire explicitement dans l'interface.

## Qualité attendue

- Interface en français, sobre, lisible sur mobile, accessible (labels, contrastes, navigation clavier). S'inspirer du Système de Design de l'État (DSFR) sans forcément l'installer.
- L'utilisateur doit toujours sortir avec quelque chose de concret : un montant, un document, un rappel, une lettre. Pas de page qui se contente d'informer.
- Chaque résultat chiffré affiche sa source et sa date de vérification.
- Les textes juridiques ou administratifs sont reformulés en langage clair, jamais copiés tels quels.
- Mentionner clairement les limites (« estimation », « ne remplace pas la démarche officielle »).

## Structure

```
CLAUDE.md
package.json            # workspaces npm
packages/
  ui/                   # composants partagés (formulaires, cartes résultat, export PDF)
  fr-data/              # helpers : API Adresse, API Géo, formats de dates FR, euros
projets/
  01-aides/
  02-quotient/
  03-decodeur-courrier/
  04-mes-delais/
  05-loyer/
  08-changer-de-boulot/
  10-ecoles/
  12-succession/
```

Chaque dossier projet contient : `PROMPT.md`, `README.md`, `JOURNAL.md`, `data/`, `src/`, `tests/`.

## Ce qu'il ne faut pas faire

- Ne pas créer de système d'authentification.
- Ne pas installer de dépendances lourdes pour un seul usage (pas de Prisma, pas de Redux, pas d'ORM).
- Ne pas inventer de chiffres : si un barème est introuvable, le signaler dans `JOURNAL.md` et mettre une valeur par défaut clairement marquée `A_VERIFIER`.
- Ne pas donner de conseil juridique ou financier individualisé ; l'outil calcule, explique et oriente.
