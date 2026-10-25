// Calcul des échéances à partir de la date du décès. Toutes les dates sont en UTC minuit.
import { dateLongue, estFerie, lireDate } from "@vie-fr/fr-data";
import type { Delai } from "./donnees";

const JOUR_MS = 86_400_000;

export const isoVersDate = (iso: string): Date | null => lireDate(iso);

export const dateVersIso = (d: Date): string => d.toISOString().slice(0, 10);

export const ajouterJours = (d: Date, n: number): Date => new Date(d.getTime() + n * JOUR_MS);

/** Ajoute n mois « de date à date » ; si le jour n'existe pas (31 → février), on prend le dernier jour du mois. */
export function ajouterMois(d: Date, n: number): Date {
  const a = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const dernierJour = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m, Math.min(d.getUTCDate(), dernierJour)));
}

/** Jour ouvrable : tout jour sauf le dimanche et les jours fériés. */
export const estOuvrable = (d: Date): boolean => d.getUTCDay() !== 0 && !estFerie(d);

/** Reporte une échéance qui tombe un dimanche ou un jour férié au premier jour ouvrable suivant. */
export function reporterSiNonOuvrable(d: Date): Date {
  let r = d;
  while (!estOuvrable(r)) r = ajouterJours(r, 1);
  return r;
}

export type Echeance = {
  /** null quand il n'y a pas de date précise (pas de délai, ou date publiée chaque année). */
  date: Date | null;
  /** Texte à afficher, ex. « 15 septembre 2026 » ou « printemps 2027 ». */
  libelle: string;
};

export function calculerEcheance(dateDeces: Date, d: Delai): Echeance {
  const depart =
    d.depart === "debut_mois" ? new Date(Date.UTC(dateDeces.getUTCFullYear(), dateDeces.getUTCMonth(), 1)) : dateDeces;
  const v = d.valeur ?? 0;
  let date: Date | null;
  switch (d.unite) {
    case "heures":
      date = ajouterJours(depart, Math.ceil(v / 24));
      break;
    case "jours":
      date = ajouterJours(depart, v);
      break;
    case "mois":
      date = ajouterMois(depart, v);
      break;
    case "ans":
      date = ajouterMois(depart, 12 * v);
      break;
    case "printemps_n1":
      return { date: null, libelle: `au printemps ${dateDeces.getUTCFullYear() + 1}` };
    case "aucun":
      return { date: null, libelle: "pas de date limite" };
  }
  // « Dans les 2 ans à partir du 1er jour du mois » : le dernier jour utile est la veille de l'anniversaire.
  if (d.depart === "debut_mois") date = ajouterJours(date, -1);
  if (d.report) date = reporterSiNonOuvrable(date);
  return { date, libelle: dateLongue(date) };
}

/** Nombre de jours entre aujourd'hui et l'échéance (négatif si dépassée). */
export const joursRestants = (echeance: Date, aujourdhui: Date): number =>
  Math.round((echeance.getTime() - aujourdhui.getTime()) / JOUR_MS);

export function libelleRelatif(n: number): string {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n > 1) return `dans ${n} jours`;
  if (n === -1) return "date passée depuis hier";
  return `date passée depuis ${-n} jours`;
}

/** Aujourd'hui à minuit UTC (pour comparer des dates sans heure). */
export function aujourdhuiUtc(maintenant = new Date()): Date {
  return new Date(Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()));
}

export { dateLongue };
