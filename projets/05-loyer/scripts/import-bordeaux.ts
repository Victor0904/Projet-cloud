// Régénère data/encadrement/bordeaux/.
// Les secteurs géographiques (DDTM Gironde, geo-ide) étaient inaccessibles lors de l'import : pas de
// géométries, l'utilisateur choisit son secteur. Valeurs : arrêté 2023 republié sur data.gouv.fr.
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-bordeaux.ts
import { importerCommunautaire, vrai, type LigneCommunautaire } from "./lib.ts";

// Le fichier source contient 256 lignes : les 128 premières pour les appartements, les 128 suivantes
// pour les maisons, mais la colonne « maison » vaut FALSE à tort pour une partie du second bloc.
// On reconstruit donc ce champ à partir de la position, après avoir vérifié le premier bloc.
function corriger(brut: LigneCommunautaire[]): LigneCommunautaire[] {
  const moitie = brut.length / 2;
  if (brut.length !== 256 || brut.slice(0, moitie).some((b) => vrai(b.maison))) {
    throw new Error("Structure du fichier Bordeaux inattendue : vérifier la correction de la colonne maison.");
  }
  return brut.map((b, i) => ({ ...b, maison: i >= moitie }));
}

await importerCommunautaire({
  ville: "bordeaux",
  millesime: "2023",
  debut: "2023-07-15",
  fin: "2024-07-14",
  arrete: "Arrêté du préfet de la Gironde fixant les loyers de référence à Bordeaux, applicable au 15 juillet 2023 (date de signature A_VERIFIER)",
  urlValeurs: "https://static.data.gouv.fr/resources/encadrements-bordeaux-2023-csv/20230708-124911/encadrements-bordeaux-2023.json",
  format: "json",
  pageSource: "https://www.data.gouv.fr/datasets/encadrement-des-loyers-de-bordeaux-2023",
  avecMaison: true,
  corriger,
  note: "Valeurs 2023 republiées sur data.gouv.fr ; un arrêté plus récent (20 juin 2025, applicable au 15 juillet 2025) existe. A_VERIFIER.",
});
// Secteurs à régénérer quand le service sera joignable :
// https://www.data.gouv.fr/datasets/encadrement-des-loyers-sur-bordeaux-secteurs-geographiques
