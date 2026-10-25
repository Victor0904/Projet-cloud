// Ville encadrée d'une commune, et secteur géographique d'un point (point-dans-polygone côté client).
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import villesJson from "../../data/villes.json";
import type { ProprietesSecteur, TerritoireNonCouvert, Ville, Zones } from "./types";

export const VILLES = villesJson.villes as Ville[];
export const NON_COUVERTES = villesJson.non_couvertes as TerritoireNonCouvert[];
export const SOURCE_VILLES = { source: villesJson.source, verifie_le: villesJson.verifie_le };

export const villeParId = (id: string) => VILLES.find((v) => v.id === id);

export type Territoire =
  | { type: "encadre"; ville: Ville }
  | { type: "non-couvert"; territoire: TerritoireNonCouvert }
  | { type: "hors-zone" };

export function territoireDeLaCommune(codeInsee: string): Territoire {
  const ville = VILLES.find((v) => v.communes.includes(codeInsee));
  if (ville) return { type: "encadre", ville };
  const nc = NON_COUVERTES.find((t) => t.communes.includes(codeInsee));
  if (nc) return { type: "non-couvert", territoire: nc };
  return { type: "hors-zone" };
}

/** Secteur contenant le point (lon, lat), ou null (adresse en limite, hors périmètre…). */
export function secteurDuPoint(zones: Zones, lon: number, lat: number): ProprietesSecteur | null {
  const f = zones.features.find((f) => booleanPointInPolygon([lon, lat], f.geometry));
  return f ? f.properties : null;
}

/** Code département d'un code INSEE de commune (2A/2B pour la Corse, 3 chiffres outre-mer). */
export function departement(codeInsee: string): string {
  return codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
}

/** Supprime le numéro de rue d'un libellé d'adresse, pour un partage approximatif. */
export function adresseApproximative(label: string): string {
  return label.replace(/^\s*\d+\s*(bis|ter|quater|[a-d])?\b\s*,?\s*/i, "").trim();
}
