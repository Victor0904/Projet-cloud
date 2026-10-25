// Lien de partage : adresse approximative (sans numéro) + saisie + résultat, encodés dans le #fragment.
// Le fragment n'est jamais envoyé au serveur par le navigateur.
import { decoderEtat, encoderEtat } from "@vie-fr/fr-data";
import type { EpoqueSaisie } from "./types";

export type EtatPartage = {
  v: 1;
  /** adresse approximative */
  a: string;
  /** code INSEE */
  c: string;
  /** id ville encadrée (vide si hors zone) */
  vi: string;
  /** secteur géographique */
  s: string;
  p: number;
  e: EpoqueSaisie;
  m: boolean;
  mai: boolean;
  sf: number;
  l: number;
  ch: number;
  co: number;
  d: string;
  /** résumé du verdict au moment du partage, pour affichage immédiat */
  r?: { plafond: number; depassement: number };
};

const EPOQUES: EpoqueSaisie[] = ["avant-1946", "1946-1970", "1971-1990", "1991-2005", "apres-2005", "inconnue"];

export const encoderPartage = (e: EtatPartage) => encoderEtat(e);

/** Décode et valide ; renvoie null pour un lien abîmé ou trafiqué. */
export function decoderPartage(s: string): EtatPartage | null {
  const e = decoderEtat<EtatPartage>(s);
  if (!e || e.v !== 1) return null;
  const nombres = [e.p, e.sf, e.l, e.ch, e.co];
  if (nombres.some((n) => typeof n !== "number" || !Number.isFinite(n) || n < 0)) return null;
  if (!EPOQUES.includes(e.e) || typeof e.a !== "string" || typeof e.c !== "string") return null;
  if (typeof e.d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.d)) return null;
  return e;
}
