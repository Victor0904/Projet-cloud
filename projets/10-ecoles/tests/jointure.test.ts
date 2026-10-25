import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembler, mesurerJointure, SEUIL_PERTE } from "../src/lib/import/assembler.ts";
import type { FichierDepartement, IndexDonnees } from "../src/lib/types.ts";
import { echantillon } from "./aide.ts";

describe("jointure annuaire ↔ IVAL ↔ IVAC ↔ IPS par UAI (échantillon fixé)", () => {
  const { etablissements, jointures } = assembler(echantillon);
  const parJeu = Object.fromEntries(jointures.map((j) => [j.jeu, j]));

  it("ne perd aucun établissement pour IVAL et IPS (perte ≤ 5 %)", () => {
    for (const jeu of ["IVAL lycées GT", "IVAL lycées pro", "IPS écoles", "IPS collèges", "IPS lycées"]) {
      expect(parJeu[jeu].perte, jeu).toBeLessThanOrEqual(SEUIL_PERTE);
    }
  });

  it("détecte la ligne IVAC orpheline ajoutée à l'échantillon", () => {
    expect(parJeu["IVAC (collèges)"].absents).toEqual(["0549999Z"]);
  });

  it("rattache les indicateurs aux bons établissements", () => {
    const poincare = etablissements.find((e) => e.nom === "Lycée Henri Poincaré")!;
    expect(poincare.bac.length).toBeGreaterThan(0);
    expect(poincare.ips.length).toBeGreaterThan(0);
    const lamour = etablissements.find((e) => e.uai === "0541327Z")!;
    expect(lamour.dnb.length).toBe(3);
    expect(lamour.ips.length).toBeGreaterThan(0);
    expect(lamour.effectifs.length).toBeGreaterThan(0);
    const ecoles = etablissements.filter((e) => e.niveau === "ecole");
    expect(ecoles.every((e) => e.dnb.length === 0 && e.bac.length === 0)).toBe(true);
  });

  it("reporte le bac pro d'une section d'enseignement professionnel sur son lycée", () => {
    const boutet = etablissements.find((e) => e.nom.includes("Boutet-de-Monvel"))!;
    expect(boutet.bac.some((b) => b.voie === "pro")).toBe(true);
  });

  it("mesurerJointure calcule la perte", () => {
    const r = mesurerJointure("x", ["A", "B", "B", "C", "D"], new Set(["A", "B", "C"]));
    expect(r).toMatchObject({ uaiDansLeJeu: 4, uaiRetrouvesDansAnnuaire: 3, perte: 0.25, absents: ["D"] });
    expect(mesurerJointure("vide", [], new Set()).perte).toBe(0);
  });
});

// Contrôle sur les vraies données générées (si l'import a été lancé) : documente la perte réelle.
const DONNEES = join(import.meta.dirname, "..", "public", "donnees");
describe.runIf(existsSync(join(DONNEES, "index.json")))("jointure sur les données importées", () => {
  const index = JSON.parse(readFileSync(join(DONNEES, "index.json"), "utf8")) as IndexDonnees;
  for (const d of index.departements) {
    it(`${d.nom} : perte ≤ 5 % pour chaque jeu`, () => {
      const f = JSON.parse(readFileSync(join(DONNEES, d.code3, "etablissements.json"), "utf8")) as FichierDepartement;
      for (const j of f.jointures) expect(j.perte, `${d.nom} – ${j.jeu}`).toBeLessThanOrEqual(SEUIL_PERTE);
    });
  }
});
