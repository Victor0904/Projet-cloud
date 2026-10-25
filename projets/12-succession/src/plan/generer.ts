// Génère le plan personnalisé à partir du questionnaire et de la date du décès.
import { calculerEcheance, isoVersDate, type Echeance } from "../lib/dates";
import { delai, organisme, type Delai, type Organisme, type TypeLettre } from "../lib/donnees";
import type { Profil } from "./profil";
import { PHASES, REGLES, type Phase, type Regle } from "./regles";

export type DemarchePlanifiee = {
  id: string;
  phase: Phase;
  titre: string;
  pourquoi: string;
  /** « heritiers » : à transmettre à la famille ou au notaire (pour un proche sans lien familial). */
  qui: "vous" | "heritiers";
  organismes: Organisme[];
  contact?: string;
  pieces: string[];
  delai: Delai;
  echeance: Echeance;
  lettre?: { type: TypeLettre; organisme: string };
};

export type Plan = {
  dateDeces: Date;
  demarches: DemarchePlanifiee[];
  phases: { id: Phase; titre: string; intro: string; demarches: DemarchePlanifiee[] }[];
};

function appliquer(r: Regle, p: Profil, dateDeces: Date): DemarchePlanifiee {
  const orgs = r.organismes.map(organisme);
  const d = delai(r.delai(p));
  return {
    id: r.id,
    phase: r.phase,
    titre: r.titre,
    pourquoi: r.pourquoi(p),
    qui: p.lien === "sans_lien" && r.heritiers ? "heritiers" : "vous",
    organismes: orgs,
    contact: r.contact,
    pieces: r.pieces ?? orgs[0]?.pieces ?? [],
    delai: d,
    echeance: calculerEcheance(dateDeces, d),
    lettre: r.lettre,
  };
}

/** Règle retenue pour ce profil ? Un proche sans lien familial ne voit que ce qui le concerne. */
export function regleApplicable(r: Regle, p: Profil): boolean {
  if (p.lien === "sans_lien" && !r.toutProche && !r.heritiers) return false;
  return r.condition(p);
}

/** Tri : par échéance (les démarches sans date à la fin de leur phase), puis ordre du catalogue. */
function comparer(a: DemarchePlanifiee, b: DemarchePlanifiee, ordre: Map<string, number>): number {
  const ta = a.echeance.date?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = b.echeance.date?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return (ordre.get(a.id) ?? 0) - (ordre.get(b.id) ?? 0);
}

export function genererPlan(p: Profil): Plan | null {
  const dateDeces = isoVersDate(p.dateDeces);
  if (!dateDeces) return null;
  const ordre = new Map(REGLES.map((r, i) => [r.id, i]));
  const demarches = REGLES.filter((r) => regleApplicable(r, p)).map((r) => appliquer(r, p, dateDeces));
  const phases = PHASES.map((ph) => ({
    ...ph,
    demarches: demarches.filter((d) => d.phase === ph.id).sort((a, b) => comparer(a, b, ordre)),
  }));
  return { dateDeces, demarches: phases.flatMap((ph) => ph.demarches), phases };
}

/** Les prochaines démarches non faites ayant une date, de la plus proche à la plus lointaine. */
export function prochainesEcheances(plan: Plan, faites: Set<string>, n = 3): DemarchePlanifiee[] {
  return plan.demarches
    .filter((d) => d.echeance.date && d.delai.valeur !== 0 && !faites.has(d.id))
    .sort((a, b) => a.echeance.date!.getTime() - b.echeance.date!.getTime())
    .slice(0, n);
}
