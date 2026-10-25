# 05 — Checker de loyer (encadrement)

## Problème
Dans les zones d'encadrement des loyers (Paris, Lyon-Villeurbanne, Lille, Montpellier, Bordeaux, Plaine Commune, Est Ensemble, Pays basque…), un loyer sur trois dépasserait le plafond légal. Les locataires ne le savent pas et ne savent pas comment contester.

## Utilisateur cible
Locataire ou candidat locataire qui a une annonce ou un bail sous les yeux.

## Fonctionnalités
1. **Saisie** : adresse (API Adresse → géoloc + commune), surface habitable, nombre de pièces, époque de construction, meublé ou non, loyer hors charges, date de signature du bail, éventuellement complément de loyer mentionné.
2. **Détermination de la zone** : à partir des coordonnées, retrouver le secteur/quartier d'encadrement. Les périmètres et loyers de référence sont publiés en open data par chaque collectivité (data.gouv.fr, geo.data.gouv.fr, opendata.paris.fr…). Stocker dans `data/encadrement/<ville>/` les géométries (GeoJSON simplifié) et les loyers de référence par secteur / nb de pièces / époque / meublé. Faire du point-dans-polygone côté client (`@turf/boolean-point-in-polygon`).
3. **Verdict** : loyer de référence, loyer majoré, écart en €/mois et €/an, et un indicateur clair conforme / dépasse. Expliquer ce qu'est un complément de loyer et quand il est illégal.
4. **Hors zone encadrée** : afficher quand même une estimation du loyer médian du secteur (données DVF ne couvrant pas les loyers, utiliser les cartes de loyers ANIL/Ministère du Logement en open data, par commune et typologie) avec un avertissement sur la nature indicative.
5. **Action** : si dépassement, générer la lettre de mise en demeure au bailleur (modèle conforme à la loi ELAN) préremplie, puis expliquer la suite (commission de conciliation, juge des contentieux de la protection, délais de 3 ans / 3 mois selon le cas). Export PDF.
6. **Lien de partage** encodant l'adresse approximative et le résultat, pour envoyer à un proche ou une association.

## Données
- Un script `scripts/import-<ville>.ts` par ville pour régénérer les fichiers depuis l'open data, avec la date d'arrêté préfectoral en vigueur.
- Commencer par Paris, Lyon, Lille, Montpellier, Bordeaux ; documenter dans `JOURNAL.md` les villes manquantes et la raison.

## Tests obligatoires
- Point-dans-polygone sur 3 adresses connues par ville.
- Calcul du loyer de référence pour 10 combinaisons (pièces × époque × meublé).
- Un cas « studio meublé Paris 11e à 950 € » figé en snapshot.

## Critère de fin
Un locataire parisien colle son adresse et son loyer et sait en 30 secondes s'il paie trop, de combien, et quoi envoyer à son propriétaire.
