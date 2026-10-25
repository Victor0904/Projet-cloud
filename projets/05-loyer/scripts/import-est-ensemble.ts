// Régénère data/encadrement/est-ensemble/ (9 communes de Seine-Saint-Denis).
// Les références officielles sont sur referenceloyer.drihl.gouv.fr (inaccessible lors de l'import).
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-est-ensemble.ts
import { importerCommunautaire, importerZonesCommunautaires } from "./lib.ts";

const PAGE = "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-est-ensemble";

await importerCommunautaire({
  ville: "est-ensemble",
  millesime: "2023",
  debut: "2023-06-01",
  fin: "2024-05-31",
  arrete: "Arrêté du préfet de la région Île-de-France fixant les loyers de référence sur Est Ensemble (2023, dates d'application A_VERIFIER)",
  urlValeurs: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-est-ensemble/20230601-202658/encadrements-est-ensemble-2023.json",
  format: "json",
  pageSource: PAGE,
  avecMaison: true,
  note: "Valeurs 2023 republiées sur data.gouv.fr. A_VERIFIER.",
});

await importerZonesCommunautaires({
  ville: "est-ensemble",
  url: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-est-ensemble/20220608-121232/quartier-est-ensemble-geodata.json",
  pageSource: PAGE,
  note: "Contours communaux (2022) avec la zone DRIHL de chaque commune ou partie de commune. A_VERIFIER.",
  champZone: "Zone",
  champNom: "com_name",
  champInsee: "com_code",
});
