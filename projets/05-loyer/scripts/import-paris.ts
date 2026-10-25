// Régénère data/encadrement/paris/ depuis opendata.paris.fr (jeu « Logement - Encadrement des loyers »).
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-paris.ts [années…]
import {
  AUJOURDHUI,
  dedoublonner,
  ecrireJson,
  epoqueId,
  piecesId,
  simplifier,
  telechargerJson,
  type Geometrie,
  type Ligne,
  type Millesime,
  type Zones,
} from "./lib.ts";

const JEU = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers";
const PAGE = "https://opendata.paris.fr/explore/dataset/logement-encadrement-des-loyers/";
const annees = process.argv.slice(2).length ? process.argv.slice(2) : ["2023", "2024", "2025"];

type Enreg = {
  annee: string;
  id_zone: number;
  id_quartier: number;
  nom_quartier: string;
  piece: number;
  epoque: string;
  meuble_txt: string;
  ref: number;
  max: number;
  min: number;
};

for (const annee of annees) {
  const where = encodeURIComponent(`annee="${annee}"`);
  const enregs = await telechargerJson<Enreg[]>(
    `${JEU}/exports/json?select=annee,id_zone,id_quartier,nom_quartier,piece,epoque,meuble_txt,ref,max,min&where=${where}`,
  );
  if (enregs.length === 0) {
    console.warn(`Aucune donnée pour ${annee} : l'arrêté n'est peut-être pas encore publié en open data.`);
    continue;
  }
  const secteurs: Record<string, string> = {};
  const lignes: Ligne[] = enregs.map((e) => {
    secteurs[String(e.id_quartier)] = String(e.id_zone);
    return {
      zone: String(e.id_zone),
      pieces: piecesId(e.piece),
      epoque: epoqueId(e.epoque),
      meuble: e.meuble_txt.toLowerCase().startsWith("meubl"),
      ref: e.ref,
      majore: e.max,
      minore: e.min,
    };
  });
  const m: Millesime = {
    ville: "paris",
    millesime: annee,
    debut: `${annee}-07-01`,
    fin: `${Number(annee) + 1}-06-30`,
    arrete: `Arrêté du préfet de la région Île-de-France fixant les loyers de référence à Paris, applicable au 1er juillet ${annee}`,
    source: PAGE,
    verifie_le: AUJOURDHUI,
    statut: "OK",
    secteurs,
    lignes: dedoublonner(lignes),
  };
  ecrireJson(`data/encadrement/paris/loyers-${annee}.json`, m);
}

// Géométries : les 80 quartiers administratifs (une seule combinaison suffit, la forme est identique).
const derniere = annees[annees.length - 1];
const where = encodeURIComponent(
  `annee="${derniere}" and piece=1 and epoque="Avant 1946" and meuble_txt="non meublé"`,
);
const geo = await telechargerJson<{
  features: { properties: { id_quartier: number; nom_quartier: string }; geometry: Geometrie }[];
}>(`${JEU}/exports/geojson?select=id_quartier,nom_quartier,geo_shape&where=${where}`);
const zones: Zones = {
  type: "FeatureCollection",
  source: PAGE,
  verifie_le: AUJOURDHUI,
  statut: "OK",
  note: "80 quartiers administratifs de Paris, géométries simplifiées (≈ 3 m).",
  features: geo.features.map((f) => ({
    type: "Feature",
    properties: { secteur: String(f.properties.id_quartier), nom: f.properties.nom_quartier },
    geometry: simplifier(f.geometry),
  })),
};
ecrireJson("data/encadrement/paris/zones.json", zones);
