# Journal — 04-mes-delais

Session du 25 octobre 2026.

## Ce qui a été fait

1. Recherche des règles (durées de validité, périodicités, délais) et rédaction de `data/echeances.json` : 41 types + échéance libre.
2. Moteur de calcul pur (`src/lib/calcul.ts`) et utilitaires de dates (`src/lib/dates.ts`).
3. Génération `.ics` maison (`src/lib/ics.ts`), stockage local, lien de rappel, notifications.
4. Interface : tableau de bord, assistant d'ajout / modification, foyer, rappels et sauvegarde, page de lien de rappel, catalogue.
5. Tests : 122 tests Vitest. Chaque type du catalogue a au moins 2 cas, dont un avec un 29 février et un cas de rattrapage ou de délai dépassé (un test vérifie cette couverture). Le `.ics` est relu par `ical.js`.
6. Vérification de bout en bout dans un Chromium headless (hors dépôt, dans le scratchpad) : ajout voiture + CNI + assurance habitation, export `.ics` téléchargé puis relu (12 événements, 3 alertes chacun), « c'est fait », filtre foyer, lien de rappel ouvert dans un autre onglet, QR code, absence de débordement horizontal à 390 px, aucune erreur console.

## Choix

- **Dates en chaînes ISO `AAAA-MM-JJ`**, calculs en UTC : pas de décalage d'heure d'été.
- **Ajout de mois** : si le jour n'existe pas, dernier jour du mois (CNI délivrée le 29/02/2024 → 28/02/2034). L'administration imprime parfois la date de fin à un jour près : signalé dans la note de la CNI.
- **Rattrapage** : échéance rattrapable en retard → date = aujourd'hui, les suivantes repartent d'aujourd'hui. « C'est fait » enregistre la date réelle : pour un CT ou une CNI, la suivante part de cette date (le CT suivant est 2 ans après le contrôle effectif).
- **CT sans date de dernier contrôle** : considéré comme jamais contrôlé, donc en retard si le véhicule a plus de 4 ans. L'aide du champ le dit, pour forcer la saisie plutôt que de supposer à tort que tout est à jour.
- **Rappel DTP sans date de dernier rappel** : le dernier âge atteint est considéré comme manqué (même logique prudente).
- **Contrats annuels (assurances, Chatel)** : jamais « en retard » (le contrat est simplement reconduit) ; on passe à l'échéance suivante.
- **Chaudière** : la loi dit « une fois par année civile » ; l'outil rappelle 12 mois après le dernier entretien, plus strict mais plus simple à comprendre.
- **Jours non ouvrés** : la date n'est pas reportée, l'interface conseille d'agir le jour ouvré précédent (plus prudent que le report légal, qui ne s'applique pas à tous les délais).
- **Alertes .ics** : `TRIGGER:-P59DT15H` etc. sur un événement journée entière = J-60 à 9 h (et J-30, J-7). Événements « transparents » pour ne pas bloquer l'agenda. UID stables `<id>-<date>@mes-delais.vie-fr`.
- **Lien de rappel** : format compact (clés courtes) puis `encoderEtat` de `packages/fr-data` (base64url) ; validation complète au décodage. Le lien est dans la query `?data=` comme demandé (le fragment `#` aurait évité qu'il apparaisse dans les journaux d'un hébergeur : à discuter).
- **État client** : `useSyncExternalStore` sur `localStorage`, synchronisé entre onglets ; rendu « Chargement… » côté serveur pour éviter les décalages d'hydratation.
- **Composants partagés écrits dans le projet** (je n'ai pas touché `packages/`) : `src/components/ui.tsx` (boutons, badges d'urgence, navigation par onglets, encadré), `src/components/etat.ts` (`telecharger`, hooks d'état). Les boutons, l'encadré et `telecharger()` mériteraient d'aller dans `packages/ui`. J'utilise `Gabarit`, `Champ`, `ChampSelect`, `BoutonExportPdf` de `packages/ui`, et `joursFeries`, `estFerie`, `qrCodeDataUrl`, `encoderEtat`, `dateLongue` de `packages/fr-data`.
- **Dépendance ajoutée** : `ical.js` en `devDependencies` du projet (tests uniquement). Installée avec `npm install --no-save` pour ne pas toucher la racine : **le `package-lock.json` racine doit être mis à jour par le coordinateur (`npm install`)**.

## Données `A_VERIFIER`

Contexte : `service-public.gouv.fr` et `legifrance.gouv.fr` étaient bloqués (proxy / DNS) depuis l'environnement. Les règles marquées `recoupe` ont été confirmées par recherche web (extraits des fiches service-public et sources secondaires concordantes). Sont marquées `A_VERIFIER` :

| Type | Ce qui est à vérifier |
| --- | --- |
| `pneus-hiver` | URL de la fiche officielle, montant de l'amende (135 €) |
| `titre-sejour` | fenêtre 120 j / 60 j (art. R. 431-5 CESEDA, vue dans la jurisprudence) et URL de la fiche |
| `taxe-fonciere` | dates 2026 (15 et 20 octobre) relevées dans la presse |
| `diagnostic-gaz` | URL de la fiche officielle propre au gaz (celle de l'électricité est citée) |
| `rappel-dtp` | âges de rappel (calendrier vaccinal) et URL précise |
| `depistage-colorectal`, `depistage-sein`, `depistage-col` | rythmes et URL des fiches ameli |
| `visite-medicale-travail` | 5 ans / 3 ans (art. R. 4624-16 code du travail) et URL de la fiche F2211 |
| `declaration-trimestrielle` | URL de la fiche officielle |
| Notes dans des types `recoupe` | calendrier transitoire du CT moto ; amende de 750 € pour défaut d'assurance ; dates de déclaration de revenus des années après 2026 |

Les numéros de fiches service-public cités (F2878, F33353, F328, F12118, F2659, F35005, F21089, F14930, F31133, F31674, F870, F18509, F16096, F18692, F20760, F32437, F1168, F929, F19083, F33991, F20314, F10485, F11094, F10027…) proviennent des résultats de recherche sur `service-public.gouv.fr` mais n'ont pas pu être ouverts.

## Questions pour Victor

1. Faut-il un **service worker** (PWA) pour des notifications même page fermée ? Cela reste sans serveur pour un rappel au lancement, mais un vrai push programmé nécessite un serveur.
2. Le lien de rappel doit-il passer en **fragment `#data=`** plutôt qu'en `?data=` (le prompt impose `?data=`, mais le fragment n'est jamais envoyé à l'hébergeur) ?
3. Valider le **CT sans date de dernier contrôle = en retard** : prudent mais peut inquiéter à tort.
4. Ajouter un abonnement agenda (URL `webcal://`) demanderait un serveur : hors règles communes, confirmer qu'on s'en passe.
5. Faut-il déplacer `ui.tsx` (boutons, badges, navigation) et `telecharger()` dans `packages/ui` ?
6. Une relecture humaine des fiches service-public (accessibles depuis un navigateur normal) permettrait de passer la plupart des statuts en `verifie`.
