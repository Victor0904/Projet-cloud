import type { CodeOption, Etablissement, Niveau, Statut } from "./types.ts";
import indicateurs from "../../data/indicateurs.json";

const R_TERRE_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance à vol d'oiseau (formule de haversine), en kilomètres. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type FiltreOption =
  | "section_europeenne"
  | "section_internationale"
  | "section_sport"
  | "langue_rare"
  | "segpa"
  | "ulis"
  | "internat";

export type Filtres = {
  niveaux: Niveau[];
  statut: Statut | "tous";
  options: FiltreOption[];
  rayonKm: number;
};

export const FILTRES_PAR_DEFAUT: Filtres = { niveaux: ["college"], statut: "tous", options: [], rayonKm: 3 };

const LANGUES_COURANTES = new Set(indicateurs.langues_courantes.liste);

/** Langues vivantes « moins répandues » enseignées (hors anglais, allemand, espagnol, italien et langues anciennes). */
export const languesRares = (e: Etablissement) =>
  e.langues.filter((l) => !LANGUES_COURANTES.has(l) && !l.includes("langue ancienne"));

function aOption(e: Etablissement, o: FiltreOption): boolean {
  if (o === "langue_rare") return languesRares(e).length > 0;
  return e.options.includes(o as CodeOption);
}

export type EtablissementProche = Etablissement & { distanceKm: number };

/** Établissements dans le rayon, filtrés, triés du plus proche au plus lointain (jamais par « performance »). */
export function autour(
  etablissements: Etablissement[],
  point: { lat: number; lon: number },
  filtres: Filtres,
): EtablissementProche[] {
  return etablissements
    .filter((e) => filtres.niveaux.length === 0 || filtres.niveaux.includes(e.niveau))
    .filter((e) => filtres.statut === "tous" || e.statut === filtres.statut)
    .filter((e) => filtres.options.every((o) => aOption(e, o)))
    .map((e) => ({ ...e, distanceKm: distanceKm(point, e) }))
    .filter((e) => e.distanceKm <= filtres.rayonKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** « 0,8 km » / « 350 m ». */
export function formaterDistance(km: number): string {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}
