# 04-mes-delais — Mes délais : les échéances qu'on oublie

Application web qui regroupe les dates limites administratives d'un foyer (contrôle technique, carte d'identité, passeport, déclaration de revenus, préavis de bail, assurances, DPE, chaudière…), calcule la prochaine échéance et les suivantes, et les envoie dans l'agenda de l'utilisateur sous forme de fichier `.ics` avec alertes. Tout reste dans le navigateur.

## Ce qui marche

- **Catalogue de 41 types d'échéances** (+ échéance libre) dans `data/echeances.json`, répartis en 7 catégories. Pour chacun : la règle de calcul, des variantes (CNI format carte / ancien modèle / mineur, zones de la déclaration de revenus, logement vide / meublé…), les conséquences d'un retard, le lien vers la démarche, `source`, `verifie_le` et `statut` (`recoupe` ou `A_VERIFIER`). La page `/catalogue` affiche tout cela.
- **Moteur de calcul** (`src/lib/calcul.ts`, fonctions pures) avec 8 types de règles : périodique (CT 4 ans puis 2 ans), validité (CNI, passeport, DPE), date annuelle (impôts), anniversaire de contrat avec préavis (loi Chatel, assurances), délai ponctuel (préavis de bail, rétractation, recensement à la fin du 3e mois), âges (rappels de vaccin), date fixe (permis rose), échéance libre avec répétition.
  - **Rattrapage** : une échéance en retard qu'on peut encore faire (CT, CNI expirée, déclaration oubliée) est ramenée à **aujourd'hui**, et les suivantes sont recalculées à partir d'aujourd'hui. Un délai qu'on ne peut plus rattraper (rétractation, contestation d'amende) est marqué « délai expiré ».
  - Mois ajoutés avec retour au dernier jour du mois (29/02 + 1 an = 28/02).
  - Dates tombant un samedi, un dimanche ou un jour férié signalées (jours fériés calculés par `packages/fr-data`).
- **Assistant d'ajout** (`/ajouter`) : recherche dans le catalogue, saisie des dates clés, aperçu immédiat de la prochaine échéance, des suivantes, des conséquences et de la source. Modification d'une échéance existante.
- **Tableau de bord** (`/`) : compteurs et badges (dépassé / moins de 30 j / moins de 90 j / plus tard), tri par urgence, frise des 12 prochains mois, bouton « C'est fait » (avec date) qui recalcule la suivante (une ancienne CNI renouvelée passe automatiquement au format carte, 10 ans), échéances terminées repliées, impression / PDF via le navigateur.
- **Mode foyer** (`/foyer`) : personnes, véhicules, logements, étiquette sur chaque échéance, filtre du tableau de bord.
- **Rappels sans serveur** (`/rappels`) :
  - export `.ics` : un événement « journée entière » par échéance (prochaine + 3 suivantes), alertes à J-60, J-30 et J-7 à 9 h, UID stables (réimporter met à jour) ;
  - notifications du navigateur (Notification API), vérifiées à l'ouverture de la page, une fois par jour au plus ;
  - lien de rappel `/rappel?data=…` (état compressé en base64url dans l'URL), à mettre en favori ; QR code pour l'ouvrir sur le téléphone ;
  - export / import JSON (fusion ou remplacement), avec validation du fichier.
- Interface en français, utilisable sur mobile (vérifié à 390 px sans débordement), labels sur tous les champs, navigation au clavier, mention « vos données restent sur votre appareil ».

## Ce qui ne marche pas ou reste limité

- **Les alertes ne fonctionnent que si l'agenda les respecte** : Calendrier Apple, Outlook et Thunderbird gardent les alertes du fichier ; **Google Agenda les ignore à l'import** et applique les notifications par défaut de l'agenda choisi (expliqué dans l'interface). Le scénario « je reçois vraiment le rappel » n'a pas pu être testé dans un vrai agenda ; le fichier est validé par le parser `ical.js`.
- Les notifications navigateur ne partent que quand la page est ouverte (pas de service worker ni de serveur push).
- Après une suppression, l'événement déjà importé reste dans l'agenda (il faut le supprimer à la main).
- Le lien de rappel devient trop long pour un QR code au-delà d'environ 40 échéances (message affiché, il reste l'export JSON).
- Non modélisés : calendrier transitoire du CT des deux-roues immatriculés avant 2022, exception des DPE 2018–2021, report légal des délais tombant un jour non ouvré (on conseille d'agir avant), dates de la déclaration de revenus et de la taxe foncière après 2026 (reprise des jours et mois de 2026, à titre d'estimation).
- Plusieurs règles sont marquées `A_VERIFIER` (voir `JOURNAL.md`) : les sites service-public.gouv.fr et legifrance.gouv.fr n'étaient pas accessibles depuis l'environnement de construction ; les règles ont été recoupées par recherche.

## Lancer

Depuis la racine du monorepo (une seule fois) : `npm install`. Puis, dans ce dossier :

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint + tsc --noEmit
npm test        # 122 tests Vitest
```

## Organisation

```
data/echeances.json        catalogue des règles (source, verifie_le, statut)
src/lib/dates.ts           dates ISO, ajout de mois, jours non ouvrés
src/lib/calcul.ts          moteur de calcul, urgence, « c'est fait »
src/lib/ics.ts             génération iCalendar (RFC 5545) sans dépendance
src/lib/stockage.ts        localStorage, validation import, lien de rappel
src/lib/notifications.ts   sélection et affichage des notifications
src/lib/vue.ts             lignes du tableau de bord, événements d'agenda
src/components/            interface (client)
src/app/                   pages : /, /ajouter, /foyer, /rappels, /rappel, /catalogue
tests/                     règles (chaque type sur 2 dates dont un 29 février et un rattrapage), .ics validé par ical.js, stockage
```
