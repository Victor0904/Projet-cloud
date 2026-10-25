// Petits utilitaires de nettoyage, sans dépendance (utilisés par les scripts d'import ET l'application).

/** Valeur brute (nombre, chaîne « 12,5 », « ND », null…) → nombre ou null. */
export function nombre(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.trim().replace(",", ".");
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** « 2024 », « 2024-01-01T00:00:00+00:00 », « 2023-2024 » → 2024 / 2024 / 2023 (première année). */
export function annee(v: unknown): number | null {
  const m = String(v ?? "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

/** Drapeau de l'annuaire (1, "1", "0", null) → booléen. */
export const drapeau = (v: unknown) => v === 1 || v === "1" || v === true;

export const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const ABREVIATIONS: Record<string, string> = {
  ST: "SAINT",
  STE: "SAINTE",
  AV: "AVENUE",
  AVE: "AVENUE",
  BD: "BOULEVARD",
  BLD: "BOULEVARD",
  BOUL: "BOULEVARD",
  PL: "PLACE",
  CHE: "CHEMIN",
  CHEM: "CHEMIN",
  IMP: "IMPASSE",
  ALL: "ALLEE",
  RTE: "ROUTE",
  FG: "FAUBOURG",
  FBG: "FAUBOURG",
  SQ: "SQUARE",
  CRS: "COURS",
  QU: "QUAI",
  QUA: "QUAI",
  PASS: "PASSAGE",
  RES: "RESIDENCE",
  LOT: "LOTISSEMENT",
  DR: "DOCTEUR",
  GAL: "GENERAL",
  GEN: "GENERAL",
  MAL: "MARECHAL",
  PDT: "PRESIDENT",
  PR: "PROFESSEUR",
  CDT: "COMMANDANT",
  LT: "LIEUTENANT",
  CPT: "CAPITAINE",
  R: "RUE",
};

const MOTS_VIDES = new Set(["DE", "DU", "DES", "LA", "LE", "LES", "L", "D", "ET", "A", "AU", "AUX", "EN"]);

/**
 * Clé de comparaison d'un nom de voie : majuscules sans accents, abréviations développées,
 * articles retirés. « Rue de l'Abbé Grégoire » et « RUE ABBE GREGOIRE » donnent la même clé.
 */
export function cleVoie(nom: string): string {
  return sansAccents(nom)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((m) => ABREVIATIONS[m] ?? m)
    .filter((m) => !MOTS_VIDES.has(m))
    .join(" ");
}

const TYPES_VOIE = new Set([
  "RUE", "AVENUE", "BOULEVARD", "PLACE", "CHEMIN", "IMPASSE", "ALLEE", "ROUTE", "FAUBOURG", "SQUARE", "COURS",
  "QUAI", "PASSAGE", "RESIDENCE", "LOTISSEMENT", "SENTIER", "VOIE", "ESPLANADE", "PROMENADE", "PARVIS", "ROND",
  "POINT", "COUR", "CITE", "HAMEAU", "CLOS", "VILLA", "SENTE", "TRAVERSE", "VENELLE", "MAIL", "PONT", "PORT",
]);

/** Clé sans le type de voie (« RUE », « AVENUE »…), pour un second essai plus tolérant. */
export function cleVoieSansType(nom: string): string {
  const mots = cleVoie(nom).split(" ");
  while (mots.length > 1 && TYPES_VOIE.has(mots[0])) mots.shift();
  return mots.join(" ");
}

/** « 0383285288 » → « 03 83 28 52 88 ». */
export function telephone(v: unknown): string | null {
  const chiffres = String(v ?? "").replace(/\D/g, "");
  if (chiffres.length !== 10) return v ? String(v) : null;
  return chiffres.replace(/(\d{2})(?=\d)/g, "$1 ");
}
