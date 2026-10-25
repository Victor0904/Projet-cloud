/** Minuscules, sans accents, apostrophes et espaces unifiés. La longueur du texte est conservée
 * caractère par caractère (utile pour surligner le texte d'origine aux mêmes positions). */
export function normaliser(texte: string): string {
  let r = "";
  for (const c of texte) {
    const base = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
    let ch = base.length === 1 ? base : c;
    if (ch === "œ" || ch === "Œ") ch = "o"; // garde la longueur (approximation)
    if (/[’‘`´]/.test(ch)) ch = "'";
    if (/[  \t]/.test(ch)) ch = " ";
    r += ch.toLowerCase().length === 1 ? ch.toLowerCase() : ch;
  }
  return r;
}

/** Normalisation pour la recherche de mots-clés : idem + espaces multiples réduits. */
export const normaliserRecherche = (t: string) => normaliser(t).replace(/\s+/g, " ");
