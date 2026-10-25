import type { Intervalle, Prestation, Tranche } from "./types";

/** Arrondi au centime le plus proche (3,985 → 3,99 malgré les imprécisions des nombres flottants). */
export const arrondiCentime = (x: number) => Math.round(Number((x * 100).toPrecision(12))) / 100;

/** Tranche qui contient la valeur (première tranche : 0 ≤ v ≤ a ; suivantes : de < v ≤ a). */
export function trouverTranche(tranches: Tranche[], valeur: number): Tranche | undefined {
  const v = Math.max(0, valeur);
  return tranches.find((t, i) => (i === 0 ? v >= t.de : v > t.de) && (t.a === null || v <= t.a));
}

function tarifBrut(t: Tranche, v: number, nbEnfantsFoyer: number): Intervalle {
  if (t.tarif !== undefined) return { min: t.tarif, max: t.tarif };
  if (t.tarifs_par_nb_enfants) {
    const liste = t.tarifs_par_nb_enfants;
    const x = liste[Math.min(Math.max(1, nbEnfantsFoyer), liste.length) - 1];
    return { min: x, max: x };
  }
  if (t.formule) {
    const d = v - t.formule.x0;
    const x = t.formule.coef.reduce((s, c, i) => s + c * d ** i, 0);
    return { min: x, max: x };
  }
  if (t.interpolation) {
    const [bas, haut] = t.interpolation;
    if (t.a === null || t.a === t.de) return { min: haut, max: haut };
    const r = Math.min(1, Math.max(0, (v - t.de) / (t.a - t.de)));
    const x = bas + (haut - bas) * r;
    return { min: x, max: x };
  }
  if (t.fourchette) return { min: t.fourchette[0], max: t.fourchette[1] };
  throw new Error("Tranche sans tarif");
}

/**
 * Tarif unitaire d'une prestation pour une valeur de quotient (ou de revenus),
 * arrondi au centime, borné par le plancher/plafond éventuel, et jamais négatif.
 * Renvoie null si la grille n'est pas disponible.
 */
export function tarifUnitaire(p: Prestation, valeur: number, nbEnfantsFoyer = 1): Intervalle | null {
  if (p.statut === "A_VERIFIER" || p.tranches.length === 0) return null;
  const t = trouverTranche(p.tranches, valeur);
  if (!t) return null;
  const brut = tarifBrut(t, Math.max(0, valeur), nbEnfantsFoyer);
  const borne = (x: number) => {
    let y = x;
    if (p.bornes?.min !== undefined) y = Math.max(p.bornes.min, y);
    if (p.bornes?.max !== undefined) y = Math.min(p.bornes.max, y);
    return Math.max(0, arrondiCentime(y));
  };
  return { min: borne(brut.min), max: borne(brut.max) };
}

/** Taux de réduction applicable à l'enfant de rang `rang` (1 = premier enfant). */
export function reductionFratrie(p: Prestation, rang: number): number {
  const applicables = (p.reductions_fratrie ?? []).filter((r) => rang >= r.a_partir_du_rang);
  return applicables.reduce((m, r) => Math.max(m, r.taux), 0);
}
