// Régénère data/encadrement/lille/ (Lille, Hellemmes, Lomme).
// Le zonage officiel (opendata.lillemetropole.fr → data.lillemetropole.fr) était inaccessible lors de
// l'import : pas de géométries, l'utilisateur choisit son secteur. Valeurs : arrêté 2023 republié sur data.gouv.fr.
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-lille.ts
import { importerCommunautaire } from "./lib.ts";

await importerCommunautaire({
  ville: "lille",
  millesime: "2023",
  debut: "2023-06-01",
  fin: "2024-05-31",
  arrete: "Arrêté du préfet du Nord fixant les loyers de référence à Lille, Hellemmes et Lomme (2023, dates d'application A_VERIFIER)",
  urlValeurs: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-lille/20230708-130636/encadrements-lille-2023.json",
  format: "json",
  pageSource: "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-lille",
  avecMaison: false,
  note: "Valeurs 2023 republiées sur data.gouv.fr, non mises à jour depuis. A_VERIFIER.",
});
// Zonage à régénérer quand le portail sera joignable :
// https://data.lillemetropole.fr/api/explore/v2.1/catalog/datasets/encadrement-des-loyers-a-lille-lomme-et-hellemmes-zonage/exports/geojson
