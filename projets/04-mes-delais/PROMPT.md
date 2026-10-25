# 04 — Mes délais : les échéances qu'on oublie

## Problème
Contrôle technique, CNI, passeport, déclaration de revenus, préavis de bail, date de résiliation d'une assurance, DPE, visite médicale, renouvellement de titre de séjour… ces échéances coûtent cher quand on les rate et aucun outil grand public ne les regroupe.

## Utilisateur cible
N'importe qui. L'outil doit être utilisable en 3 minutes et ne plus demander d'effort ensuite.

## Fonctionnalités
1. **Catalogue d'échéances** dans `data/echeances.json` : pour chaque type, la règle de calcul (ex. CT : 4 ans après la première mise en circulation puis tous les 2 ans ; CNI adulte : 15 ans ; passeport : 10 ans ; déclaration de revenus : fenêtre d'avril à juin selon le département ; loi Hamon : résiliation possible après 1 an ; loi Chatel : préavis avant reconduction ; contrôle gaz/électricité ; révision chaudière annuelle ; DPE : validité 10 ans), les conséquences du retard, et le lien vers la démarche. Au moins **30 types**.
2. **Assistant d'ajout** : l'utilisateur choisit un type, saisit la ou les dates clés (date d'achat du véhicule, date de délivrance de la CNI…), l'outil calcule la prochaine échéance et les suivantes. Possibilité d'échéances libres.
3. **Tableau de bord** : timeline des 12 prochains mois, badges urgence (dépassé / < 30 j / < 90 j), tri par urgence. Chaque échéance a un bouton « c'est fait » qui recalcule la suivante.
4. **Rappels sans serveur** :
   - export `.ics` (un événement par échéance avec alarmes à J-60, J-30, J-7) à importer dans n'importe quel agenda ;
   - notifications navigateur (Notification API) si l'utilisateur les accepte, avec un check au chargement de la page ;
   - un « lien de rappel » : page `/rappel?data=...` encodant les échéances, à mettre en favori.
5. **Export / import JSON** pour ne rien perdre, et un QR code pour passer du PC au téléphone.
6. **Mode foyer** : plusieurs personnes et plusieurs véhicules dans le même tableau, avec étiquette.

## Données
- Règles de validité avec `source` (service-public.fr, legifrance) et `verifie_le`.
- Jours fériés français dans `packages/fr-data` (les calculer, pas d'API).

## Tests obligatoires
- Chaque règle de calcul testée sur 2 dates, dont une année bissextile et un cas de rattrapage (ex. CT en retard de 6 mois : prochaine échéance = aujourd'hui, pas dans 2 ans).
- Génération `.ics` validée par un parser.

## Critère de fin
Un utilisateur saisit sa voiture, sa CNI et son assurance habitation, exporte un `.ics` et reçoit effectivement les rappels dans son agenda.
