// État partageable (lien, export JSON, localStorage) : uniquement des paramètres chiffrés, aucune identité.
import { decoderEtat, encoderEtat } from "@vie-fr/fr-data";
import { LIBELLES_STATUT, scenarioParDefaut, type Contexte, type Scenario, type TypeStatut } from "./scenario";

export interface Etat {
  v: 1;
  scenarios: Scenario[];
  contexte: Contexte;
}

export const MAX_SCENARIOS = 3;

export function contexteParDefaut(): Contexte {
  return { foyer: { situation: "seul", enfants: 0, parentIsole: false }, revenusConjoint: 0, autresRevenus: 0 };
}

const nombre = (x: unknown, defaut: number) => (typeof x === "number" && Number.isFinite(x) ? x : defaut);
const booleen = (x: unknown, defaut: boolean) => (typeof x === "boolean" ? x : defaut);
const objet = (x: unknown): Record<string, unknown> => (x && typeof x === "object" ? (x as Record<string, unknown>) : {});

/** Fusionne un objet inconnu (lien, fichier importé) avec les valeurs par défaut, champ par champ. */
function fusionner<T>(defaut: T, brut: unknown): T {
  const src = objet(brut);
  const res = { ...defaut } as Record<string, unknown>;
  for (const [cle, d] of Object.entries(defaut as Record<string, unknown>)) {
    const v = src[cle];
    if (typeof d === "number") res[cle] = nombre(v, d);
    else if (typeof d === "boolean") res[cle] = booleen(v, d);
    else if (typeof d === "string") res[cle] = typeof v === "string" ? v.slice(0, 80) : d;
    else if (d && typeof d === "object") res[cle] = fusionner(d, v);
  }
  return res as T;
}

export function normaliserScenario(brut: unknown): Scenario {
  const src = objet(brut);
  const statut = (Object.keys(LIBELLES_STATUT) as TypeStatut[]).includes(src.statut as TypeStatut)
    ? (src.statut as TypeStatut)
    : "salarie_cadre";
  const s = fusionner(scenarioParDefaut(statut), brut);
  s.statut = statut;
  if (!["sasu", "eurl"].includes(s.formeSociete)) s.formeSociete = "sasu";
  if (!["auto", "forfait", "reels"].includes(s.deduction)) s.deduction = "auto";
  if (!["aucun", "transports", "voiture", "velo"].includes(s.transport.mode)) s.transport.mode = "aucun";
  return s;
}

export function normaliserEtat(brut: unknown): Etat | null {
  const src = objet(brut);
  if (!Array.isArray(src.scenarios) || src.scenarios.length === 0) return null;
  const contexte = fusionner(contexteParDefaut(), src.contexte);
  if (contexte.foyer.situation !== "couple") contexte.foyer.situation = "seul";
  return {
    v: 1,
    scenarios: src.scenarios.slice(0, MAX_SCENARIOS).map(normaliserScenario),
    contexte,
  };
}

/** Lien de partage : fragment #e=… (jamais envoyé au serveur). Option : retirer la situation du foyer. */
export function lienDePartage(etat: Etat, base: string, avecFoyer: boolean): string {
  const e: Etat = avecFoyer ? etat : { ...etat, contexte: contexteParDefaut() };
  return `${base.split("#")[0]}#e=${encoderEtat(e)}`;
}

export function lireFragment(hash: string): Etat | null {
  const m = hash.match(/[#&]e=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return normaliserEtat(decoderEtat<unknown>(m[1]));
}
