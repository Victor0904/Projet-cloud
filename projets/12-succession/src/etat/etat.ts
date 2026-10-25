// État de l'application : enregistré dans le navigateur (localStorage), exportable et importable en JSON
// pour être partagé entre proches. Rien n'est envoyé à un serveur.
import type { CategorieOrganisme, Organisme } from "../lib/donnees";
import { INFOS_VIDES, type InfosLettre } from "../lettres/modeles";
import { genererPlan } from "../plan/generer";
import {
  LIBELLES_ACTIVITE,
  LIBELLES_LIEN,
  LIBELLES_LOGEMENT,
  LIBELLES_UNION,
  PROFIL_VIDE,
  type Profil,
} from "../plan/profil";

export const APPLICATION = "vie-fr-12-succession";
export const VERSION = 1;
const CLE_STOCKAGE = "vie-fr-12-succession";

export type StatutSuivi = "a_prevenir" | "en_attente" | "fait" | "sans_objet";

export const LIBELLES_STATUT: Record<StatutSuivi, string> = {
  a_prevenir: "À prévenir",
  en_attente: "En attente de réponse",
  fait: "Fait",
  sans_objet: "Pas concerné",
};

export type ElementInventaire = {
  id: string;
  /** null pour un contrat ajouté à la main, absent du catalogue. */
  organismeId: string | null;
  nom: string;
  categorie: CategorieOrganisme | "autre";
  reference: string;
  statut: StatutSuivi;
  /** AAAA-MM-JJ, date d'envoi du courrier ou du premier contact. */
  dateEnvoi: string;
  /** AAAA-MM-JJ, date de la réponse ou de la clôture. */
  dateReponse: string;
  note: string;
  /** Horodatage ISO de la dernière modification (pour fusionner deux exports). */
  majLe: string;
};

export type EtatApp = {
  version: number;
  profil: Profil;
  questionnaireValide: boolean;
  inventaire: ElementInventaire[];
  /** Démarche du plan → date (AAAA-MM-JJ) à laquelle elle a été faite. */
  demarchesFaites: Record<string, string>;
  infosLettre: InfosLettre;
  majLe: string;
};

export const etatInitial = (): EtatApp => ({
  version: VERSION,
  profil: { ...PROFIL_VIDE },
  questionnaireValide: false,
  inventaire: [],
  demarchesFaites: {},
  infosLettre: { ...INFOS_VIDES },
  majLe: new Date(0).toISOString(),
});

// ——— Inventaire ———

const maintenant = () => new Date().toISOString();
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function ajouterOrganisme(etat: EtatApp, org: Organisme): EtatApp {
  if (etat.inventaire.some((e) => e.organismeId === org.id)) return etat;
  const el: ElementInventaire = {
    id: org.id,
    organismeId: org.id,
    nom: org.nom,
    categorie: org.categorie,
    reference: "",
    statut: "a_prevenir",
    dateEnvoi: "",
    dateReponse: "",
    note: "",
    majLe: maintenant(),
  };
  return { ...etat, inventaire: [...etat.inventaire, el], majLe: maintenant() };
}

