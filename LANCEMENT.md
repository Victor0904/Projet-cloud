# Prompts de lancement des sessions cloud

Copier-coller l'un de ces textes comme instruction de départ. Une session par projet, lançables en parallèle (elles ne touchent pas aux mêmes dossiers).

## Session 0 — Socle (à faire en premier, seule)

> Lis `CLAUDE.md`. Mets en place le monorepo : `package.json` racine avec workspaces npm, `packages/ui` (composants de formulaire, carte résultat, bouton export PDF, mise en page commune) et `packages/fr-data` (client API Adresse et API Géo, formats euros/dates FR, jours fériés français calculés, QR code, encodage/décodage d'état dans l'URL). Crée pour chaque dossier de `projets/` un squelette Next.js 15 + TypeScript + Tailwind + Vitest qui importe `packages/ui`, avec `npm run dev/build/lint/test` fonctionnels. Un `README.md` racine explique comment lancer un projet. Ne commence aucun projet métier.

## Sessions 1 à 8 — un projet chacune

Remplacer `<dossier>` par `01-aides`, `02-quotient`, `03-decodeur-courrier`, `04-mes-delais`, `05-loyer`, `08-changer-de-boulot`, `10-ecoles` ou `12-succession`.

> Lis `CLAUDE.md` puis `projets/<dossier>/PROMPT.md`. Construis entièrement cette application en respectant les règles communes, dans ce dossier uniquement (plus `packages/` si un composant mérite d'être partagé). Avance par étapes commitées. Récupère toi-même les données ouvertes nécessaires et documente chaque valeur avec sa source. Ne t'arrête que lorsque build, lint et tests passent, que le README décrit l'état réel du projet et que `JOURNAL.md` liste tes choix et tes questions. Si tu bloques sur une donnée introuvable, marque-la `A_VERIFIER` et continue.

## Session finale — Revue croisée

> Lis `CLAUDE.md`. Pour chaque projet de `projets/`, lance build, lint et tests, ouvre l'application et parcours le scénario décrit dans « Critère de fin » du `PROMPT.md`. Ne corrige rien : rédige `REVUE.md` à la racine avec, par projet, ce qui marche, ce qui casse, les chiffres marqués `A_VERIFIER`, et les 3 corrections les plus importantes à faire.
