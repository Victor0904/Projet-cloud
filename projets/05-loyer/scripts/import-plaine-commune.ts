// Régénère data/encadrement/plaine-commune/ (communes de Plaine Commune, Seine-Saint-Denis).
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-plaine-commune.ts
import { importerCommunautaire, importerZonesCommunautaires, type LigneCommunautaire } from "./lib.ts";

// Le CSV source a été saisi à la main : certaines lignes portent l'époque « 1946 » au lieu de
// « avant 1946 » (la ligne suivante est bien « 1946-1970 »). On corrige ce seul cas.
const corriger = (brut: LigneCommunautaire[]) =>
  brut.map((b) => (b.annee_de_construction.trim() === "1946" ? { ...b, annee_de_construction: "avant 1946" } : b));

const PAGE = "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-plaine-commune";

await importerCommunautaire({
  ville: "plaine-commune",
  millesime: "2023",
  debut: "2023-06-01",
  fin: "2024-05-31",
  arrete: "Arrêté du préfet de la région Île-de-France fixant les loyers de référence sur Plaine Commune (2023, dates d'application A_VERIFIER)",
  urlValeurs: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-plaine-commune-1/20230601-143048/encadrements-plaine-commune-2023.csv",
  format: "csv",
  pageSource: "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-plaine-commune-2023",
  avecMaison: true,
  corriger,
  note: "Valeurs 2023 republiées sur data.gouv.fr. A_VERIFIER.",
});

await importerZonesCommunautaires({
  ville: "plaine-commune",
  url: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-plaine-commune/20220608-122433/quartier-plaine-commune-geodata.json",
  pageSource: PAGE,
  note: "Contours communaux (2022) avec la zone DRIHL de chaque commune ou partie de commune. A_VERIFIER.",
  champZone: "Zone",
  champNom: "NOM_COM",
  champInsee: "INSEE_COM",
});
