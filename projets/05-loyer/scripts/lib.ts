// Outils communs aux scripts d'import (exécutés avec Node ≥ 22 : `node --experimental-strip-types`).
// Aucune dépendance : téléchargement avec reprises, simplification de géométries, écriture JSON.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const AUJOURDHUI = new Date().toISOString().slice(0, 10);

/** Télécharge une URL avec plusieurs tentatives (les portails open data coupent parfois la connexion). */
export async function telecharger(url: string, tentatives = 8): Promise<string> {
  let derniere: unknown;
  for (let i = 0; i < tentatives; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
      return await res.text();
    } catch (e) {
      derniere = e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Échec du téléchargement de ${url} : ${String(derniere)}`);
}

export async function telechargerJson<T>(url: string): Promise<T> {
  return JSON.parse(await telecharger(url)) as T;
}

/** Télécharge en octets bruts (pour les CSV en Windows-1252). */
export async function telechargerTexte(url: string, encodage = "utf-8"): Promise<string> {
  for (let i = 0; i < 8; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new TextDecoder(encodage).decode(await res.arrayBuffer());
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Échec du téléchargement de ${url}`);
}

export function ecrireJson(chemin: string, donnees: unknown) {
  const complet = join(RACINE, chemin);
  mkdirSync(dirname(complet), { recursive: true });
  writeFileSync(complet, JSON.stringify(donnees) + "\n");
  console.log(`écrit ${chemin}`);
}

/** « 18,1 » | 18.1 | "21" → 18.1 */
export function nombre(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`Nombre illisible : ${String(v)}`);
  return Math.round(n * 100) / 100;
}

// ---------- Géométrie ----------
type Pt = [number, number];
type Anneau = Pt[];
export type Geometrie = { type: "Polygon"; coordinates: Anneau[] } | { type: "MultiPolygon"; coordinates: Anneau[][] };

function distSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker itératif. Tolérance en degrés (1e-5 ≈ 1 m). */
function simplifierAnneau(anneau: Anneau, tol: number): Anneau {
  if (anneau.length <= 4) return anneau;
  const garder = new Uint8Array(anneau.length);
  garder[0] = garder[anneau.length - 1] = 1;
  const pile: [number, number][] = [[0, anneau.length - 1]];
  while (pile.length) {
    const [i, j] = pile.pop()!;
    let max = 0;
    let idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = distSegment(anneau[k], anneau[i], anneau[j]);
      if (d > max) {
        max = d;
        idx = k;
      }
    }
    if (idx > 0 && max > tol) {
      garder[idx] = 1;
      pile.push([i, idx], [idx, j]);
    }
  }
  const res = anneau.filter((_, k) => garder[k]);
  return res.length >= 4 ? res : anneau;
}

const arrondir = (p: Pt): Pt => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];

/** Simplifie (≈ 3 m) et arrondit à 5 décimales (≈ 1 m). Suffisant pour situer une adresse. */
export function simplifier(g: Geometrie, tol = 3e-5): Geometrie {
  const anneau = (a: Anneau) => simplifierAnneau(a.map(arrondir), tol);
  if (g.type === "Polygon") return { type: "Polygon", coordinates: g.coordinates.map(anneau) };
  return { type: "MultiPolygon", coordinates: g.coordinates.map((p) => p.map(anneau)) };
}

// ---------- Format commun des fichiers produits ----------
export type EpoqueId = "avant-1946" | "1946-1970" | "1971-1990" | "apres-1990" | "1991-2005" | "apres-2005";

export function epoqueId(libelle: string): EpoqueId {
  const s = libelle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (s.startsWith("avant")) return "avant-1946";
  if (s.startsWith("1946")) return "1946-1970";
  if (s.startsWith("1971")) return "1971-1990";
  if (s.startsWith("1991")) return "1991-2005";
  if (s.includes("2005")) return "apres-2005";
  if (s.includes("1990")) return "apres-1990";
  throw new Error(`Époque inconnue : ${libelle}`);
}

export function piecesId(v: unknown): 1 | 2 | 3 | 4 {
  const n = parseInt(String(v), 10);
  if (n >= 1 && n <= 4) return n as 1 | 2 | 3 | 4;
  throw new Error(`Nombre de pièces inconnu : ${String(v)}`);
}

export const vrai = (v: unknown) => String(v).trim().toLowerCase() === "true" || v === true;

/** Une ligne du référentiel : loyers en €/m² de surface habitable, hors charges. */
export type Ligne = {
  zone: string;
  pieces: 1 | 2 | 3 | 4;
  epoque: EpoqueId;
  meuble: boolean;
  maison?: boolean;
  ref: number;
  majore: number;
  minore: number;
};

export type Millesime = {
  ville: string;
  millesime: string;
  /** Période d'application de l'arrêté (dates ISO). */
  debut: string;
  fin: string;
  arrete: string;
  source: string;
  verifie_le: string;
  statut: "OK" | "A_VERIFIER";
  note?: string;
  /** Secteur géographique (polygone) → zone de loyers, quand les deux diffèrent (Paris : quartier → zone). */
  secteurs?: Record<string, string>;
  lignes: Ligne[];
};

