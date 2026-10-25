// Régénère data/carte-loyers/ : indicateurs de loyers d'annonce par commune (« Carte des loyers »,
// Ministère de la Transition écologique / ANIL), utilisés hors zone d'encadrement.
// Un fichier par département (chargé à la demande) + src/donnees/carte-loyers-index.ts (généré).
// Usage : NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import-carte-loyers.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUJOURDHUI, RACINE, ecrireJson, lireCsv, telechargerTexte } from "./lib.ts";

const MILLESIME = "2025";
const PAGE = `https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-${MILLESIME}`;
const BASE = `https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-${MILLESIME}/20251211-`;
const FICHIERS = {
  app: "145010/pred-app-mef-dhup.csv",
  app12: "144934/pred-app12-mef-dhup.csv",
  app3: "144951/pred-app3-mef-dhup.csv",
  maison: "145039/pred-mai-mef-dhup.csv",
} as const;
type Type = keyof typeof FICHIERS;

/** [loyer prédit, borne basse, borne haute de l'intervalle de prédiction] en €/m² charges comprises ; precision : 1 = commune, 0 = maille. */
type Indic = [number, number, number, 0 | 1];
type Commune = { n: string } & Partial<Record<Type, Indic>>;

const parDep = new Map<string, Record<string, Commune>>();
const r1 = (s: string) => Math.round(Number(s.replace(",", ".")) * 10) / 10;

for (const [type, chemin] of Object.entries(FICHIERS) as [Type, string][]) {
  const texte = await telechargerTexte(BASE + chemin, "windows-1252");
  for (const l of lireCsv(texte, ";")) {
    const dep = l.DEP;
    const insee = l.INSEE_C;
    if (!dep || !insee) continue;
    const communes = parDep.get(dep) ?? {};
    parDep.set(dep, communes);
    const c = (communes[insee] ??= { n: l.LIBGEO });
    c[type] = [r1(l.loypredm2), r1(l["lwr.IPm2"]), r1(l["upr.IPm2"]), l.TYPPRED === "commune" ? 1 : 0];
  }
}

const deps = [...parDep.keys()].sort();
for (const dep of deps) ecrireJson(`data/carte-loyers/${dep}.json`, parDep.get(dep));
ecrireJson("data/carte-loyers/meta.json", {
  millesime: MILLESIME,
  source: PAGE,
  verifie_le: AUJOURDHUI,
  statut: "OK",
  note:
    "Loyers d'annonce estimés par un modèle statistique, en €/m² CHARGES COMPRISES, pour un logement type " +
    "(appartement ou maison). Indicatif : ce n'est ni un plafond légal ni un loyer de référence.",
});

const index =
  "// Fichier généré par scripts/import-carte-loyers.ts — ne pas modifier à la main.\n" +
  "export const chargeurs: Record<string, () => Promise<{ default: unknown }>> = {\n" +
  deps.map((d) => `  "${d}": () => import("../../data/carte-loyers/${d}.json"),`).join("\n") +
  "\n};\n";
writeFileSync(join(RACINE, "src/donnees/carte-loyers-index.ts"), index);
console.log(`écrit src/donnees/carte-loyers-index.ts (${deps.length} départements)`);
