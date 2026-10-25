// Dates manipulées en chaînes ISO « AAAA-MM-JJ » (jour civil, sans fuseau) : pas de surprise d'heure d'été.
import { estFerie, joursFeries } from "@vie-fr/fr-data";

export type Iso = string;

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function estIso(s: unknown): s is Iso {
  if (typeof s !== "string") return false;
  const m = s.match(RE_ISO);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function versDate(iso: Iso): Date {
  const m = iso.match(RE_ISO);
  if (!m) throw new Error(`Date invalide : ${iso}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

export const versIso = (d: Date): Iso => d.toISOString().slice(0, 10);

/** Date du jour dans le fuseau du navigateur. */
export function aujourdhui(): Iso {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function joursDansMois(annee: number, mois1a12: number): number {
  return new Date(Date.UTC(annee, mois1a12, 0)).getUTCDate();
}

/**
 * Ajoute n mois (n peut être négatif). Si le jour n'existe pas dans le mois d'arrivée
 * (29 février d'une année non bissextile, 31 avril…), on prend le dernier jour du mois.
 */
export function ajouterMois(iso: Iso, n: number): Iso {
  const d = versDate(iso);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const annee = Math.floor(total / 12);
  const mois0 = total - annee * 12;
  const jour = Math.min(d.getUTCDate(), joursDansMois(annee, mois0 + 1));
  return versIso(new Date(Date.UTC(annee, mois0, jour)));
}

export function ajouterJours(iso: Iso, n: number): Iso {
  return versIso(new Date(versDate(iso).getTime() + n * 86_400_000));
}

export function finDeMois(iso: Iso): Iso {
  const d = versDate(iso);
  return versIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** Nombre de jours de a vers b (positif si b est après a). */
export function ecartJours(a: Iso, b: Iso): number {
  return Math.round((versDate(b).getTime() - versDate(a).getTime()) / 86_400_000);
}

/** Date d'une année donnée pour un mois/jour, ramenée au dernier jour du mois si besoin (29/02). */
export function dateDansAnnee(annee: number, mois1a12: number, jour: number): Iso {
  const j = Math.min(jour, joursDansMois(annee, mois1a12));
  return versIso(new Date(Date.UTC(annee, mois1a12 - 1, j)));
}

export const annee = (iso: Iso) => +iso.slice(0, 4);

/** Signale si une date tombe un samedi, un dimanche ou un jour férié (pour conseiller d'agir avant). */
export function alerteJourNonOuvre(iso: Iso, alsaceMoselle = false): string | null {
  const d = versDate(iso);
  if (estFerie(d, alsaceMoselle)) {
    const f = joursFeries(d.getUTCFullYear(), alsaceMoselle).find((x) => versIso(x.date) === iso);
    return `jour férié (${f?.nom ?? "férié"})`;
  }
  const j = d.getUTCDay();
  if (j === 0) return "dimanche";
  if (j === 6) return "samedi";
  return null;
}

const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const libelleMois = (iso: Iso) => fmtMois.format(versDate(iso));
export const dateAvecJour = (iso: Iso) => fmtLong.format(versDate(iso));
export const dateMoyenne = (iso: Iso) => fmtCourt.format(versDate(iso));

/** « dans 12 jours », « aujourd'hui », « il y a 3 jours ». */
export function relatif(depuis: Iso, vers: Iso): string {
  const n = ecartJours(depuis, vers);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  const abs = Math.abs(n);
  const txt =
    abs >= 730 ? `${Math.round(abs / 365.25)} ans` : abs >= 60 ? `${Math.round(abs / 30.44)} mois` : `${abs} jours`;
  return n > 0 ? `dans ${txt}` : `il y a ${txt}`;
}
