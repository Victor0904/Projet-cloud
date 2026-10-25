import { baremes, n } from "../baremes";
import {
  adultes,
  confianceDe,
  enCouple,
  euros,
  nbEnfants,
  resultat,
  revenusActiviteFoyer,
  revenusAnnuelsNetsImposables,
  sourceZones,
  zoneApl,
} from "../outils";
import type { ResultatAide, Situation } from "../types";

const B = baremes.aides_logement;

export interface CalculAideLogement {
  montant: number;
  zone: 1 | 2 | 3;
  zoneEstimee: boolean;
  loyerPlafond: number;
  ressources: number;
  participation: number;
}

/** Personnes à charge au sens des aides au logement (enfants de moins de 21 ans). */
export const nbPacLogement = (s: Situation) => nbEnfants(s, 21);

/**
 * Barème simplifié des aides au logement en secteur locatif (formule CAF : loyer retenu + forfait
 * charges − participation personnelle), puis dégressivité pour loyer élevé et minoration forfaitaire.
 * Ne gère pas : logement-foyer, accession, meublé, RLS en HLM, abattements chômage, CRDS.
 */
export function calculerAideLogement(s: Situation): CalculAideLogement | null {
  const { statut, loyer, colocation, commune } = s.logement;
  if (statut !== "locataire" && statut !== "locataire_hlm") return null;
  if (loyer === null || loyer <= 0) return null;

  const couple = enCouple(s);
  const pac = nbPacLogement(s);
  const { zone, estimee } = zoneApl(commune?.codeInsee, commune?.codeDepartement);
  const plafonds = B.plafonds_loyer[`zone_${zone}`];

  let plafond =
    pac === 0
      ? couple
        ? n(plafonds.couples)
        : n(plafonds.personnes_seules)
      : n(plafonds.un_enfant) + (pac - 1) * n(plafonds.majoration_par_enf_supp);
  if (colocation) plafond = plafond * n(B.coef_colocation);
  plafond = Math.round(plafond * 100) / 100;

  const L = Math.min(loyer, plafond);
  const C = colocation && !couple && pac === 0
    ? n(B.charges_coloc_isole) + pac * n(B.charges_par_enfant)
    : n(B.charges_base) + pac * n(B.charges_par_enfant);

  // Ressources annuelles (12 derniers mois), après abattement de 10 %, arrondies à la centaine supérieure.
  let R = revenusAnnuelsNetsImposables(s);
  const d = s.demandeur;
  if (d.activite === "etudiant" && (d.age ?? 99) < n(B.age_max_etudiant) && revenusActiviteFoyer(s) * 12 < n(B.forfait_etudiant)) {
    R = n(B.forfait_etudiant) - (s.complements.boursier ? n(B.minoration_etudiant_boursier) : 0);
  }
  R = Math.ceil(R / n(B.arrondi_ressources)) * n(B.arrondi_ressources);

  const r0 = B.r0;
  const R0 =
    pac === 0
      ? couple
        ? n(r0.taux_couple)
        : n(r0.taux_seul)
      : pac >= 6
        ? n(r0.taux6pac) + (pac - 6) * n(r0.taux_pac_supp)
        : n(r0[`taux${pac}pac` as "taux1pac"]);

  const tf = B.tf;
  const TF =
    pac === 0
      ? couple
        ? n(tf.couples_0_enfant)
        : n(tf.personnes_isolees)
      : pac >= 6
        ? n(tf.avec_6_enfants) + (pac - 6) * n(tf.maj_par_enf_supp)
        : n(tf[`avec_${pac}_enfant${pac > 1 ? "s" : ""}` as "avec_1_enfant"]);

  // Taux lié au loyer : rapport entre loyer retenu et loyer de référence (plafond zone 2).
  const z2 = B.plafonds_loyer.zone_2;
  const LR =
    pac === 0
      ? couple
        ? n(z2.couples)
        : n(z2.personnes_seules)
      : n(z2.un_enfant) + (pac - 1) * n(z2.majoration_par_enf_supp);
  const RL = Math.round((L / LR) * 10000) / 10000;
  const s1 = n(B.tl_seuil_1);
  const s2 = n(B.tl_seuil_2);
  const TL =
    RL >= s2 ? n(B.tl_taux_3) * (RL - s2) + n(B.tl_taux_2) * (s2 - s1) : Math.max(0, n(B.tl_taux_2) * (RL - s1));

  const P0 = Math.max(n(B.p0_taux) * (L + C), n(B.p0_forfait));
  const PP = P0 + (TF + TL) * Math.max(0, R - R0);

  let montant = Math.max(0, L + C - PP);

  // Dégressivité puis suppression si le loyer réel dépasse un multiple du plafond (sauf handicap).
  const deg = B.degressivite[`zone_${zone}`];
  const seuilDeg = plafond * n(deg.degressivite);
  const seuilSup = plafond * n(deg.suppression);
  if (!s.particulier.handicap && loyer > seuilDeg) {
    montant = loyer >= seuilSup ? 0 : montant * (1 - (loyer - seuilDeg) / (seuilSup - seuilDeg));
  }
  montant = Math.max(0, montant - n(B.minoration_forfaitaire));
  if (montant < n(B.seuil_versement)) montant = 0;
  // Montant versé net de CRDS.
  montant = montant * (1 - n(baremes.prelevements.crds));

  return { montant: Math.round(montant * 100) / 100, zone, zoneEstimee: estimee, loyerPlafond: plafond, ressources: R, participation: PP };
}

