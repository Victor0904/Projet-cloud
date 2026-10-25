// Crèche (barème national PSU) et assistante maternelle (CMG), crédit d'impôt.
import assmat from "../../data/assmat-departements.json";
import cmg from "../../data/cmg.json";
import credit from "../../data/credit-impot.json";
import psu from "../../data/psu.json";
import { arrondiCentime } from "./tarif";

export type BesoinGarde = {
  /** Heures de garde par semaine. */
  heuresParSemaine: number;
  /** Semaines de garde dans l'année (hors congés). */
  semainesParAn: number;
  /** Enfants à charge au sens des prestations familiales. */
  enfantsACharge: number;
  /** Un enfant du foyer bénéficie de l'AEEH. */
  handicap: boolean;
  /** Ressources annuelles N-2 du foyer (avant abattement). */
  ressourcesAnnuelles: number;
};

const tauxPour = (table: Record<string, number>, enfants: number) => {
  const n = Math.min(Math.max(1, enfants), 8);
  return table[String(n)];
};

/** Ressources mensuelles retenues, bornées par le plancher et le plafond. */
export function ressourcesRetenues(annuelles: number, plancher: number, plafond: number) {
  return Math.min(plafond, Math.max(plancher, Math.max(0, annuelles) / 12));
}

export const heuresMensuelles = (b: BesoinGarde) => (b.heuresParSemaine * b.semainesParAn) / 12;

export type ResultatCreche = {
  ressourcesMensuelles: number;
  tauxEffort: number;
  tarifHoraire: number;
  heuresMensuelles: number;
  coutMensuel: number;
  coutAnnuel: number;
};

/** Tarif d'une crèche conventionnée CAF : ressources mensuelles x taux d'effort (accueil collectif). */
export function coutCrechePsu(b: BesoinGarde): ResultatCreche {
  const r = ressourcesRetenues(b.ressourcesAnnuelles, psu.plancher_mensuel, psu.plafond_mensuel);
  const taux = tauxPour(psu.taux_effort_collectif, b.enfantsACharge + (b.handicap ? 1 : 0));
  const tarifHoraire = arrondiCentime(r * taux);
  const h = heuresMensuelles(b);
  const coutMensuel = arrondiCentime(tarifHoraire * h);
  return { ressourcesMensuelles: arrondiCentime(r), tauxEffort: taux, tarifHoraire, heuresMensuelles: arrondiCentime(h), coutMensuel, coutAnnuel: arrondiCentime(coutMensuel * 12) };
}

export type ResultatAssmat = {
  tarifHoraire: number;
  heuresMensuelles: number;
  coutMensuel: number;
  cmgMensuel: number;
  resteMensuel: number;
  resteAnnuel: number;
  depassementPlafond: boolean;
};

/**
 * Assistante maternelle en emploi direct, CMG réformé (depuis septembre 2025) :
 * CMG = coût pris en compte x (1 - ressources x taux d'effort / coût horaire de référence),
 * le coût pris en compte étant plafonné par heure.
 */
export function coutAssistanteMaternelle(
  b: BesoinGarde,
  tarifHoraire: number,
  params: { coutReference: number; plafondHoraire: number } = { coutReference: cmg.cout_horaire_reference, plafondHoraire: cmg.plafond_horaire },
): ResultatAssmat {
  const h = heuresMensuelles(b);
  const coutMensuel = tarifHoraire * h;
  const r = ressourcesRetenues(b.ressourcesAnnuelles, cmg.plancher_ressources_mensuelles, cmg.plafond_ressources_mensuelles);
  const taux = tauxPour(psu.taux_effort_collectif, b.enfantsACharge + (b.handicap ? 1 : 0));
  const prisEnCompte = Math.min(tarifHoraire, params.plafondHoraire) * h;
  const part = Math.min(1, (r * taux) / params.coutReference);
  const cmgMensuel = Math.max(0, prisEnCompte * (1 - part));
  const reste = coutMensuel - cmgMensuel;
  return {
    tarifHoraire,
    heuresMensuelles: arrondiCentime(h),
    coutMensuel: arrondiCentime(coutMensuel),
    cmgMensuel: arrondiCentime(cmgMensuel),
    resteMensuel: arrondiCentime(reste),
    resteAnnuel: arrondiCentime(reste * 12),
    depassementPlafond: tarifHoraire > params.plafondHoraire,
  };
}

/** Crédit d'impôt : 50 % des frais restant à charge, dans la limite du plafond par enfant (divisé par 2 en garde alternée). */
export function creditImpot(resteAnnuel: number, gardeAlternee = false): number {
  const plafond = credit.plafond_depenses_par_enfant / (gardeAlternee ? 2 : 1);
  return arrondiCentime(Math.min(Math.max(0, resteAnnuel), plafond) * credit.taux);
}

export const tarifAssmatDepartement = (dep: string): { tarif: number; nom: string | null } => {
  const d = (assmat.departements as Record<string, { nom: string; tarif_horaire: number }>)[dep];
  return d ? { tarif: d.tarif_horaire, nom: d.nom } : { tarif: assmat.national, nom: null };
};

export const SOURCES_GARDE = {
  psu: { source: psu.source, verifie_le: psu.verifie_le },
  cmg: { source: cmg.source, verifie_le: cmg.verifie_le, ref: cmg.cout_horaire_reference_source },
  assmat: { source: assmat.source, verifie_le: assmat.verifie_le },
  credit: { source: credit.source, verifie_le: credit.verifie_le },
};

export const PARAMS_GARDE = {
  plancherPsu: psu.plancher_mensuel,
  plafondPsu: psu.plafond_mensuel,
  refCmg: cmg.cout_horaire_reference,
  plafondCmg: cmg.plafond_horaire,
  tauxCredit: credit.taux,
  plafondCredit: credit.plafond_depenses_par_enfant,
};