export function ajouterContratLibre(etat: EtatApp, nom: string, reference = ""): EtatApp {
  const propre = nom.trim();
  if (!propre) return etat;
  const id = `libre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const el: ElementInventaire = {
    id,
    organismeId: null,
    nom: propre,
    categorie: "autre",
    reference: reference.trim(),
    statut: "a_prevenir",
    dateEnvoi: "",
    dateReponse: "",
    note: "",
    majLe: maintenant(),
  };
  return { ...etat, inventaire: [...etat.inventaire, el], majLe: maintenant() };
}

export function retirerElement(etat: EtatApp, id: string): EtatApp {
  return { ...etat, inventaire: etat.inventaire.filter((e) => e.id !== id), majLe: maintenant() };
}

export function modifierElement(etat: EtatApp, id: string, champs: Partial<ElementInventaire>): EtatApp {
  return {
    ...etat,
    inventaire: etat.inventaire.map((e) => (e.id === id ? { ...e, ...champs, id: e.id, majLe: maintenant() } : e)),
    majLe: maintenant(),
  };
}

/** Change le statut et date automatiquement : envoi quand on passe « en attente », réponse quand c'est « fait ». */
export function changerStatut(etat: EtatApp, id: string, statut: StatutSuivi, aujourdhui = new Date()): EtatApp {
  const el = etat.inventaire.find((e) => e.id === id);
  if (!el) return etat;
  const champs: Partial<ElementInventaire> = { statut };
  if (statut === "en_attente" && !el.dateEnvoi) champs.dateEnvoi = iso(aujourdhui);
  if (statut === "fait") {
    if (!el.dateReponse) champs.dateReponse = iso(aujourdhui);
    if (!el.dateEnvoi) champs.dateEnvoi = iso(aujourdhui);
  }
  if (statut === "a_prevenir") {
    champs.dateEnvoi = "";
    champs.dateReponse = "";
  }
  return modifierElement(etat, id, champs);
}

/** Organismes probablement concernés, déduits du plan (pour préremplir l'inventaire). */
export function organismesSuggeres(profil: Profil): string[] {
  const plan = genererPlan(profil);
  if (!plan) return [];
  const ids = new Set<string>();
  for (const d of plan.demarches) for (const o of d.organismes) ids.add(o.id);
  return [...ids];
}

export function marquerDemarche(etat: EtatApp, id: string, faite: boolean, aujourdhui = new Date()): EtatApp {
  const demarchesFaites = { ...etat.demarchesFaites };
  if (faite) demarchesFaites[id] = iso(aujourdhui);
  else delete demarchesFaites[id];
  return { ...etat, demarchesFaites, majLe: maintenant() };
}

// ——— Export / import JSON ———

export function serialiser(etat: EtatApp): string {
  return JSON.stringify({ application: APPLICATION, ...etat }, null, 2);
}

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Ne garde que les clés connues, avec le bon type ; les autres prennent la valeur par défaut. */
function nettoyer<T extends object>(modele: T, brut: unknown): T {
  if (!estObjet(brut)) return { ...modele };
  const r = { ...modele } as Record<string, unknown>;
  for (const [k, defaut] of Object.entries(modele)) {
    const v = brut[k];
    if (v === undefined) continue;
    if (defaut === null ? v === null || typeof v === "number" : typeof v === typeof defaut) r[k] = v;
  }
  return r as T;
}

const STATUTS: StatutSuivi[] = ["a_prevenir", "en_attente", "fait", "sans_objet"];

function nettoyerElement(brut: unknown): ElementInventaire | null {
  if (!estObjet(brut) || typeof brut.id !== "string" || typeof brut.nom !== "string") return null;
  const modele: ElementInventaire = {
    id: brut.id,
    organismeId: null,
    nom: brut.nom,
    categorie: "autre",
    reference: "",
    statut: "a_prevenir",
    dateEnvoi: "",
    dateReponse: "",
    note: "",
    majLe: new Date(0).toISOString(),
  };
  const el = nettoyer(modele, brut);
  el.organismeId = typeof brut.organismeId === "string" ? brut.organismeId : null;
  if (!STATUTS.includes(el.statut)) el.statut = "a_prevenir";
  return el;
}

const CHOIX: Partial<Record<keyof Profil, string[]>> = {
  lien: Object.keys(LIBELLES_LIEN),
  union: Object.keys(LIBELLES_UNION),
  logement: Object.keys(LIBELLES_LOGEMENT),
  activite: Object.keys(LIBELLES_ACTIVITE),
  testament: ["oui", "non", "ne_sait_pas"],
  assuranceVie: ["oui", "non", "ne_sait_pas"],
};

function nettoyerProfil(brut: unknown): Profil {
  const p = nettoyer(PROFIL_VIDE, brut) as Record<string, unknown>;
  for (const [k, valeurs] of Object.entries(CHOIX)) {
    if (!valeurs.includes(p[k] as string)) p[k] = PROFIL_VIDE[k as keyof Profil];
  }
  return p as Profil;
}

export type ResultatImport = { ok: true; etat: EtatApp } | { ok: false; erreur: string };

export function deserialiser(texte: string): ResultatImport {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { ok: false, erreur: "Ce fichier n'est pas un fichier JSON lisible." };
  }
  if (!estObjet(brut) || brut.application !== APPLICATION)
    return { ok: false, erreur: "Ce fichier ne vient pas de cet assistant (« Après un décès »)." };
  if (typeof brut.version !== "number" || brut.version > VERSION)
    return { ok: false, erreur: "Ce fichier a été créé par une version plus récente de l'assistant." };
  const base = etatInitial();
  const demarchesFaites: Record<string, string> = {};
  if (estObjet(brut.demarchesFaites))
    for (const [k, v] of Object.entries(brut.demarchesFaites)) if (typeof v === "string") demarchesFaites[k] = v;
  const etat: EtatApp = {
    version: VERSION,
    profil: nettoyerProfil(brut.profil),
    questionnaireValide: brut.questionnaireValide === true,
    inventaire: Array.isArray(brut.inventaire)
      ? brut.inventaire.map(nettoyerElement).filter((e): e is ElementInventaire => e !== null)
      : [],
    demarchesFaites,
    infosLettre: nettoyer(base.infosLettre, brut.infosLettre),
    majLe: typeof brut.majLe === "string" ? brut.majLe : base.majLe,
  };
  return { ok: true, etat };
}

/**
 * Fusionne un export reçu (d'un frère, d'une sœur) avec l'état local : on garde, pour chaque élément de
 * l'inventaire, la version modifiée le plus récemment ; les démarches faites s'additionnent.
 */
export function fusionner(local: EtatApp, recu: EtatApp): EtatApp {
  const parId = new Map(local.inventaire.map((e) => [e.id, e]));
  for (const e of recu.inventaire) {
    const l = parId.get(e.id);
    if (!l || e.majLe > l.majLe) parId.set(e.id, e);
  }
  const demarchesFaites = { ...recu.demarchesFaites, ...local.demarchesFaites };
  const recuPlusRecent = recu.majLe > local.majLe;
  return {
    ...local,
    profil: local.questionnaireValide && !recuPlusRecent ? local.profil : recu.profil,
    questionnaireValide: local.questionnaireValide || recu.questionnaireValide,
    inventaire: [...parId.values()],
    demarchesFaites,
    majLe: maintenant(),
  };
}

// ——— Stockage local ———

export function charger(): EtatApp | null {
  try {
    const t = window.localStorage.getItem(CLE_STOCKAGE);
    if (!t) return null;
    const r = deserialiser(t);
    return r.ok ? r.etat : null;
  } catch {
    return null;
  }
}

export function sauvegarder(etat: EtatApp): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, serialiser(etat));
  } catch {
    // Stockage indisponible (navigation privée…) : l'application continue de fonctionner sans mémoire.
  }
}

export function effacer(): void {
  try {
    window.localStorage.removeItem(CLE_STOCKAGE);
  } catch {
    // rien
  }
}
