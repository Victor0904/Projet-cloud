// Lien de partage et export/import JSON. La situation ne contient aucune donnée nominative
// (pas de nom, pas d'adresse : seulement des âges, des montants et le code de la commune).
import { decoderEtat, encoderEtat } from "@vie-fr/fr-data";
import { situationVide, type Activite, type Adulte, type Situation, type StatutLogement } from "../moteur";

const ACTIVITES: Activite[] = ["salarie", "independant", "etudiant", "demandeur_emploi", "retraite", "sans_activite"];
const STATUTS: StatutLogement[] = ["locataire", "locataire_hlm", "proprietaire", "heberge"];

const nombre = (x: unknown, min = 0, max = 1e7): number | null => {
  const v = typeof x === "string" ? Number(x) : x;
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null;
};
const booleen = (x: unknown): boolean | null => (typeof x === "boolean" ? x : null);
const texte = (x: unknown, max = 80): string | null => (typeof x === "string" ? x.slice(0, max) : null);

function adulte(x: unknown): Adulte | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const age = nombre(o.age, 0, 120);
  return {
    age: age === null ? null : Math.round(age),
    activite: ACTIVITES.includes(o.activite as Activite) ? (o.activite as Activite) : "sans_activite",
    revenusActivite: nombre(o.revenusActivite) ?? 0,
  };
}

/** Valide et complète un objet inconnu (lien, fichier importé, localStorage) pour en faire une Situation sûre. */
export function normaliserSituation(x: unknown): Situation | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const s = situationVide();
  const d = adulte(o.demandeur);
  if (!d) return null;
  s.demandeur = d;
  s.conjoint = adulte(o.conjoint);
  if (Array.isArray(o.enfants)) {
    s.enfants = o.enfants
      .slice(0, 15)
      .map((e) => nombre((e as { age?: unknown })?.age, 0, 30))
      .filter((a): a is number => a !== null)
      .map((age) => ({ age: Math.round(age) }));
  }
  const l = (o.logement ?? {}) as Record<string, unknown>;
  s.logement.statut = STATUTS.includes(l.statut as StatutLogement) ? (l.statut as StatutLogement) : "locataire";
  s.logement.loyer = nombre(l.loyer, 0, 20000);
  s.logement.colocation = l.colocation === true;
  const c = l.commune as Record<string, unknown> | null | undefined;
  if (c && typeof c === "object" && typeof c.codeInsee === "string" && /^[0-9AB]{5}$/.test(c.codeInsee)) {
    s.logement.commune = {
      codeInsee: c.codeInsee,
      nom: texte(c.nom) ?? c.codeInsee,
      codeDepartement: texte(c.codeDepartement, 3) ?? c.codeInsee.slice(0, 2),
      ...(texte(c.codePostal, 5) ? { codePostal: texte(c.codePostal, 5)! } : {}),
    };
  } else if (c && typeof c === "object" && typeof c.codeDepartement === "string") {
    s.logement.commune = { codeInsee: "", nom: texte(c.nom) ?? "", codeDepartement: c.codeDepartement.slice(0, 3) };
  }
  s.autresRevenus = nombre(o.autresRevenus) ?? 0;
  const p = (o.particulier ?? {}) as Record<string, unknown>;
  s.particulier = {
    handicap: p.handicap === true,
    grossesse: p.grossesse === true,
    apprentissage: p.apprentissage === true,
    alternance: p.alternance === true,
  };
  const k = (o.complements ?? {}) as Record<string, unknown>;
  s.complements = {
    rfr: nombre(k.rfr),
    rfrParents: nombre(k.rfrParents),
    nbFreresSoeurs: nombre(k.nbFreresSoeurs, 0, 20),
    distanceEtudesKm: nombre(k.distanceEtudesKm, 0, 20000),
    boursier: booleen(k.boursier),
    tauxHandicap: ["80", "50_79", "inconnu"].includes(k.tauxHandicap as string) ? (k.tauxHandicap as "80") : null,
    incidentsBancaires: booleen(k.incidentsBancaires),
  };
  return s;
}

export const encoderSituation = (s: Situation) => encoderEtat(s);

export const decoderSituation = (chaine: string): Situation | null => normaliserSituation(decoderEtat<unknown>(chaine));

/** Lit `#s=…` dans un fragment d'URL. */
export function lireFragment(hash: string): Situation | null {
  const m = hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  return m ? decoderSituation(m[1]) : null;
}
