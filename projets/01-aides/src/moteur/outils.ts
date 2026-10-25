import zonesJson from "../../data/zones-apl.json";
import { baremes, n, type Valeur } from "./baremes";
import type { Adulte, Confiance, ResultatAide, Situation, SourceRef } from "./types";

// ---------- Composition du foyer ----------

export const adultes = (s: Situation): Adulte[] => (s.conjoint ? [s.demandeur, s.conjoint] : [s.demandeur]);
export const enCouple = (s: Situation) => s.conjoint !== null;
export const nbEnfants = (s: Situation, ageMax = Infinity, ageMin = 0) =>
  s.enfants.filter((e) => e.age >= ageMin && e.age < ageMax).length;
export const nbPersonnes = (s: Situation) => adultes(s).length + s.enfants.length;

/** Enfants à charge au sens des prestations familiales (moins de 20 ans). */
export const nbEnfantsPF = (s: Situation) =>
  nbEnfants(s, n(baremes.prestations_familiales.age_limite_enfant));

// ---------- Revenus ----------

export const revenusActiviteFoyer = (s: Situation) =>
  adultes(s).reduce((t, a) => t + Math.max(0, a.revenusActivite || 0), 0);

export const revenusMensuelsFoyer = (s: Situation) => revenusActiviteFoyer(s) + Math.max(0, s.autresRevenus || 0);

/**
 * Passe d'un salaire net à un net imposable : on rajoute la CSG non déductible et la CRDS
 * (prélevées sur 98,25 % du brut), avec l'hypothèse net ≈ 78 % du brut.
 */
export function netImposable(net: number): number {
  const P = baremes.prelevements;
  const taux = (n(P.csg_imposable_activite) + n(P.crds)) * (1 - n(P.abattement_assiette_csg));
  return net * (1 + taux / n(P.ratio_net_sur_brut));
}

/** Revenus annuels imposables du foyer après l'abattement forfaitaire de 10 % (base des aides au logement). */
export function revenusAnnuelsNetsImposables(s: Situation): number {
  const abattement = n(baremes.aides_logement.abattement_frais_pro);
  const activite = adultes(s).reduce((t, a) => t + netImposable(Math.max(0, a.revenusActivite || 0)), 0);
  return (activite + Math.max(0, s.autresRevenus || 0)) * 12 * (1 - abattement);
}

/** Revenu fiscal de référence : celui saisi, sinon une estimation à partir des revenus mensuels. */
export function revenuFiscal(s: Situation): { montant: number; estime: boolean } {
  if (s.complements.rfr !== null && s.complements.rfr >= 0) return { montant: s.complements.rfr, estime: false };
  return { montant: Math.round(revenusAnnuelsNetsImposables(s)), estime: true };
}

// ---------- Zone APL ----------

const zone1 = new Set(zonesJson.communes_zone_1);
const zone2 = new Set(zonesJson.communes_zone_2);
const parDepartement = zonesJson.zone_majoritaire_par_departement as Record<string, number>;

export const sourceZones: SourceRef = {
  source: zonesJson.source,
  verifie_le: zonesJson.verifie_le,
  date_effet: zonesJson.date_effet,
  statut: zonesJson.statut,
};

/**
 * Zone APL (1, 2 ou 3) d'une commune. Les communes absentes des listes 1 et 2 sont en zone 3.
 * Sans code commune, on prend la zone la plus fréquente du département (`estimee`).
 * Limite : une commune nouvelle (créée après 2014) issue de communes de zone 1 ou 2 sera classée en zone 3.
 */
export function zoneApl(codeInsee: string | undefined, codeDepartement?: string): { zone: 1 | 2 | 3; estimee: boolean } {
  if (codeInsee && /^(\d{5}|2[AB]\d{3})$/.test(codeInsee)) {
    if (zone1.has(codeInsee)) return { zone: 1, estimee: false };
    if (zone2.has(codeInsee)) return { zone: 2, estimee: false };
    return { zone: 3, estimee: false };
  }
  const dep = codeDepartement;
  if (dep && parDepartement[dep]) return { zone: parDepartement[dep] as 1 | 2 | 3, estimee: true };
  return { zone: 2, estimee: true };
}

/** Code département déduit d'un code INSEE (gère l'outre-mer). */
export function departementDe(codeInsee: string): string {
  return codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
}

export const listeDepartements = Object.keys(parDepartement).sort();

// ---------- Construction des résultats ----------

export const arrondi = (x: number) => Math.round(x * 100) / 100;

/** Écart relatif à un seuil : sert à dégrader la confiance près d'un plafond. */
export const presDuSeuil = (valeur: number, seuil: number, marge = 0.08) =>
  seuil > 0 && Math.abs(valeur - seuil) / seuil < marge;

export function confianceDe(opts: { estime?: boolean; presSeuil?: boolean; manque?: boolean }): Confiance {
  if (opts.manque) return "a_verifier";
  if (opts.estime || opts.presSeuil) return "possible";
  return "probable";
}

export function resultat(
  base: Omit<ResultatAide, "sources" | "baremeAVerifier" | "questions"> & {
    valeurs: Valeur[];
    sourcesSup?: SourceRef[];
    questions?: ResultatAide["questions"];
  },
): ResultatAide {
  const { valeurs, sourcesSup = [], questions = [], ...reste } = base;
  const sources: SourceRef[] = [];
  const vues = new Set<string>();
  for (const v of valeurs) {
    const aVerifier = v.statut === "A_VERIFIER" || !v.source.startsWith("http");
    if (vues.has(v.source)) {
      if (aVerifier) sources.find((x) => x.source === v.source)!.statut = "A_VERIFIER";
      continue;
    }
    vues.add(v.source);
    sources.push({ source: v.source, verifie_le: v.verifie_le, date_effet: v.date_effet, ...(aVerifier ? { statut: "A_VERIFIER" } : {}) });
  }
  for (const sup of sourcesSup) if (!vues.has(sup.source)) sources.push(sup);
  return {
    ...reste,
    montantEstime: reste.montantEstime === null ? null : arrondi(reste.montantEstime),
    questions,
    sources,
    baremeAVerifier: sources.some((x) => x.statut === "A_VERIFIER"),
  };
}

export const euros = (x: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(Math.round(x))
    .replace(/[  ]/g, " ");
