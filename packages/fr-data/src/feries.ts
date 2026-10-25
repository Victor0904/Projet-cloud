// Jours fériés français (Code du travail, art. L3133-1), calculés. Dates en UTC minuit.

const jour = (a: number, m: number, j: number) => new Date(Date.UTC(a, m - 1, j));
const plus = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher, calendrier grégorien). */
export function paques(a: number): Date {
  const b = a % 19, c = Math.floor(a / 100), d = a % 100;
  const e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3);
  const i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4;
  const m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
  const x = i + m - 7 * n + 114;
  return jour(a, Math.floor(x / 31), (x % 31) + 1);
}

export type Ferie = { date: Date; nom: string };

/** Les 11 jours fériés nationaux, plus Vendredi saint et Saint-Étienne en Alsace-Moselle. */
export function joursFeries(a: number, alsaceMoselle = false): Ferie[] {
  const p = paques(a);
  const liste: Ferie[] = [
    { date: jour(a, 1, 1), nom: "Jour de l'an" },
    { date: plus(p, 1), nom: "Lundi de Pâques" },
    { date: jour(a, 5, 1), nom: "Fête du Travail" },
    { date: jour(a, 5, 8), nom: "Victoire 1945" },
    { date: plus(p, 39), nom: "Ascension" },
    { date: plus(p, 50), nom: "Lundi de Pentecôte" },
    { date: jour(a, 7, 14), nom: "Fête nationale" },
    { date: jour(a, 8, 15), nom: "Assomption" },
    { date: jour(a, 11, 1), nom: "Toussaint" },
    { date: jour(a, 11, 11), nom: "Armistice 1918" },
    { date: jour(a, 12, 25), nom: "Noël" },
  ];
  if (alsaceMoselle) {
    liste.push({ date: plus(p, -2), nom: "Vendredi saint" }, { date: jour(a, 12, 26), nom: "Saint-Étienne" });
  }
  return liste.sort((x, y) => x.date.getTime() - y.date.getTime());
}

const cle = (d: Date) => d.toISOString().slice(0, 10);

export const estFerie = (d: Date, alsaceMoselle = false) =>
  joursFeries(d.getUTCFullYear(), alsaceMoselle).some((f) => cle(f.date) === cle(d));

/** Jour ouvré : ni samedi, ni dimanche, ni férié. */
export const estOuvre = (d: Date, alsaceMoselle = false) =>
  d.getUTCDay() % 6 !== 0 && !estFerie(d, alsaceMoselle);

/** Ajoute n jours ouvrés (n ≥ 0). */
export function ajouterJoursOuvres(d: Date, n: number, alsaceMoselle = false): Date {
  let r = d;
  while (n > 0) {
    r = plus(r, 1);
    if (estOuvre(r, alsaceMoselle)) n--;
  }
  return r;
}
