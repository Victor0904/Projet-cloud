# 12 — Après un décès : l'assistant des démarches

## Problème
Au décès d'un proche, la famille doit en quelques semaines prévenir des dizaines d'organismes, résilier des contrats, demander des capitaux, gérer les abonnements numériques — sans guide, en plein deuil. Les erreurs coûtent (abonnements qui continuent, délais de déclaration de succession dépassés, pensions de réversion non demandées).

## Ton
Sobre, chaleureux, sans jargon ni injonction. Pas d'icônes ludiques. Chaque écran doit pouvoir être lu par quelqu'un d'épuisé.

## Utilisateur cible
Proche qui prend en charge les démarches (conjoint, enfant), sans connaissance juridique.

## Fonctionnalités
1. **Questionnaire d'entrée** court : lien avec le défunt, situation matrimoniale, enfants, propriétaire/locataire, salarié/retraité/indépendant, existence d'un testament ou d'une assurance-vie connue, véhicule, animaux, entreprise.
2. **Plan de démarches personnalisé**, dans `src/plan/`, généré par règles à partir du questionnaire. Chaque démarche a : titre, pourquoi, qui contacter, pièces à fournir, **délai légal ou recommandé** (ex. déclaration de décès 24 h, employeur dès que possible, banque/assurance rapidement, déclaration de succession 6 mois en métropole, pension de réversion sans délai mais rétroactivité limitée), et un modèle de courrier. Organisé en phases : les premiers jours / le premier mois / les six premiers mois / après.
3. **Catalogue d'organismes** dans `data/organismes.json` : mairie, pompes funèbres, employeur, caisse de retraite (base et complémentaire), CPAM, CAF, impôts, banque, assurances, mutuelle, bailleur ou syndic, fournisseurs d'énergie, télécom, opérateur mobile, abonnements numériques (Netflix, Spotify, Apple, Google, Amazon, Facebook/Meta — procédures de compte mémorial ou suppression), réseaux sociaux, assurance-vie (procédure AGIRA), préfecture (véhicule), notaire. Pour chacun : canal, délai, pièces, lien officiel.
4. **Inventaire** : l'utilisateur coche ce qui existe, ajoute des contrats inconnus du catalogue ; l'outil tient la liste « à prévenir / fait / en attente de réponse » avec dates.
5. **Lettres** : modèle par organisme (information du décès, demande de clôture, demande de capital décès, demande de réversion, résiliation, demande d'inventaire des comptes) préremplies ; export PDF ou copie. Expliquer la différence entre LRAR, simple courrier et espace en ligne.
6. **Droits et aides** : capital décès CPAM, allocation veuvage, pension de réversion (conditions), ASF pour les enfants, aides frais d'obsèques, congés légaux pour le proche salarié. Montants avec `source` et `verifie_le`.
7. **Export** : le plan complet en PDF, et export/import JSON pour partager entre frères et sœurs (pas de compte).

## Données
- Tout avec `source` (service-public.fr, ameli.fr, info-retraite.fr, impots.gouv.fr, AGIRA) et `verifie_le`.

## Tests obligatoires
- Génération du plan pour 4 profils (conjoint survivant locataire, enfant d'un parent propriétaire, parent d'un indépendant, proche sans lien familial) : vérifier que les démarches attendues sont présentes et correctement datées.
- Calcul des délais depuis la date du décès.

## Hors périmètre
Pas de calcul de droits de succession ni d'évaluation de patrimoine ; renvoyer au notaire. Pas de stockage serveur.

## Critère de fin
Un enfant qui vient de perdre un parent obtient en 10 minutes une liste ordonnée de ce qu'il doit faire, avec les dates limites et les courriers prêts, et peut la partager avec sa sœur.
