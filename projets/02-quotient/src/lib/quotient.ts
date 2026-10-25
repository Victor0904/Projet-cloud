import regles from "../../data/quotient.json";
import type { BaseCalcul } from "./types";

export type Foyer = {
  /** Couple (2 parents) ou parent seul. */
  situation: "couple" | "seul";
  /** Enfants à charge vivant à temps plein dans le foyer. */
  enfants: number;
  /** Enfants en résidence alternée (en plus des précédents). */
  enfantsAlternes: number;
  /** Parmi tous les enfants, nombre bénéficiant de l'AEEH. */
  enfantsAeeh: number;
  /** Revenus annuels imposables du foyer retenus par la CAF (année N-2), avant abattement. */
  revenusAnnuels: number;
  /** Prestations familiales perçues chaque mois (allocations familiales, APL, AAH…). */
  prestationsMensuelles: number;
  /** Revenu fiscal de référence ; si absent, on prend `revenusAnnuels`. */
  revenuFiscalReference?: number;
  /** QF CAF connu (attestation) : remplace le calcul. */
  qfConnu?: number;
};

export type DetailParts = { libelle: string; parts: number }[];

const P = regles.parts;
const PF = regles.parts_fiscales;

export const nbEnfantsTotal = (f: Foyer) => f.enfants + f.enfantsAlternes;

/**
 * Parts CAF : 2 pour le ou les parents, 0,5 pour chacun des deux premiers enfants,
 * 1 pour le troisième, 0,5 pour les suivants, + 0,5 par enfant bénéficiaire de l'AEEH.
 * Hypothèse (A_VERIFIER) : un enfant en résidence alternée compte comme un enfant à charge.
 */
export function partsCaf(f: Foyer): { total: number; detail: DetailParts } {
  const detail: DetailParts = [
    { libelle: f.situation === "couple" ? "Les deux parents" : "Le parent (personne seule)", parts: P.parents },
  ];
  const n = nbEnfantsTotal(f);
  for (let i = 1; i <= n; i++) {
    const parts = i <= 2 ? P.enfant_1 : i === 3 ? P.enfant_3 : P.enfant_suivant;
    const alterne = i > f.enfants ? " (résidence alternée)" : "";
    detail.push({ libelle: `${i}${i === 1 ? "er" : "e"} enfant${alterne}`, parts });
  }
  const aeeh = Math.min(f.enfantsAeeh, n);
  if (aeeh > 0) detail.push({ libelle: `Enfant${aeeh > 1 ? "s" : ""} bénéficiaire${aeeh > 1 ? "s" : ""} de l'AEEH`, parts: aeeh * P.majoration_aeeh });
  return { total: detail.reduce((s, d) => s + d.parts, 0), detail };
}

/** QF CAF = (revenus annuels / 12 + prestations familiales mensuelles) / nombre de parts, arrondi à l'euro inférieur. */
export function quotientCaf(f: Foyer): number {
  if (f.qfConnu !== undefined && f.qfConnu >= 0) return Math.floor(f.qfConnu);
  const { total } = partsCaf(f);
  const mensuel = Math.max(0, f.revenusAnnuels) / 12 + Math.max(0, f.prestationsMensuelles);
  return Math.floor(mensuel / total);
}

/** Parts fiscales (approximation) : 2 pour un couple, 1 pour une personne seule (+0,5 si parent isolé). */
export function partsFiscales(f: Foyer): number {
  let parts = f.situation === "couple" ? PF.couple : PF.personne_seule;
  const n = nbEnfantsTotal(f);
  if (f.situation === "seul" && n > 0) parts += PF.parent_isole;
  for (let i = 1; i <= n; i++) {
    const base = i <= 2 ? PF.enfant_1 : PF.enfant_suivant;
    parts += i > f.enfants ? base * PF.residence_alternee_coefficient : base;
  }
  return parts;
}

const rfr = (f: Foyer) => Math.max(0, f.revenuFiscalReference ?? f.revenusAnnuels);

/** Quotient « fiscal » = revenu fiscal de référence / 12 / parts fiscales. */
export const quotientFiscal = (f: Foyer) => Math.floor(rfr(f) / 12 / partsFiscales(f));

/** Valeur à comparer aux tranches d'une commune, selon sa base de calcul. */
export function valeurPourBase(base: BaseCalcul, f: Foyer): number {
  switch (base) {
    case "qf_caf":
      return quotientCaf(f);
    case "qf_fiscal":
    case "qf_municipal":
      return quotientFiscal(f);
    case "revenus_mensuels":
      return Math.floor(rfr(f) / 12);
  }
}

export const LIBELLES_BASE: Record<BaseCalcul, string> = {
  qf_caf: "Quotient familial CAF",
  qf_fiscal: "Quotient calculé par la commune sur l'avis d'imposition (approché)",
  qf_municipal: "Quotient familial municipal (approché)",
  revenus_mensuels: "Revenus mensuels (revenu fiscal de référence / 12)",
};

export const SOURCE_QF = { source: regles.source, verifie_le: regles.verifie_le };
