const euroFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euroRondFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** 1234.5 → « 1 234,50 € » (espaces insécables remplacés par des espaces simples). */
export const euros = (n: number, arrondi = false) =>
  (arrondi ? euroRondFmt : euroFmt).format(n).replace(/[  ]/g, " ");

/** Date → « 25 octobre 2026 ». */
export const dateLongue = (d: Date) => dateFmt.format(d);

/** Date → « 25/10/2026 ». */
export const dateCourte = (d: Date) =>
  `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

/** « 25/10/2026 » ou « 2026-10-25 » → Date UTC minuit, ou null si invalide. */
export function lireDate(s: string): Date | null {
  const t = s.trim();
  const fr = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!fr && !iso) return null;
  const [j, m, a] = fr ? [+fr[1], +fr[2], +fr[3]] : [+iso![3], +iso![2], +iso![1]];
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCDate() === j && d.getUTCMonth() === m - 1 ? d : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
