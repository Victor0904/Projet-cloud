// État de l'application : localStorage + validation à l'import (fichier JSON ou lien de rappel).
import { decoderEtat, encoderEtat } from "@vie-fr/fr-data";
import { estIso } from "./dates";
import type { Echeance, Etat, GenreMembre, Membre } from "./types";

export const CLE_STOCKAGE = "vie-fr:mes-delais:v1";

export const etatVide = (): Etat => ({ version: 1, membres: [], echeances: [] });

export const nouvelId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

const GENRES: GenreMembre[] = ["personne", "vehicule", "logement", "autre"];
const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const texte = (x: unknown, max = 200) => (typeof x === "string" ? x.slice(0, max) : undefined);

function lireMembre(x: unknown): Membre | null {
  if (!estObjet(x) || typeof x.id !== "string" || typeof x.nom !== "string") return null;
  const genre = GENRES.includes(x.genre as GenreMembre) ? (x.genre as GenreMembre) : "autre";
  return { id: x.id.slice(0, 40), nom: x.nom.slice(0, 80), genre };
}

function lireEcheance(x: unknown): Echeance | null {
  if (!estObjet(x) || typeof x.id !== "string" || typeof x.typeId !== "string") return null;
  const dates: Record<string, string> = {};
  if (estObjet(x.dates)) for (const [k, v] of Object.entries(x.dates)) if (estIso(v)) dates[k] = v;
  const parametres: Record<string, number> = {};
  if (estObjet(x.parametres))
    for (const [k, v] of Object.entries(x.parametres)) if (typeof v === "number" && Number.isFinite(v)) parametres[k] = v;
  const e: Echeance = {
    id: x.id.slice(0, 40),
    typeId: x.typeId.slice(0, 60),
    dates,
    creeLe: estIso(x.creeLe) ? x.creeLe : new Date().toISOString().slice(0, 10),
  };
  if (texte(x.varianteId)) e.varianteId = texte(x.varianteId);
  if (texte(x.membreId)) e.membreId = texte(x.membreId);
  if (texte(x.libelle)) e.libelle = texte(x.libelle, 120);
  if (texte(x.note)) e.note = texte(x.note, 500);
  if (Object.keys(parametres).length) e.parametres = parametres;
  if (estObjet(x.derniere) && estIso(x.derniere.echeance) && estIso(x.derniere.faitLe))
    e.derniere = { echeance: x.derniere.echeance, faitLe: x.derniere.faitLe };
  if (estObjet(x.libre) && estIso(x.libre.date)) {
    const rec = typeof x.libre.recurrenceMois === "number" ? Math.max(0, Math.min(120, Math.round(x.libre.recurrenceMois))) : 0;
    e.libre = { date: x.libre.date, recurrenceMois: rec };
  }
  if (x.archivee === true) e.archivee = true;
  return e;
}

/** Valide un objet venu de l'extérieur. Renvoie null s'il n'a pas la forme attendue. */
export function validerEtat(x: unknown): Etat | null {
  if (!estObjet(x) || !Array.isArray(x.echeances)) return null;
  const membres = Array.isArray(x.membres) ? x.membres.map(lireMembre).filter((m): m is Membre => !!m) : [];
  const echeances = x.echeances.map(lireEcheance).filter((e): e is Echeance => !!e);
  return { version: 1, membres, echeances };
}

/** Fusionne deux états : les éléments importés remplacent ceux de même identifiant. */
export function fusionner(local: Etat, importe: Etat): Etat {
  const membres = new Map(local.membres.map((m) => [m.id, m]));
  importe.membres.forEach((m) => membres.set(m.id, m));
  const echeances = new Map(local.echeances.map((e) => [e.id, e]));
  importe.echeances.forEach((e) => echeances.set(e.id, e));
  return { version: 1, membres: [...membres.values()], echeances: [...echeances.values()] };
}

// ——— Lien de rappel : format compact (clés courtes) puis base64url ———

type Compact = { v: 1; m: [string, string, string][]; e: Record<string, unknown>[] };

export function versCompact(etat: Etat): Compact {
  return {
    v: 1,
    m: etat.membres.map((m) => [m.id, m.nom, m.genre]),
    e: etat.echeances
      .filter((e) => !e.archivee)
      .map((e) => {
        const c: Record<string, unknown> = { i: e.id, t: e.typeId, d: e.dates, c: e.creeLe };
        if (e.varianteId) c.v = e.varianteId;
        if (e.membreId) c.m = e.membreId;
        if (e.libelle) c.l = e.libelle;
        if (e.parametres) c.p = e.parametres;
        if (e.derniere) c.f = [e.derniere.echeance, e.derniere.faitLe];
        if (e.libre) c.x = [e.libre.date, e.libre.recurrenceMois];
        return c;
      }),
  };
}

export function depuisCompact(x: unknown): Etat | null {
  if (!estObjet(x) || x.v !== 1 || !Array.isArray(x.e)) return null;
  const membres = Array.isArray(x.m)
    ? x.m.map((t) => (Array.isArray(t) ? { id: t[0], nom: t[1], genre: t[2] } : null))
    : [];
  const echeances = x.e.map((c) =>
    estObjet(c)
      ? {
          id: c.i,
          typeId: c.t,
          dates: c.d,
          creeLe: c.c,
          varianteId: c.v,
          membreId: c.m,
          libelle: c.l,
          parametres: c.p,
          derniere: Array.isArray(c.f) ? { echeance: c.f[0], faitLe: c.f[1] } : undefined,
          libre: Array.isArray(c.x) ? { date: c.x[0], recurrenceMois: c.x[1] } : undefined,
        }
      : null,
  );
  return validerEtat({ membres, echeances });
}

export const encoderLien = (etat: Etat) => encoderEtat(versCompact(etat));
export const decoderLien = (s: string) => depuisCompact(decoderEtat<unknown>(s));

// ——— Accès au localStorage (client uniquement) ———

export function chargerLocal(): Etat {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return etatVide();
    return validerEtat(JSON.parse(brut)) ?? etatVide();
  } catch {
    return etatVide();
  }
}

export function sauverLocal(etat: Etat): boolean {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    return true;
  } catch {
    return false;
  }
}
