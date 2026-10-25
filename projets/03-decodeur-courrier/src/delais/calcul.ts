import { ajouterJoursOuvres, dateLongue, estFerie, estOuvre, joursFeries } from "@vie-fr/fr-data";
import type { Mode, Unite } from "@/donnees/types";

// Calcul des délais. Règles de décompte (code de procédure civile, art. 640 à 642) :
// - le jour de l'événement qui fait courir le délai ne compte pas ;
// - un délai en mois expire le jour du dernier mois qui porte le même numéro (ou le dernier jour du mois) ;
// - un délai qui expire un samedi, un dimanche ou un jour férié est prorogé au premier jour ouvrable suivant.
// Par prudence, l'outil affiche comme date limite la date AVANT report, et signale le report éventuel à part.

const JOUR = 86_400_000;
const plus = (d: Date, n: number) => new Date(d.getTime() + n * JOUR);
const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export const nomJour = (d: Date) => NOMS_JOURS[d.getUTCDay()];
export const libelleDate = (d: Date) => `${nomJour(d)} ${dateLongue(d)}`;

/** Date UTC minuit à partir d'une date locale (ex. « aujourd'hui »). */
export const aMinuitUTC = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

export function ajouterMois(d: Date, n: number): Date {
  const a = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const dernier = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m, Math.min(d.getUTCDate(), dernier)));
}

export type ParametresDelai = {
  depart: Date;
  duree: number;
  unite: Unite;
  mode?: Mode;
  alsaceMoselle?: boolean;
};

export type Calcul = {
  /** Date limite prudente (avant tout report de week-end ou de jour férié). */
  date: Date;
  /** Date après report légal éventuel (art. 642 CPC) ; égale à `date` si aucun report. */
  dateReportee: Date;
  etapes: string[];
};

function raisonNonOuvre(d: Date, alsaceMoselle: boolean): string {
  if (d.getUTCDay() === 0) return "un dimanche";
  if (d.getUTCDay() === 6) return "un samedi";
  const f = joursFeries(d.getUTCFullYear(), alsaceMoselle).find((x) => x.date.getTime() === d.getTime());
  return f ? `un jour férié (${f.nom})` : "un jour non ouvrable";
}

const pluriel = (n: number, s: string) => `${n} ${s}${n > 1 && !s.endsWith("s") ? "s" : ""}`;

export function calculerEcheance(p: ParametresDelai): Calcul {
  const am = p.alsaceMoselle ?? false;
  const mode = p.mode ?? "calendaire";
  const etapes: string[] = [`Point de départ : ${libelleDate(p.depart)}.`];
  let date: Date;

  if (p.unite === "fin_annee") {
    const annee = p.depart.getUTCFullYear() + p.duree;
    date = new Date(Date.UTC(annee, 11, 31));
    etapes.push(
      `Le délai court jusqu'au 31 décembre de la ${p.duree === 1 ? "1re" : `${p.duree}e`} année qui suit ${p.depart.getUTCFullYear()} : ${libelleDate(date)}.`,
    );
  } else if (mode === "ouvre") {
    const n = p.unite === "semaines" ? p.duree * 5 : p.duree;
    date = ajouterJoursOuvres(p.depart, n, am);
    const sautes: string[] = [];
    for (let d = plus(p.depart, 1); d <= date; d = plus(d, 1)) {
      if (estFerie(d, am)) sautes.push(`${dateLongue(d)} (férié)`);
    }
    etapes.push(
      `On compte ${pluriel(n, "jour ouvré")} : ni les samedis, ni les dimanches, ni les jours fériés.` +
        (sautes.length ? ` Jours fériés écartés : ${sautes.join(", ")}.` : ""),
    );
    etapes.push(`Dernier jour : ${libelleDate(date)}.`);
    return { date, dateReportee: date, etapes };
  } else if (p.unite === "mois") {
    date = ajouterMois(p.depart, p.duree);
    etapes.push(
      `${pluriel(p.duree, "mois")} plus tard, même numéro de jour (ou dernier jour du mois s'il n'existe pas) : ${libelleDate(date)}.`,
    );
  } else {
    const n = p.unite === "semaines" ? p.duree * 7 : p.duree;
    date = plus(p.depart, n);
    etapes.push(
      `Le jour de départ ne compte pas : on ajoute ${pluriel(n, "jour")} calendaires (week-ends et fériés compris) : ${libelleDate(date)}.`,
    );
  }

  if (mode === "franc" && p.unite !== "fin_annee") {
    date = plus(date, 1);
    etapes.push(`Délai « franc » : le dernier jour ne compte pas non plus, on va donc jusqu'au ${libelleDate(date)}.`);
  }

  let dateReportee = date;
  if (!estOuvre(date, am)) {
    while (!estOuvre(dateReportee, am)) dateReportee = plus(dateReportee, 1);
    etapes.push(
      `Cette date tombe ${raisonNonOuvre(date, am)} : le délai est en principe reporté au ${libelleDate(dateReportee)} (art. 642 du code de procédure civile). Par prudence, agissez avant le ${dateLongue(date)}.`,
    );
  }
  return { date, dateReportee, etapes };
}

/** Nombre de jours calendaires entre aujourd'hui et l'échéance (négatif si dépassée). */
export const joursRestants = (aujourdhui: Date, echeance: Date) =>
  Math.round((echeance.getTime() - aujourdhui.getTime()) / JOUR);
