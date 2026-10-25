# Vie FR

Applications web indépendantes pour simplifier la vie administrative des Français. Règles de travail : `CLAUDE.md`.
Prompts de lancement des sessions : `LANCEMENT.md`.

## Prérequis

Node.js 22 et npm 10.

## Installer (une fois, à la racine)

```bash
npm install
```

Les dépendances de tous les projets sont installées ensemble (workspaces npm).

## Lancer un projet

```bash
cd projets/05-loyer
npm run dev      # http://localhost:3000
npm run build
npm run lint     # ESLint + vérification TypeScript
npm test         # Vitest
```

Ou depuis la racine : `npm run dev -w projets/05-loyer`.
`npm run build`, `npm run lint` et `npm test` à la racine les lancent sur tous les projets et paquets.

## Contenu

| Dossier | Rôle |
|---|---|
| `packages/ui` | Composants partagés : `Gabarit` (mise en page + mention « données sur votre appareil »), `Champ`, `ChampSelect`, `CarteResultat` (montant + source + date de vérification), `BoutonExportPdf` (impression navigateur) |
| `packages/fr-data` | API Adresse (Géoplateforme IGN), API Géo, formats euros/dates FR, jours fériés et jours ouvrés (Alsace-Moselle compris), QR code, état encodé dans l'URL |
| `projets/*` | Une application Next.js 15 par dossier ; le cahier des charges est dans son `PROMPT.md` |

Les paquets sont consommés en source TypeScript (`transpilePackages` dans chaque `next.config.ts`), sans étape de build.
Un projet qui utilise `packages/ui` doit garder la ligne `@source` de son `globals.css`, sinon Tailwind ne génère pas les classes des composants.

## Déployer

Chaque projet est une application Next.js autonome (Vercel ou Coolify : dossier racine = `projets/<nom>`, installation depuis la racine du dépôt).

## Tableau de bord de démonstration

`outils/demo/construire.sh <dossier>` exporte les 8 applications en statique (`VIEFR_EXPORT=1`), les rend indépendantes de leur adresse d'hébergement (`relocaliser.py`) et ajoute le tableau de bord (`tableau-de-bord.html`). Hors ligne, `demo-hors-ligne.js` répond au géocodage avec des réponses réelles enregistrées (`geocodage-demo.json`) et ajoute un bouton de retour au tableau de bord. `serveur_strict.py` sert le résultat sous un préfixe arbitraire pour le tester.
