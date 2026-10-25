// Chaque règle du catalogue est testée sur au moins 2 dates : une année bissextile (29 février)
// et un cas de rattrapage ou de délai dépassé.
import { describe, expect, it } from "vitest";
import { calculer, marquerFait } from "../src/lib/calcul";
import { catalogue, typeParId } from "../src/lib/catalogue";
import type { Echeance, StatutCalcul } from "../src/lib/types";

type Cas = {
  nom: string;
  type: string;
  auj: string;
  dates?: Record<string, string>;
  variante?: string;
  parametres?: Record<string, number>;
  derniere?: { echeance: string; faitLe: string };
  libre?: { date: string; recurrenceMois: number };
  creeLe?: string;
  attendu: { statut: StatutCalcul; date: string; theorique?: string; suivante?: string };
};

const CAS: Cas[] = [
  // — Véhicules —
  { nom: "voiture née un 29 février", type: "ct-voiture", auj: "2023-10-01", dates: { mise_en_circulation: "2020-02-29" }, attendu: { statut: "a_venir", date: "2024-02-29", suivante: "2026-02-28" } },
  { nom: "CT en retard de 6 mois → aujourd'hui", type: "ct-voiture", auj: "2025-10-10", dates: { mise_en_circulation: "2019-04-10", dernier_controle: "2023-04-10" }, attendu: { statut: "en_retard", date: "2025-10-10", theorique: "2025-04-10", suivante: "2027-10-10" } },
  { nom: "camionnette bissextile", type: "ct-camionnette", auj: "2025-01-01", dates: { mise_en_circulation: "2024-02-29" }, attendu: { statut: "a_venir", date: "2028-02-29" } },
  { nom: "camionnette jamais contrôlée", type: "ct-camionnette", auj: "2026-10-25", dates: { mise_en_circulation: "2018-01-15" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2022-01-15" } },
  { nom: "moto née un 29 février : 5 ans puis 3 ans", type: "ct-moto", auj: "2026-01-01", dates: { mise_en_circulation: "2024-02-29" }, attendu: { statut: "a_venir", date: "2029-02-28", suivante: "2032-02-28" } },
  { nom: "moto en retard", type: "ct-moto", auj: "2026-10-25", dates: { mise_en_circulation: "2015-01-01", dernier_controle: "2022-06-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-06-01" } },
  { nom: "collection bissextile", type: "ct-collection", auj: "2025-01-01", dates: { dernier_controle: "2024-02-29" }, attendu: { statut: "a_venir", date: "2029-02-28" } },
  { nom: "collection en retard", type: "ct-collection", auj: "2026-10-25", dates: { dernier_controle: "2020-03-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-03-01" } },
  { nom: "contre-visite vers le 29 février", type: "contre-visite-ct", auj: "2024-01-05", dates: { date_controle: "2023-12-29" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "contre-visite expirée", type: "contre-visite-ct", auj: "2026-10-25", dates: { date_controle: "2026-01-10" }, attendu: { statut: "depasse", date: "2026-03-10" } },
  { nom: "carte grise : 31 janvier + 1 mois", type: "carte-grise-adresse", auj: "2024-02-01", dates: { date_demenagement: "2024-01-31" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "carte grise oubliée", type: "carte-grise-adresse", auj: "2026-10-25", dates: { date_demenagement: "2026-05-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-06-01" } },
  { nom: "assurance auto souscrite un 29 février", type: "assurance-auto", auj: "2026-10-25", dates: { date_souscription: "2024-02-29" }, attendu: { statut: "a_venir", date: "2027-02-28", suivante: "2028-02-29" } },
  { nom: "assurance auto : échéance passée = reconduite", type: "assurance-auto", auj: "2026-10-25", dates: { date_souscription: "2020-06-15" }, attendu: { statut: "a_venir", date: "2027-06-15" } },
  { nom: "pneus hiver ajoutés un 29 février", type: "pneus-hiver", auj: "2024-02-29", attendu: { statut: "a_venir", date: "2024-11-01" } },
  { nom: "pneus hiver après « c'est fait »", type: "pneus-hiver", auj: "2026-10-25", creeLe: "2025-01-01", derniere: { echeance: "2025-11-01", faitLe: "2025-10-28" }, attendu: { statut: "a_venir", date: "2026-11-01" } },

  // — Identité —
  { nom: "CNI format carte délivrée un 29 février", type: "cni", variante: "format-carte", auj: "2026-10-25", dates: { date_delivrance: "2024-02-29" }, attendu: { statut: "a_venir", date: "2034-02-28" } },
  { nom: "CNI ancien modèle expirée", type: "cni", variante: "ancien-majeur", auj: "2026-10-25", dates: { date_delivrance: "2010-05-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-05-01", suivante: "2036-10-25" } },
  { nom: "CNI mineur expirée", type: "cni", variante: "mineur", auj: "2026-10-25", dates: { date_delivrance: "2016-03-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-03-01" } },
  { nom: "passeport majeur bissextile", type: "passeport", variante: "majeur", auj: "2025-12-01", dates: { date_delivrance: "2016-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "passeport mineur expiré", type: "passeport", variante: "mineur", auj: "2026-10-25", dates: { date_delivrance: "2020-01-10" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-01-10" } },
  { nom: "permis bissextile", type: "permis-conduire", auj: "2026-10-25", dates: { date_delivrance: "2012-02-29" }, attendu: { statut: "a_venir", date: "2027-02-28" } },
  { nom: "permis expiré", type: "permis-conduire", auj: "2026-10-25", dates: { date_delivrance: "2011-01-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-01-01" } },
  { nom: "permis rose à remplacer", type: "permis-rose", auj: "2028-02-29", attendu: { statut: "a_venir", date: "2033-01-19" } },
  { nom: "permis rose après la date", type: "permis-rose", auj: "2033-02-01", attendu: { statut: "depasse", date: "2033-01-19" } },
  { nom: "titre de séjour ANEF expirant un 29 février", type: "titre-sejour", variante: "anef", auj: "2027-01-01", dates: { date_expiration: "2028-02-29" }, attendu: { statut: "a_venir", date: "2027-12-31" } },
  { nom: "titre de séjour : fenêtre dépassée", type: "titre-sejour", variante: "anef", auj: "2026-10-25", dates: { date_expiration: "2026-11-30" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-10-01" } },
  { nom: "CEAM bissextile", type: "ceam", auj: "2025-01-01", dates: { date_delivrance: "2024-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "CEAM expirée", type: "ceam", auj: "2026-10-25", dates: { date_delivrance: "2023-05-05" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-05-05" } },
  { nom: "recensement d'un enfant né un 29 février", type: "recensement", auj: "2024-03-01", dates: { date_naissance: "2008-02-29" }, attendu: { statut: "a_venir", date: "2024-05-31" } },
  { nom: "recensement en retard (exemple service-public : 12/09 → 31/12)", type: "recensement", auj: "2026-10-25", dates: { date_naissance: "2009-09-12" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-12-31" } },

  // — Impôts et amendes —
  { nom: "déclaration zone 3, ajoutée un 29 février", type: "declaration-revenus", variante: "zone3", auj: "2028-02-29", attendu: { statut: "a_venir", date: "2028-06-04" } },
  { nom: "déclaration zone 1 oubliée", type: "declaration-revenus", variante: "zone1", auj: "2026-06-10", creeLe: "2026-05-01", attendu: { statut: "en_retard", date: "2026-06-10", theorique: "2026-05-21", suivante: "2027-05-21" } },
  { nom: "taxe foncière en ligne", type: "taxe-fonciere", variante: "en-ligne", auj: "2024-02-29", attendu: { statut: "a_venir", date: "2024-10-20" } },
  { nom: "taxe foncière non payée", type: "taxe-fonciere", variante: "autre", auj: "2026-10-25", creeLe: "2025-01-01", derniere: { echeance: "2025-10-15", faitLe: "2025-10-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-10-15" } },
  { nom: "contestation : avis du 29 février + 45 jours", type: "amende-contestation", auj: "2024-03-01", dates: { date_avis: "2024-02-29" }, attendu: { statut: "a_venir", date: "2024-04-14" } },
  { nom: "contestation trop tard", type: "amende-contestation", auj: "2026-10-25", dates: { date_avis: "2026-09-01" }, attendu: { statut: "depasse", date: "2026-10-16" } },
  { nom: "amende minorée bissextile", type: "amende-minoree", auj: "2024-02-15", dates: { date_avis: "2024-02-14" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "amende minorée trop tard", type: "amende-minoree", auj: "2026-10-25", dates: { date_avis: "2026-10-01" }, attendu: { statut: "depasse", date: "2026-10-16" } },

  // — Logement —
  { nom: "DPE bissextile", type: "dpe", auj: "2025-06-01", dates: { date_realisation: "2016-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "DPE périmé", type: "dpe", auj: "2026-10-25", dates: { date_realisation: "2014-06-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2024-06-01" } },
  { nom: "électricité location bissextile", type: "diagnostic-electricite", variante: "location", auj: "2025-01-01", dates: { date_realisation: "2020-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "électricité vente périmé", type: "diagnostic-electricite", variante: "vente", auj: "2026-10-25", dates: { date_realisation: "2022-01-10" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-01-10" } },
  { nom: "gaz vente bissextile", type: "diagnostic-gaz", variante: "vente", auj: "2025-01-01", dates: { date_realisation: "2024-02-29" }, attendu: { statut: "a_venir", date: "2027-02-28" } },
  { nom: "gaz location périmé", type: "diagnostic-gaz", variante: "location", auj: "2026-10-25", dates: { date_realisation: "2019-03-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-03-01" } },
  { nom: "chaudière entretenue un 29 février", type: "chaudiere", auj: "2024-06-01", dates: { dernier_entretien: "2024-02-29" }, attendu: { statut: "a_venir", date: "2025-02-28" } },
  { nom: "chaudière en retard", type: "chaudiere", auj: "2026-10-25", dates: { dernier_entretien: "2025-04-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-04-01", suivante: "2027-10-25" } },
  { nom: "chaudière : date inconnue → maintenant", type: "chaudiere", auj: "2026-10-25", attendu: { statut: "a_venir", date: "2026-10-25" } },
  { nom: "pompe à chaleur bissextile", type: "pompe-a-chaleur", auj: "2025-01-01", dates: { dernier_entretien: "2024-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "pompe à chaleur en retard", type: "pompe-a-chaleur", auj: "2026-10-25", dates: { dernier_entretien: "2023-01-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-01-01" } },
  { nom: "ramonage deux fois par an vers le 29 février", type: "ramonage", variante: "deux-fois", auj: "2023-09-01", dates: { dernier_ramonage: "2023-08-31" }, attendu: { statut: "a_venir", date: "2024-02-29", suivante: "2024-08-29" } },
  { nom: "ramonage annuel en retard", type: "ramonage", variante: "une-fois", auj: "2026-10-25", dates: { dernier_ramonage: "2025-01-15" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-01-15" } },
  { nom: "préavis 3 mois jusqu'au 29 février", type: "preavis-locataire", variante: "vide", auj: "2023-12-01", dates: { date_reception: "2023-11-29" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "préavis meublé terminé", type: "preavis-locataire", variante: "meuble", auj: "2026-10-25", dates: { date_reception: "2026-09-10" }, attendu: { statut: "depasse", date: "2026-10-10" } },
  { nom: "congé bailleur : 6 mois avant le 29 août 2024", type: "conge-bailleur", variante: "vide", auj: "2024-01-01", dates: { fin_bail: "2024-08-29" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "congé bailleur meublé trop tard (31/12 − 3 mois = 30/09)", type: "conge-bailleur", variante: "meuble", auj: "2026-10-25", dates: { fin_bail: "2026-12-31" }, attendu: { statut: "depasse", date: "2026-09-30" } },
  { nom: "assurance habitation souscrite un 29 février", type: "assurance-habitation", auj: "2024-01-10", dates: { date_souscription: "2020-02-29" }, attendu: { statut: "a_venir", date: "2024-02-29", suivante: "2025-02-28" } },
  { nom: "assurance habitation : 1er anniversaire", type: "assurance-habitation", auj: "2026-10-25", dates: { date_souscription: "2025-11-15" }, attendu: { statut: "a_venir", date: "2026-11-15" } },
  { nom: "attestation locataire : entrée un 29 février", type: "attestation-assurance-locataire", auj: "2024-02-28", dates: { date_entree: "2020-02-29" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "attestation : entrée future = première échéance", type: "attestation-assurance-locataire", auj: "2026-10-25", dates: { date_entree: "2027-01-01" }, attendu: { statut: "a_venir", date: "2027-01-01" } },

  // — Contrats —
  { nom: "loi Hamon : contrat du 29 février", type: "hamon-premiere-annee", auj: "2024-06-01", dates: { date_souscription: "2024-02-29" }, attendu: { statut: "a_venir", date: "2025-02-28" } },
  { nom: "loi Hamon : première année passée", type: "hamon-premiere-annee", auj: "2026-10-25", dates: { date_souscription: "2025-01-01" }, attendu: { statut: "depasse", date: "2026-01-01" } },
  { nom: "loi Chatel : préavis 30 j avant le 30 mars 2024 = 29 février", type: "contrat-tacite", auj: "2023-06-01", dates: { date_souscription: "2023-03-30" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "loi Chatel : date limite manquée → année suivante", type: "contrat-tacite", auj: "2026-10-25", dates: { date_souscription: "2020-12-15" }, parametres: { preavis_jours: 60 }, attendu: { statut: "a_venir", date: "2027-10-16" } },
  { nom: "mutuelle bissextile", type: "mutuelle", auj: "2024-03-01", dates: { date_souscription: "2024-02-29" }, attendu: { statut: "a_venir", date: "2025-02-28" } },
  { nom: "mutuelle ancienne", type: "mutuelle", auj: "2026-10-25", dates: { date_souscription: "2021-01-01" }, attendu: { statut: "a_venir", date: "2027-01-01" } },
  { nom: "rétractation : 14 jours sur le 29 février", type: "retractation", auj: "2024-02-16", dates: { date_depart: "2024-02-15" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "rétractation expirée", type: "retractation", auj: "2026-10-25", dates: { date_depart: "2026-10-01" }, attendu: { statut: "depasse", date: "2026-10-15" } },
  { nom: "garantie bissextile", type: "garantie-conformite", auj: "2025-01-01", dates: { date_livraison: "2024-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "garantie expirée", type: "garantie-conformite", auj: "2026-10-25", dates: { date_livraison: "2024-01-01" }, attendu: { statut: "depasse", date: "2026-01-01" } },

  // — Santé, travail, social —
  { nom: "DTP : né un 29 février", type: "rappel-dtp", auj: "2020-01-01", dates: { date_naissance: "2000-02-29" }, attendu: { statut: "a_venir", date: "2025-02-28", suivante: "2045-02-28" } },
  { nom: "DTP : rappel des 45 ans manqué", type: "rappel-dtp", auj: "2026-10-25", dates: { date_naissance: "1980-05-10" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-05-10" } },
  { nom: "DTP : rappel des 45 ans fait en retard → 65 ans", type: "rappel-dtp", auj: "2026-10-25", dates: { date_naissance: "1980-05-10", dernier_rappel: "2026-01-01" }, attendu: { statut: "a_venir", date: "2045-05-10" } },
  { nom: "colorectal bissextile", type: "depistage-colorectal", auj: "2025-01-01", dates: { dernier_test: "2024-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "colorectal jamais fait, ajouté il y a 3 semaines", type: "depistage-colorectal", auj: "2026-10-25", creeLe: "2026-10-01", attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-10-01" } },
  { nom: "sein bissextile", type: "depistage-sein", auj: "2025-01-01", dates: { dernier_examen: "2024-02-29" }, attendu: { statut: "a_venir", date: "2026-02-28" } },
  { nom: "sein en retard", type: "depistage-sein", auj: "2026-10-25", dates: { dernier_examen: "2023-06-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-06-01" } },
  { nom: "col 30-65 bissextile", type: "depistage-col", variante: "30-65", auj: "2025-01-01", dates: { dernier_examen: "2024-02-29" }, attendu: { statut: "a_venir", date: "2029-02-28" } },
  { nom: "col 25-29 en retard", type: "depistage-col", variante: "25-29", auj: "2026-10-25", dates: { dernier_examen: "2022-01-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-01-01" } },
  { nom: "visite médicale bissextile", type: "visite-medicale-travail", variante: "general", auj: "2024-06-01", dates: { derniere_visite: "2020-02-29" }, attendu: { statut: "a_venir", date: "2025-02-28" } },
  { nom: "visite médicale 3 ans en retard", type: "visite-medicale-travail", variante: "adapte", auj: "2026-10-25", dates: { derniere_visite: "2022-05-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2025-05-01" } },
  { nom: "CSS : 10 mois jusqu'au 29 février", type: "css-renouvellement", auj: "2023-12-01", dates: { debut_droits: "2023-04-29" }, attendu: { statut: "a_venir", date: "2024-02-29" } },
  { nom: "CSS en retard", type: "css-renouvellement", auj: "2026-10-25", dates: { debut_droits: "2025-10-01" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-08-01" } },
  { nom: "déclaration trimestrielle au 29 février", type: "declaration-trimestrielle", auj: "2024-02-01", dates: { prochaine_declaration: "2024-02-29" }, attendu: { statut: "a_venir", date: "2024-02-29", suivante: "2024-05-29" } },
  { nom: "déclaration trimestrielle oubliée", type: "declaration-trimestrielle", auj: "2026-10-25", dates: { prochaine_declaration: "2026-07-15" }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-07-15" } },
  { nom: "libre annuelle au 29 février", type: "libre", auj: "2024-01-01", libre: { date: "2024-02-29", recurrenceMois: 12 }, attendu: { statut: "a_venir", date: "2024-02-29", suivante: "2025-02-28" } },
  { nom: "libre unique passée", type: "libre", auj: "2026-10-25", libre: { date: "2026-10-01", recurrenceMois: 0 }, attendu: { statut: "depasse", date: "2026-10-01" } },
  { nom: "libre mensuelle en retard", type: "libre", auj: "2026-10-25", libre: { date: "2026-09-01", recurrenceMois: 1 }, attendu: { statut: "en_retard", date: "2026-10-25", theorique: "2026-09-01", suivante: "2026-11-25" } },
];

function construire(c: Cas): Echeance {
  return {
    id: "test",
    typeId: c.type,
    varianteId: c.variante,
    dates: c.dates ?? {},
    parametres: c.parametres,
    derniere: c.derniere,
    libre: c.libre,
    creeLe: c.creeLe ?? c.auj,
  };
}

describe("règles du catalogue", () => {
  for (const c of CAS) {
    it(`${c.type} — ${c.nom}`, () => {
      const type = typeParId(c.type);
      expect(type, `type inconnu ${c.type}`).toBeDefined();
      const r = calculer(type!, construire(c), c.auj);
      expect(r.statut).toBe(c.attendu.statut);
      expect(r.date).toBe(c.attendu.date);
      if (c.attendu.theorique) expect(r.dateTheorique).toBe(c.attendu.theorique);
      if (c.attendu.suivante) expect(r.suivantes[0]).toBe(c.attendu.suivante);
    });
  }

  it("chaque type du catalogue a au moins 2 cas, dont un 29 février et un rattrapage/dépassement", () => {
    for (const t of catalogue.types) {
      const cas = CAS.filter((c) => c.type === t.id);
      expect(cas.length, t.id).toBeGreaterThanOrEqual(2);
      const bissextile = cas.some((c) =>
        [c.auj, c.creeLe, c.libre?.date, ...Object.values(c.dates ?? {}), c.attendu.date].some((d) => d?.endsWith("-02-29")),
      );
      expect(bissextile, `${t.id} : pas de cas bissextile`).toBe(true);
      const retardOuAnnuel = cas.some((c) => c.attendu.statut !== "a_venir" || c.derniere || c.attendu.date > c.auj);
      expect(retardOuAnnuel, t.id).toBe(true);
    }
  });

  it("chaque type à variantes est testé avec au moins une variante", () => {
    for (const t of catalogue.types.filter((x) => x.variantes?.length)) {
      expect(CAS.some((c) => c.type === t.id && c.variante), t.id).toBe(true);
    }
  });
});

describe("« c'est fait » recalcule la suivante", () => {
  const auj = "2025-10-10";
  it("CT en retard fait aujourd'hui → dans 2 ans", () => {
    const type = typeParId("ct-voiture")!;
    const e: Echeance = { id: "a", typeId: "ct-voiture", dates: { mise_en_circulation: "2019-04-10", dernier_controle: "2023-04-10" }, creeLe: auj };
    const fait = marquerFait(type, e, auj, auj);
    expect(fait.derniere).toEqual({ echeance: "2025-04-10", faitLe: auj });
    const r = calculer(type, fait, auj);
    expect(r).toMatchObject({ statut: "a_venir", date: "2027-10-10" });
  });

  it("CNI renouvelée → 10 ans à partir du renouvellement", () => {
    const type = typeParId("cni")!;
    const e: Echeance = { id: "b", typeId: "cni", varianteId: "format-carte", dates: { date_delivrance: "2015-10-01" }, creeLe: auj };
    const r = calculer(type, marquerFait(type, e, "2025-09-15", auj), auj);
    expect(r.date).toBe("2035-09-15");
  });

  it("ancienne CNI (15 ans) renouvelée → nouvelle carte au format carte, 10 ans", () => {
    const type = typeParId("cni")!;
    const e: Echeance = { id: "b2", typeId: "cni", varianteId: "ancien-majeur", dates: { date_delivrance: "2008-02-29" }, creeLe: auj };
    const fait = marquerFait(type, e, "2024-02-29", auj);
    expect(fait.varianteId).toBe("format-carte");
    expect(calculer(type, fait, auj).date).toBe("2034-02-28");
  });

  it("déclaration de revenus faite → l'année suivante", () => {
    const type = typeParId("declaration-revenus")!;
    const e: Echeance = { id: "c", typeId: "declaration-revenus", varianteId: "zone2", dates: {}, creeLe: "2026-03-01" };
    const r = calculer(type, marquerFait(type, e, "2026-05-10", "2026-05-10"), "2026-05-10");
    expect(r.date).toBe("2027-05-28");
  });

  it("assurance : l'échéance passe à l'année suivante", () => {
    const type = typeParId("assurance-habitation")!;
    const e: Echeance = { id: "d", typeId: "assurance-habitation", dates: { date_souscription: "2022-11-15" }, creeLe: auj };
    const r = calculer(type, marquerFait(type, e, auj, auj), auj);
    expect(r.date).toBe("2026-11-15");
  });

  it("une échéance ponctuelle faite est archivée", () => {
    const type = typeParId("retractation")!;
    const e: Echeance = { id: "e", typeId: "retractation", dates: { date_depart: "2025-10-05" }, creeLe: auj };
    const fait = marquerFait(type, e, auj, auj);
    expect(fait.archivee).toBe(true);
    expect(calculer(type, fait, auj).statut).toBe("termine");
  });

  it("champ obligatoire manquant → incomplet", () => {
    const type = typeParId("cni")!;
    expect(calculer(type, { id: "f", typeId: "cni", dates: {}, creeLe: auj }, auj).statut).toBe("incomplet");
  });
});
