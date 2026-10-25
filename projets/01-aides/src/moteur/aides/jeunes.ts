import { baremes, n } from "../baremes";
import { confianceDe, euros, presDuSeuil, resultat } from "../outils";
import type { ResultatAide, Situation } from "../types";
import { calculerAideLogement } from "./logement";

const BO = baremes.bourse_superieur;
const MJ = baremes.mobili_jeune;

// ---------- Bourse sur critères sociaux ----------

const ECHELONS = ["7", "6", "5", "4", "3", "2", "1", "0bis"] as const;
type Echelon = (typeof ECHELONS)[number];

export function pointsDeCharge(nbFreresSoeurs: number, distanceKm: number): number {
  const pDist = BO.points_distance.valeur.reduce((p, [km, pts]) => (distanceKm >= km ? pts : p), 0);
  return Math.min(17, Math.max(0, nbFreresSoeurs) * n(BO.points_par_enfant_a_charge) + pDist);
}

/** Échelon de bourse (le plus favorable) pour un revenu brut global des parents et des points de charge. */
export function echelonBourse(revenuParents: number, points: number): Echelon | null {
  const p = Math.min(17, Math.max(0, Math.round(points)));
  for (const e of ECHELONS) {
    if (revenuParents <= BO.plafonds_par_echelon.valeur[e][p]) return e;
  }
  return null;
}

export const regleBourse = (s: Situation): ResultatAide => {
  const valeurs = [BO.plafonds_par_echelon, BO.montants_mensuels, BO.points_distance, BO.age_maximum];
  const base = {
    id: "bourse-superieur",
    nom: "Bourse sur critères sociaux (études supérieures)",
    organisme: "CROUS",
    lien: "https://www.messervices.etudiant.gouv.fr",
    periodicite: "annuel" as const,
    valeurs,
  };
  const d = s.demandeur;
  if (d.activite !== "etudiant") {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: "La bourse sur critères sociaux concerne les étudiants en formation initiale dans le supérieur. Si un de vos enfants fait des études, il peut faire sa propre simulation.",
    });
  }
  if ((d.age ?? 0) >= n(BO.age_maximum)) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "possible",
      explication: `Il faut en principe avoir moins de ${n(BO.age_maximum)} ans lors de la première demande. Des dérogations existent (handicap, enfant à charge, service civique…).`,
    });
  }
  const { rfrParents, nbFreresSoeurs, distanceEtudesKm } = s.complements;
  if (rfrParents === null) {
    return resultat({
      ...base,
      eligible: true,
      montantEstime: null,
      confiance: "a_verifier",
      questions: ["rfrParents", "nbFreresSoeurs", "distanceEtudesKm"],
      explication: "La bourse dépend des revenus de vos parents (revenu brut global de l'avant-dernier avis d'impôt), du nombre d'enfants à leur charge et de la distance avec votre lieu d'études. Indiquez ces informations pour connaître votre échelon.",
    });
  }
  const points = pointsDeCharge(nbFreresSoeurs ?? 0, distanceEtudesKm ?? 0);
  const echelon = echelonBourse(rfrParents, points);
  const manque = nbFreresSoeurs === null || distanceEtudesKm === null;
  if (echelon === null) {
    const plafondMax = BO.plafonds_par_echelon.valeur["0bis"][points];
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: confianceDe({ estime: manque, presSeuil: presDuSeuil(rfrParents, plafondMax) }),
      questions: manque ? ["nbFreresSoeurs", "distanceEtudesKm"] : [],
      explication: `Avec ${points} point(s) de charge, le plafond de revenus des parents est de ${euros(plafondMax)}. Les revenus indiqués le dépassent : pas de bourse sur critères sociaux, mais d'autres aides du CROUS existent (aide ponctuelle, repas à 1 €).`,
    });
  }
  const mensuel = BO.montants_mensuels.valeur[echelon];
  return resultat({
    ...base,
    eligible: true,
    montantEstime: mensuel * n(BO.nombre_mensualites),
    confiance: confianceDe({ estime: manque }),
    questions: manque ? ["nbFreresSoeurs", "distanceEtudesKm"] : [],
    explication: `Vous seriez à l'échelon ${echelon}, soit environ ${euros(mensuel)} par mois sur ${n(BO.nombre_mensualites)} mois, et l'exonération des frais d'inscription. La demande se fait chaque printemps via le dossier social étudiant.`,
  });
};

// ---------- Mobili-Jeune (Action Logement) ----------

export const regleMobiliJeune = (s: Situation): ResultatAide => {
  const valeurs = [MJ.age_maximum_exclu, MJ.montant_minimum, MJ.montant_maximum, MJ.plafond_salaire_pct_smic, baremes.smic.mensuel_brut];
  const base = {
    id: "mobili-jeune",
    nom: "Aide Mobili-Jeune",
    organisme: "Action Logement",
    lien: "https://www.actionlogement.fr/l-aide-mobili-jeune",
    periodicite: "mensuel" as const,
    valeurs,
  };
  const d = s.demandeur;
  const enAlternance = s.particulier.alternance || s.particulier.apprentissage;
  const locataire = s.logement.statut === "locataire" || s.logement.statut === "locataire_hlm";
  if (!enAlternance || (d.age ?? 99) >= n(MJ.age_maximum_exclu) || !locataire) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: `Mobili-Jeune aide les moins de ${n(MJ.age_maximum_exclu)} ans en apprentissage ou en contrat de professionnalisation à payer leur loyer. Il faut être locataire et avoir un salaire au plus égal au Smic.`,
    });
  }
  const plafondSalaire = n(baremes.smic.mensuel_brut) * n(MJ.plafond_salaire_pct_smic);
  if (d.revenusActivite > plafondSalaire) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: "possible",
      explication: `Le salaire doit être au plus égal au Smic (${euros(plafondSalaire)} brut par mois). Votre salaire indiqué le dépasse.`,
    });
  }
  const loyer = s.logement.loyer;
  if (loyer === null) {
    return resultat({
      ...base,
      eligible: true,
      montantEstime: null,
      confiance: "a_verifier",
      questions: ["loyer"],
      explication: `Vous remplissez les conditions principales de Mobili-Jeune (de ${euros(n(MJ.montant_minimum))} à ${euros(n(MJ.montant_maximum))} par mois). Indiquez votre loyer pour estimer le montant.`,
    });
  }
  const apl = calculerAideLogement(s)?.montant ?? 0;
  const reste = loyer - apl;
  const montant = Math.min(n(MJ.montant_maximum), reste);
  if (montant < n(MJ.montant_minimum)) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: "possible",
      explication: "Mobili-Jeune couvre une partie du loyer restant après l'aide au logement. Dans votre cas, il ne reste presque rien à payer, l'aide serait nulle.",
    });
  }
  return resultat({
    ...base,
    eligible: true,
    montantEstime: montant,
    // Salaire comparé en net au Smic brut : estimation prudente.
    confiance: "possible",
    explication: "Action Logement prend en charge une partie du loyer restant après l'aide au logement, pendant votre formation (jusqu'à 1 an). La demande doit être faite au plus tard 6 mois après le début du contrat.",
  });
};
