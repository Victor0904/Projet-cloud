// Régénère data/encadrement/montpellier/.
// La Métropole publie ses données sur data.montpellier3m.fr, mais le portail n'exposait pas de jeu
// exploitable lors de l'import (voir JOURNAL.md). On utilise la republication sur data.gouv.fr
// (arrêté 2023), d'où le statut A_VERIFIER.
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-montpellier.ts
import { importerCommunautaire, importerZonesCommunautaires } from "./lib.ts";

const PAGE = "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-montpellier";

await importerCommunautaire({
  ville: "montpellier",
  millesime: "2023",
  debut: "2023-07-01",
  fin: "2024-06-30",
  arrete: "Arrêté du préfet de l'Hérault fixant les loyers de référence à Montpellier, applicable au 1er juillet 2023 (date de signature A_VERIFIER)",
  urlValeurs: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-montpellier/20230708-141424/encadrements-montpellier-2023.json",
  format: "json",
  pageSource: PAGE,
  avecMaison: false,
  note: "Valeurs de l'arrêté 2023 republiées sur data.gouv.fr ; un arrêté plus récent (9 juin 2026) est en vigueur. A_VERIFIER.",
});

await importerZonesCommunautaires({
  ville: "montpellier",
  url: "https://static.data.gouv.fr/resources/encadrement-des-loyers-de-montpellier/20230122-234811/quartier-montpellier.geojson",
  pageSource: PAGE,
  note: "5 secteurs géographiques de Montpellier (fichier 2023). A_VERIFIER.",
  champZone: "Zone",
});
