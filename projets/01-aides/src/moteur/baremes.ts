import baremesJson from "../../data/baremes-2026.json";

/** Une valeur de barème telle qu'elle est stockée dans data/baremes-2026.json. */
export interface Valeur<T = unknown> {
  valeur: T;
  date_effet: string;
  source: string;
  verifie_le: string;
  via?: string;
  note?: string;
  statut?: string;
}

export const baremes = baremesJson;

/** Lit la valeur numérique d'une entrée de barème. */
export const n = (v: Valeur<number>): number => v.valeur;
