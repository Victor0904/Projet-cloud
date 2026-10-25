import { ORGANISMES, TYPES } from "@/donnees";
import type { MotCle, Organisme, OrganismeFiche, TypeCourrier } from "@/donnees/types";
import { normaliserRecherche } from "@/extraction/normaliser";

// Classifieur à règles : chaque fiche de data/types-courrier/ porte des mots-clés pondérés.
// Score d'un type = somme des poids des mots-clés trouvés (chacun compté une fois)
//                 + bonus si l'organisme détecté est celui du type
//                 + motifs (expressions régulières) − exclusions.

/** Paramètres de l'algorithme (pas des données juridiques). */
export const PARAMS = {
  bonusOrganisme: 6,
  scoreMinimum: 6,
};

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cache = new Map<string, RegExp>();
function motif(terme: string): RegExp {
  let re = cache.get(terme);
  if (!re) {
    re = new RegExp(`(?<![a-z0-9])${echapper(terme)}(?![a-z0-9])`);
    cache.set(terme, re);
  }
  return re;
}

export const contient = (texteNormalise: string, terme: string) => motif(terme).test(texteNormalise);

function scoreMots(t: string, mots: MotCle[] | undefined, trouves?: string[]): number {
  let s = 0;
  for (const m of mots ?? []) {
    if (contient(t, m.terme)) {
      s += m.poids;
      trouves?.push(m.terme);
    }
  }
  return s;
}

export type ScoreOrganisme = { organisme: OrganismeFiche; score: number };

export function detecterOrganismes(texteNormalise: string): ScoreOrganisme[] {
  return ORGANISMES.map((o) => ({ organisme: o, score: scoreMots(texteNormalise, o.motsCles) })).sort(
    (a, b) => b.score - a.score,
  );
}

export type Candidat = { type: TypeCourrier; score: number; indices: string[] };

export type Classification = {
  meilleur: Candidat | null;
  /** 0 à 1 : part du meilleur score dans la somme des deux meilleurs. */
  confiance: number;
  candidats: Candidat[];
  organisme: Organisme | null;
};

export function classer(texte: string, types: TypeCourrier[] = TYPES): Classification {
  const t = normaliserRecherche(texte);
  const orgs = detecterOrganismes(t);
  const orgTop = orgs[0] && orgs[0].score > 0 ? orgs[0].organisme.id : null;

  const candidats: Candidat[] = types.map((type) => {
    const indices: string[] = [];
    let score = scoreMots(t, type.motsCles, indices);
    for (const m of type.motifs ?? []) if (new RegExp(m.regex).test(t)) score += m.poids;
    if (score > 0 && type.organisme === orgTop) score += PARAMS.bonusOrganisme;
    score += scoreMots(t, type.exclusions);
    return { type, score, indices };
  });
  candidats.sort((a, b) => b.score - a.score);

  const [p, s] = candidats;
  const meilleur = p && p.score >= PARAMS.scoreMinimum ? p : null;
  const confiance = meilleur ? p.score / (p.score + Math.max(0, s?.score ?? 0)) : 0;
  return { meilleur, confiance, candidats: candidats.filter((c) => c.score > 0).slice(0, 5), organisme: orgTop };
}

export const typeParId = (id: string) => TYPES.find((t) => t.id === id) ?? null;
