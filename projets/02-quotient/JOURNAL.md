# Journal — 02-quotient

Session du 25 octobre 2026.

## Ce qui a été fait

- Collecte des grilles tarifaires de 15 communes sur les sites des mairies, et des barèmes nationaux (PSU 2026 sur caf.fr, réforme du CMG dans le communiqué CAF).
- Format de grille commun (`src/lib/types.ts`) et validation (`src/lib/validation.ts`).
- Moteur de calcul : QF CAF, quotient fiscal approché, tarif unitaire, coût annuel, comparaison, crèche PSU, CMG, crédit d'impôt.
- Interface en 5 étapes sur une seule page : foyer, besoins, comparaison, crèche ou assistante maternelle, contribution. Export et import JSON, impression.
- 161 tests Vitest, dont les 5 cas types de QF (garde alternée comprise), la cohérence de chaque grille (QF de 0 à 9 000 € : une seule tranche à chaque fois), le snapshot « 2 enfants, QF 900, Nancy vs Metz », les 3 exemples chiffrés du communiqué CAF sur le CMG et un rendu serveur de la page.

## Choix techniques

- **Tranches** : `{ de, a }` avec la règle « de < QF ≤ a » (la première tranche commence à 0 inclus, la dernière a `a: null`). Les bornes des grilles officielles (« de 351 à 500 inclus », « 900,01 à 1 150 € ») se transcrivent toutes sans ambiguïté, et l'absence de trou ou de chevauchement se vérifie simplement (`de` = `a` de la tranche précédente).
- **Plusieurs façons de donner un tarif** : tarif fixe, tarif selon le nombre d'enfants, formule polynomiale `coef[i] x (QF - x0)^i`, interpolation entre un minimum et un maximum, fourchette. Elles couvrent toutes les grilles relevées, sans code propre à une ville.
- **Montants en intervalles** `{min, max}` partout, pour propager honnêtement les fourchettes (Nantes, Rennes, Montpellier ALSH).
- **Comparaison** : l'écart mis en avant porte seulement sur les prestations connues dans toutes les communes choisies. Sinon, une ville dont la grille du centre de loisirs manque (Metz) paraît moins chère à tort.
- **Prestation sans grille** : `statut: "A_VERIFIER"` et `tranches: []`. Elle est exclue du total, et l'interface affiche « grille inconnue » et « incomplet ». On n'invente pas de valeur par défaut, car un tarif inventé ferait passer une ville pour plus ou moins chère qu'elle n'est.
- **Coût mensuel** = coût annuel / 12 (moyenne lissée). Forfaits mensuels comptés sur 10 mois.
- **CMG** : CMG = coût plafonné x (1 − ressources x taux d'effort / coût de référence). Les taux d'effort sont ceux de l'accueil collectif PSU. Cette formule redonne exactement les 3 exemples du communiqué CAF (198,08 €, 227,04 €, et 64,76 € contre 64,77 € annoncé : la CAF arrondit au centime supérieur).
- Les grilles sont importées explicitement dans `src/lib/catalogue.ts`, ce qui permet un déploiement statique sans lecture de fichiers à l'exécution. Un test vérifie qu'aucun fichier n'est oublié.
- `vitest.config.mts` active la transformation JSX (le tsconfig garde `jsx: preserve` pour Next) et l'alias `@/`.
- Aucune dépendance ajoutée.

## Composants écrits dans le projet, candidats pour `packages/`

- `src/components/commun.tsx` : `ChampNombre` (champ numérique contrôlé), `Section` (section titrée accessible), `Source` (ligne « source + vérifié le »), `Alerte`.
- `src/lib/affichage.ts` : `montant()` pour un intervalle en euros (« entre X et Y »), `dateFr()` pour une date ISO au format JJ/MM/AAAA.
- `src/lib/etat.ts` : `telecharger()`, qui télécharge un fichier sans serveur, et le modèle localStorage protégé par try/catch.
- Remarque sur `@vie-fr/ui` : `CarteResultat` affiche `verifieLe` tel quel. Il faut lui passer une date déjà formatée, sinon « 2026-10-25 » apparaît en ISO.

## Données `A_VERIFIER`

Barèmes nationaux :
- `cmg.json` : coût horaire de référence **4,91 €** et plafond horaire **8,09 €** depuis le 1er avril 2026. Ces valeurs viennent de WebLex et Wizbii, pas d'une page officielle ; les valeurs 2025 officielles étaient 4,85 € et 8,00 €. Le plancher (814,62 €, repris du barème PSU) et le plafond de ressources du CMG (8 500 €) sont aussi à vérifier.
- `assmat-departements.json` : **aucun tarif médian départemental** trouvé (Pajemploi et open.urssaf.fr inaccessibles). Tous les départements reprennent la valeur nationale de 4,91 €.
- `credit-impot.json` : 50 %, plafond de 3 500 € par enfant (source secondaire).
- `quotient.json` : prise en compte de la résidence alternée (part entière chez chaque parent) ; majoration AEEH (+0,5 part, la page CAF dit « 1 part ») ; parts fiscales utilisées pour approcher les quotients municipaux.
- `parametres.json` : 36 semaines scolaires (article D521-2 non relu, Legifrance inaccessible) et 10 mois de forfait.

Par commune (le détail figure dans le champ `a_verifier` de chaque fichier) :
- **Grenoble, Reims** : aucune grille. Le portail famille de Grenoble est inaccessible, et reims.fr bloque les accès automatisés.
- **Paris** : goûter, étude et centres de loisirs non trouvés (cdn.paris.fr inaccessible).
- **Marseille** : grille de la cantine 2026-2027 relevée par le moteur de recherche (le site bloque les robots) ; périscolaire non trouvé.
- **Bordeaux** : formule de la cantine 2025 ; périscolaire associatif non publié.
- **Nantes** : seulement des fourchettes (simulateur inaccessible).
- **Rennes** : seulement la fourchette 0,30-7,10 €, relevée par le moteur de recherche (site inaccessible).
- **Lyon** : interpolation linéaire supposée dans chaque tranche ; formule du QFM ; vacances « Hé Hop ! » non trouvées.
- **Strasbourg** : formule du « QF Unique » supposée (revenu fiscal / 12 / parts).
- **Metz** : coquille probable sur le site (0,65 € au lieu de 0,96 €/h pour la tranche 651-800) ; centres de loisirs associatifs non publiés.
- **Lille** : grille 2026-2027 complète non publiée, valeurs 2025-2026 reprises ; tranche « 2500-2499 » lue comme 2500-2999.
- **Dijon** : formules 2025 (la brochure 2026 est inaccessible).
- **Montpellier** : règlement de janvier 2025 ; centres de loisirs connus seulement par une fourchette.

## Questions ouvertes pour Victor

1. Faut-il compléter Grenoble, Reims, Rennes et Paris à la main (copie des PDF officiels) ? Les sites de ces villes ont bloqué la collecte automatique.
2. Pour les villes à fourchette (Nantes, Rennes), vaut-il mieux afficher la fourchette, comme maintenant, ou les exclure de la comparaison ?
3. Garde alternée : retient-on l'hypothèse « l'enfant compte entièrement chez chaque parent pour le QF CAF » ? Les CAF ont le choix.
4. Faut-il intégrer les tarifs hors commune ? C'est utile pour une famille qui hésite entre deux villes mais travaille dans une troisième.
5. Faut-il remonter `ChampNombre`, `Source`, `montant()` et `telecharger()` dans `packages/` ?
6. Quelle adresse de dépôt GitHub mettre dans le texte du ticket de contribution (aucun lien n'est inséré pour l'instant) ?