const valeursUtilisees = [
  B.abattement_frais_pro,
  baremes.prelevements.crds,
  baremes.prelevements.ratio_net_sur_brut,
  B.plafonds_loyer.zone_1.personnes_seules,
  B.r0.taux_seul,
  B.tf.personnes_isolees,
  B.p0_forfait,
  B.charges_base,
  B.minoration_forfaitaire,
];

export const regleAideLogement = (s: Situation): ResultatAide => {
  const base = {
    id: "aide-logement",
    nom: "Aide au logement (APL, ALF ou ALS)",
    organisme: "CAF ou MSA",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F12006",
    periodicite: "mensuel" as const,
    valeurs: valeursUtilisees,
    sourcesSup: [sourceZones],
  };
  const { statut, loyer } = s.logement;
  if (statut !== "locataire" && statut !== "locataire_hlm") {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication:
        statut === "proprietaire"
          ? "Les propriétaires n'ont en général plus droit à l'aide au logement, sauf certains prêts conventionnés anciens et en outre-mer. Ce simulateur ne couvre que les locataires."
          : "Une personne hébergée gratuitement ne paie pas de loyer : elle n'a pas droit à l'aide au logement. Si vous payez une participation, déclarez-vous locataire.",
    });
  }
  if (loyer === null || loyer <= 0) {
    return resultat({
      ...base,
      eligible: true,
      montantEstime: null,
      confiance: "a_verifier",
      questions: ["loyer"],
      explication: "Vous êtes locataire : vous avez peut-être droit à une aide au logement. Indiquez votre loyer hors charges pour obtenir une estimation.",
    });
  }
  const calc = calculerAideLogement(s)!;
  const nom =
    statut === "locataire_hlm"
      ? "Aide personnalisée au logement (APL)"
      : s.enfants.length > 0 || s.particulier.grossesse
        ? "Allocation de logement familiale (ALF ou APL)"
        : "Allocation de logement sociale (ALS ou APL)";
  const questions: ResultatAide["questions"] = [];
  if (!s.logement.commune) questions.push("commune");
  if (s.demandeur.activite === "etudiant" && s.complements.boursier === null) questions.push("boursier");

  if (calc.montant <= 0) {
    return resultat({
      ...base,
      nom,
      eligible: false,
      montantEstime: 0,
      confiance: confianceDe({ estime: calc.zoneEstimee }),
      questions,
      explication: `Avec ${euros(calc.ressources)} de ressources annuelles retenues, votre participation au loyer dépasse le loyer plafond de votre zone (zone ${calc.zone}). L'aide calculée est nulle ou inférieure au minimum versé.`,
    });
  }
  const etudiantForfait = s.demandeur.activite === "etudiant";
  return resultat({
    ...base,
    nom,
    eligible: true,
    montantEstime: calc.montant,
    confiance: confianceDe({ estime: calc.zoneEstimee || etudiantForfait, presSeuil: calc.montant < 50 }),
    questions,
    explication: `Votre loyer est retenu dans la limite de ${euros(calc.loyerPlafond)} (zone ${calc.zone}${calc.zoneEstimee ? ", estimée" : ""}), plus un forfait de charges, moins une participation calculée sur ${euros(calc.ressources)} de ressources annuelles du foyer. ${
      statut === "locataire_hlm"
        ? "En HLM, une réduction de loyer de solidarité baisse à la fois votre loyer et l'APL (non simulée ici)."
        : "Les petits montants sont sensibles aux arrondis et à vos revenus exacts des 12 derniers mois."
    }`,
  });
};

/** Nombre d'adultes du foyer ayant des revenus d'activité (utile pour d'autres règles). */
export const nbActifs = (s: Situation) => adultes(s).filter((a) => a.revenusActivite > 0).length;