/** Supprime les doublons et vérifie la cohérence (même clé, valeurs différentes = erreur). */
export function dedoublonner(lignes: Ligne[]): Ligne[] {
  const vu = new Map<string, Ligne>();
  for (const l of lignes) {
    const cle = `${l.zone}|${l.pieces}|${l.epoque}|${l.meuble}|${l.maison ?? ""}`;
    const deja = vu.get(cle);
    if (deja && (deja.ref !== l.ref || deja.majore !== l.majore)) {
      throw new Error(`Incohérence pour ${cle} : ${deja.ref}/${deja.majore} contre ${l.ref}/${l.majore}`);
    }
    vu.set(cle, l);
  }
  return [...vu.values()].sort((a, b) =>
    `${a.zone}|${a.pieces}|${a.epoque}|${a.meuble}|${a.maison}`.localeCompare(
      `${b.zone}|${b.pieces}|${b.epoque}|${b.meuble}|${b.maison}`,
    ),
  );
}

export type Zones = {
  type: "FeatureCollection";
  source: string;
  verifie_le: string;
  statut: "OK" | "A_VERIFIER";
  note?: string;
  features: { type: "Feature"; properties: { secteur: string; nom?: string; insee?: string }; geometry: Geometrie }[];
};

// ---------- Jeux « communautaires » republiés sur data.gouv.fr (format zone / nombre_de_piece / prix_*) ----------
export type LigneCommunautaire = {
  zone: number | string;
  nombre_de_piece: number | string;
  annee_de_construction: string;
  prix_med: number | string;
  prix_max: number | string;
  prix_min: number | string;
  meuble: boolean | string;
  maison?: boolean | string;
};

/** Lit un CSV simple séparé par des virgules, avec guillemets. */
export function lireCsv(texte: string, sep = ","): Record<string, string>[] {
  const lignes = texte.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const decouper = (l: string) => {
    const res: string[] = [];
    let cur = "";
    let q = false;
    for (const c of l) {
      if (c === '"') q = !q;
      else if (c === sep && !q) {
        res.push(cur);
        cur = "";
      } else cur += c;
    }
    res.push(cur);
    return res;
  };
  const entete = decouper(lignes[0]).map((s) => s.trim());
  return lignes.slice(1).map((l) => {
    const v = decouper(l);
    return Object.fromEntries(entete.map((k, i) => [k, (v[i] ?? "").replace(/[“”]/g, "").trim()]));
  });
}

export function convertirCommunautaire(brut: LigneCommunautaire[], avecMaison: boolean): Ligne[] {
  return dedoublonner(
    brut.map((b) => ({
      zone: String(b.zone).trim(),
      pieces: piecesId(b.nombre_de_piece),
      epoque: epoqueId(b.annee_de_construction),
      meuble: vrai(b.meuble),
      ...(avecMaison ? { maison: vrai(b.maison) } : {}),
      ref: nombre(b.prix_med),
      majore: nombre(b.prix_max),
      minore: nombre(b.prix_min),
    })),
  );
}

export async function importerCommunautaire(o: {
  ville: string;
  millesime: string;
  debut: string;
  fin: string;
  arrete: string;
  urlValeurs: string;
  format: "json" | "csv";
  pageSource: string;
  avecMaison: boolean;
  note: string;
  /** Correction éventuelle d'un fichier source défectueux (documentée dans le script de la ville). */
  corriger?: (brut: LigneCommunautaire[]) => LigneCommunautaire[];
}) {
  const texte = await telecharger(o.urlValeurs);
  let brut = (o.format === "json" ? JSON.parse(texte) : lireCsv(texte)) as LigneCommunautaire[];
  if (o.corriger) brut = o.corriger(brut);
  const m: Millesime = {
    ville: o.ville,
    millesime: o.millesime,
    debut: o.debut,
    fin: o.fin,
    arrete: o.arrete,
    source: o.pageSource,
    verifie_le: AUJOURDHUI,
    statut: "A_VERIFIER",
    note: o.note,
    lignes: convertirCommunautaire(brut, o.avecMaison),
  };
  ecrireJson(`data/encadrement/${o.ville}/loyers-${o.millesime}.json`, m);
}

export async function importerZonesCommunautaires(o: {
  ville: string;
  url: string;
  pageSource: string;
  note: string;
  champZone: string;
  champNom?: string;
  champInsee?: string;
}) {
  const geo = await telechargerJson<{ features: { properties: Record<string, unknown>; geometry: Geometrie }[] }>(o.url);
  const zones: Zones = {
    type: "FeatureCollection",
    source: o.pageSource,
    verifie_le: AUJOURDHUI,
    statut: "A_VERIFIER",
    note: o.note,
    features: geo.features.map((f) => ({
      type: "Feature",
      properties: {
        secteur: String(f.properties[o.champZone]),
        ...(o.champNom ? { nom: String(f.properties[o.champNom]) } : {}),
        ...(o.champInsee ? { insee: String(f.properties[o.champInsee]) } : {}),
      },
      geometry: simplifier(f.geometry),
    })),
  };
  ecrireJson(`data/encadrement/${o.ville}/zones.json`, zones);
}
