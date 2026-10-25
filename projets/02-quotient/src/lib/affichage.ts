import { dateCourte, euros, lireDate } from "@vie-fr/fr-data";
import type { Intervalle } from "./types";

/** « 12,50 € » ou « entre 10,00 € et 15,00 € ». */
export function montant(i: Intervalle, arrondi = false): string {
  if (i.min === i.max) return euros(i.min, arrondi);
  return `entre ${euros(i.min, arrondi)} et ${euros(i.max, arrondi)}`;
}

/** « 2026-10-25 » → « 25/10/2026 ». */
export function dateFr(iso: string): string {
  const d = lireDate(iso);
  return d ? dateCourte(d) : iso;
}

export const nombreFr = (n: number, decimales = 2) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: decimales }).replace(/[  ]/g, " ");

export const pourcent = (taux: number) => `${nombreFr(taux * 100, 4)} %`;

/** Champ numérique saisi → nombre ≥ 0 (vide ou invalide → 0). */
export const lireEntree = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
