import { GLOSSAIRE } from "@/donnees";
import type { TermeGlossaire } from "@/donnees/types";
import { normaliser } from "@/extraction/normaliser";

export type Segment = { texte: string; terme?: TermeGlossaire };

/** Découpe le texte en segments, en isolant les termes du glossaire (variante la plus longue d'abord,
 * sans chevauchement). Le texte d'origine est conservé tel quel. */
export function decouper(texte: string, glossaire: TermeGlossaire[] = GLOSSAIRE): Segment[] {
  const original = texte.normalize("NFC");
  const norm = normaliser(original);
  if (norm.length !== original.length) return [{ texte: original }];

  const variantes = glossaire
    .flatMap((t) => t.variantes.map((v) => ({ v, t })))
    .sort((a, b) => b.v.length - a.v.length);
  const pris: { debut: number; fin: number; t: TermeGlossaire }[] = [];
  for (const { v, t } of variantes) {
    const re = new RegExp(`(?<![a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "g");
    for (const m of norm.matchAll(re)) {
      const debut = m.index ?? 0;
      const fin = debut + m[0].length;
      if (!pris.some((p) => debut < p.fin && fin > p.debut)) pris.push({ debut, fin, t });
    }
  }
  pris.sort((a, b) => a.debut - b.debut);
  const segments: Segment[] = [];
  let i = 0;
  for (const p of pris) {
    if (p.debut > i) segments.push({ texte: original.slice(i, p.debut) });
    segments.push({ texte: original.slice(p.debut, p.fin), terme: p.t });
    i = p.fin;
  }
  if (i < original.length) segments.push({ texte: original.slice(i) });
  return segments;
}

/** Termes distincts repérés, dans l'ordre d'apparition. */
export function termesReperes(texte: string): TermeGlossaire[] {
  const vus = new Map<string, TermeGlossaire>();
  for (const s of decouper(texte)) if (s.terme && !vus.has(s.terme.id)) vus.set(s.terme.id, s.terme);
  return [...vus.values()];
}
