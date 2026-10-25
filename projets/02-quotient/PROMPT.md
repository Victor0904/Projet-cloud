# 02 — Comparateur de coûts selon le quotient familial

## Problème
Le prix réel de la cantine, du périscolaire, de la crèche ou du centre de loisirs dépend du quotient familial **et** de la commune, avec des grilles tarifaires différentes partout. Personne ne peut comparer avant de choisir un mode de garde ou une ville.

## Utilisateur cible
Parent qui veut savoir combien lui coûtera vraiment une année de garde/cantine, ou qui hésite entre deux communes.

## Fonctionnalités
1. **Calcul du quotient familial** CAF à partir des revenus annuels et de la composition du foyer (formule officielle : (revenus annuels / 12 + prestations familiales) / nombre de parts). Afficher les parts et expliquer.
2. **Base de grilles tarifaires** dans `data/grilles/<code-insee>.json` : pour chaque commune, par prestation (cantine, garderie matin/soir, centre de loisirs journée/demi-journée, crèche municipale) les tranches de QF et le tarif. Démarrer avec au moins **15 communes** : Nancy, Metz, Strasbourg, Paris, Lyon, Marseille, Toulouse, Nantes, Bordeaux, Lille, Rennes, Montpellier, Grenoble, Dijon, Reims. Les grilles sont publiées sur les sites des mairies ou sur data.gouv.fr ; chaque fichier porte `source` et `verifie_le`.
3. **Coût annuel** : l'utilisateur choisit les prestations utilisées (ex. cantine 4 jours/semaine, garderie du soir 3 jours, centre de loisirs 10 journées sur les vacances) et le nombre d'enfants → coût mensuel et annuel par commune, avec le détail.
4. **Comparaison** : jusqu'à 3 communes côte à côte, écart en euros/an mis en avant.
5. **Crèche** : appliquer le barème national PSU (taux d'effort par nombre d'enfants, plancher et plafond de ressources) pour les crèches conventionnées CAF, et comparer avec une assistante maternelle (estimation à partir du tarif horaire médian départemental + CMG).
6. **Contribution** : formulaire permettant à un utilisateur de proposer une grille pour sa commune, exporté en JSON prêt à être ajouté au dépôt (pas de backend : génère le fichier et un texte d'issue GitHub).

## Tests obligatoires
- Calcul du QF sur 5 cas types, dont garde alternée.
- Pour chaque commune : la grille est bien ordonnée, sans trou ni chevauchement entre tranches.
- Un cas complet « 2 enfants, QF 900, Nancy vs Metz » figé en snapshot.

## Critère de fin
Un parent obtient, pour sa commune, un coût annuel réaliste et peut le comparer à une autre ville en moins de 2 minutes.
