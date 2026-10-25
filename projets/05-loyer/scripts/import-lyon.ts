// Régénère data/encadrement/lyon/ (Lyon + Villeurbanne) depuis data.grandlyon.com (WFS de la Métropole).
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-lyon.ts
// L'arrêté lyonnais s'applique du 1er novembre au 31 octobre ; une couche WFS par période.
import {
  AUJOURDHUI,
  dedoublonner,
  ecrireJson,
  epoqueId,
  nombre,
  piecesId,
  simplifier,
  telechargerJson,
  type Geometrie,
  type Ligne,
  type Millesime,
  type Zones,
} from "./lib.ts";

const WFS = "https://data.grandlyon.com/geoserver/metropole-de-lyon/ows";
const periodes = ["2023_2024", "2024_2025", "2025_2026"];

type Valeur = { loyer_reference: number; loyer_reference_majore: number; loyer_reference_minore: number };
type Feature = {
  properties: {
    codeiris: number;
    zonage: number;
    commune: string;
    insee: string;
    valeurs: Record<string, Record<string, Record<string, Valeur>>>;
  };
  geometry: Geometrie;
};

let dernieres: Feature[] = [];
for (const p of periodes) {
  const couche = `metropole-de-lyon:car_care.carencadrmtloyer_${p}`;
  const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=${couche}&outputFormat=application/json&SRSNAME=EPSG:4326`;
  const { features } = await telechargerJson<{ features: Feature[] }>(url);
  const [a1, a2] = p.split("_");
  const secteurs: Record<string, string> = {};
  const lignes: Ligne[] = [];
  for (const f of features) {
    const zone = String(f.properties.zonage);
    secteurs[String(f.properties.codeiris)] = zone;
    for (const [pieces, parEpoque] of Object.entries(f.properties.valeurs)) {
      for (const [epoque, parType] of Object.entries(parEpoque)) {
        for (const [type, v] of Object.entries(parType)) {
          lignes.push({
            zone,
            pieces: piecesId(pieces),
            epoque: epoqueId(epoque),
            meuble: type === "meuble",
            ref: nombre(v.loyer_reference),
            majore: nombre(v.loyer_reference_majore),
            minore: nombre(v.loyer_reference_minore),
          });
        }
      }
    }
  }
  const m: Millesime = {
    ville: "lyon",
    millesime: p.replace("_", "-"),
    debut: `${a1}-11-01`,
    fin: `${a2}-10-31`,
    arrete: `Arrêté du préfet du Rhône fixant les loyers de référence à Lyon et Villeurbanne, applicable du 1er novembre ${a1} au 31 octobre ${a2}`,
    source: `https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-la-metropole-de-lyon-${p.replace("_", "-")}`,
    verifie_le: AUJOURDHUI,
    statut: "OK",
    secteurs,
    lignes: dedoublonner(lignes),
  };
  ecrireJson(`data/encadrement/lyon/loyers-${m.millesime}.json`, m);
  dernieres = features;
}

const zones: Zones = {
  type: "FeatureCollection",
  source: "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-la-metropole-de-lyon-2025-2026",
  verifie_le: AUJOURDHUI,
  statut: "OK",
  note: "IRIS de Lyon et Villeurbanne (Métropole de Lyon), géométries simplifiées (≈ 3 m).",
  features: dernieres.map((f) => ({
    type: "Feature",
    properties: { secteur: String(f.properties.codeiris), nom: f.properties.commune, insee: f.properties.insee },
    geometry: simplifier(f.geometry),
  })),
};
ecrireJson("data/encadrement/lyon/zones.json", zones);
