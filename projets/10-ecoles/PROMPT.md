# 10 — Comparateur d'écoles, collèges et lycées

## Problème
Les données sur les établissements (résultats, valeur ajoutée, options, effectifs, sectorisation) existent en open data mais sont éclatées dans une dizaine de jeux de données illisibles pour un parent.

## Utilisateur cible
Parent qui déménage, qui choisit un lycée, ou qui veut comprendre la carte scolaire de son adresse.

## Fonctionnalités
1. **Import des données** par scripts dans `scripts/` (téléchargement → nettoyage → `data/*.json` ou fichiers découpés par département pour rester léger). Jeux à utiliser, tous sur data.education.gouv.fr / data.gouv.fr :
   - annuaire de l'éducation (tous les établissements, coordonnées, secteur public/privé, langues, options, sections)
   - indicateurs de valeur ajoutée des lycées (IVAL) : taux de réussite au bac, taux d'accès, valeur ajoutée
   - indicateurs de valeur ajoutée des collèges (IVAC) : DNB, taux d'accès
   - effectifs par établissement
   - indice de position sociale (IPS) des écoles, collèges et lycées
   - carte scolaire / sectorisation quand elle est publiée par la collectivité (Paris, Lyon, Toulouse… ; documenter ce qui est disponible)
2. **Carte** (Leaflet + tuiles OSM) centrée sur une adresse saisie via API Adresse, avec filtres : niveau, public/privé, option (section euro, internationale, sport-études, langue rare), distance.
3. **Fiche établissement** : résultats sur 3 ans, valeur ajoutée expliquée en français simple (« fait mieux / moins bien que ce que son public laisserait attendre »), IPS, effectifs, options, horaires et contact, lien vers la fiche officielle. Toujours contextualiser : un taux de réussite brut sans valeur ajoutée est trompeur, le dire.
4. **Comparaison** : jusqu'à 4 établissements côte à côte.
5. **Mon secteur** : pour une adresse, l'établissement de secteur quand la donnée existe, sinon un message clair « sectorisation non publiée par votre collectivité, contactez la mairie/DSDEN ». Expliquer les dérogations (motifs légaux, calendrier, qui décide) avec le formulaire type.
6. **Export** PDF de la comparaison.

## Contraintes
- Les fichiers de données ne doivent pas dépasser quelques Mo par département ; charger à la demande.
- Ne jamais afficher de classement national brut ; toujours au moins la valeur ajoutée à côté du taux.

## Tests obligatoires
- Scripts d'import testés sur un échantillon fixé dans `tests/fixtures/`.
- Jointure annuaire ↔ IVAL ↔ IPS par UAI sans perte > 5 % (sinon le documenter).
- Recherche par adresse à Nancy renvoyant les établissements dans un rayon de 3 km.

## Critère de fin
Un parent tape son adresse, voit les collèges autour, comprend lequel est de secteur et peut comparer deux lycées avec des indicateurs expliqués.
