# 01 — Simulateur d'aides unifié

## Problème
Des milliards d'euros d'aides ne sont pas réclamés chaque année parce que les gens ignorent y avoir droit ou se perdent entre les guichets. L'utilisateur remplit **un seul** formulaire et obtient la liste des aides probables, leur montant estimé et le lien direct vers la démarche.

## Utilisateur cible
Un particulier qui ne sait pas par où commencer. Il doit pouvoir répondre en moins de 5 minutes, sans document sous la main.

## Fonctionnalités (par ordre de priorité)
1. **Formulaire progressif** en 4 écrans : foyer (âge, situation familiale, enfants et âges), logement (statut locataire/propriétaire/hébergé, loyer, commune via API Adresse), activité (salarié, indépendant, étudiant, demandeur d'emploi, retraité, revenus mensuels nets du foyer), situation particulière (handicap, grossesse, apprentissage, alternance).
2. **Moteur d'éligibilité** dans `src/moteur/` : une règle par aide, fonction pure `(situation) => { eligible, montantEstime, confiance, explication }`. Aides à couvrir au minimum :
   - APL / ALS / ALF (approximation par le barème simplifié)
   - Prime d'activité
   - RSA
   - Chèque énergie
   - Bourse sur critères sociaux (étudiants) et aide Mobili-Jeune
   - Allocations familiales, complément familial, ARS (rentrée scolaire)
   - AAH (éligibilité seulement, pas de montant)
   - MaPrimeRénov' (catégorie de ménage : bleu/jaune/violet/rose)
   - Tarif social de l'électricité et réduction des frais bancaires
   - Complémentaire santé solidaire
3. **Page résultat** : aides triées par montant, chacune avec un badge de confiance (« probable », « possible », « à vérifier »), le montant mensuel ou annuel estimé, une explication en 2 phrases et le bouton vers la démarche officielle. Total annuel estimé en haut.
4. **Export** : PDF récapitulatif et « lien de partage » encodant la situation dans l'URL (sans données nominatives).
5. **Questions manquantes** : si une aide est « à vérifier » parce qu'une info manque, proposer la question complémentaire inline.

## Données
- Tous les plafonds et montants dans `data/baremes-2026.json` avec `source`, `verifie_le`, et la date d'effet. Chercher les valeurs sur service-public.fr, caf.fr, anah.gouv.fr. Si une valeur n'est pas trouvée, la marquer `A_VERIFIER`.
- Zones APL (1/2/3) : table par département/commune, ou à défaut par département.

## Tests obligatoires
- Un test par aide avec au moins 3 cas : éligible franc, non éligible franc, cas limite au seuil.
- Un test « famille témoin » : couple, 2 enfants, locataire à Nancy, 2 400 € nets → vérifier la liste produite et la figer en snapshot.

## Hors périmètre
Pas de dépôt de demande, pas de connexion CAF, pas de stockage serveur.

## Critère de fin
Un utilisateur avec une situation courante obtient en moins de 5 minutes une liste d'aides cohérente avec ce que donne le simulateur officiel (tester 3 profils contre mesdroitssociaux.gouv.fr et noter les écarts dans `JOURNAL.md`).
