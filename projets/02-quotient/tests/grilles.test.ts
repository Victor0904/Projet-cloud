import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GRILLES } from "../src/lib/catalogue";
import { tarifUnitaire, trouverTranche } from "../src/lib/tarif";
import { CLES_PRESTATIONS, type Grille } from "../src/lib/types";
import { erreursTranches, validerGrille } from "../src/lib/validation";

const dossier = join(__dirname, "../data/grilles");
const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".json"));
const lire = (f: string) => JSON.parse(readFileSync(join(dossier, f), "utf-8")) as Grille;

describe("base de grilles", () => {
  it("contient au moins les 15 communes demandées", () => {
    const noms = GRILLES.map((g) => g.commune);
    for (const n of ["Nancy", "Metz", "Strasbourg", "Paris", "Lyon", "Marseille", "Toulouse", "Nantes", "Bordeaux", "Lille", "Rennes", "Montpellier", "Grenoble", "Dijon", "Reims"])
      expect(noms).toContain(n);
  });

  it("chaque fichier du dossier est importé dans le catalogue", () => {
    expect(fichiers.sort()).toEqual(GRILLES.map((g) => `${g.code_insee}.json`).sort());
  });
});

describe.each(fichiers)("grille %s", (fichier) => {
  const g = lire(fichier);

  it("porte le nom de son code INSEE, une source et une date de vérification", () => {
    expect(fichier).toBe(`${g.code_insee}.json`);
    expect(g.source).toMatch(/^https?:\/\//);
    expect(g.verifie_le).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("est valide : tranches ordonnées, sans trou ni chevauchement", () => {
    expect(validerGrille(g)).toEqual([]);
  });

  it.each(CLES_PRESTATIONS.filter((c) => c !== "creche"))("%s : chaque valeur de QF tombe dans exactement une tranche", (cle) => {
    const p = g.prestations[cle];
    if (p.statut === "A_VERIFIER") return;
    for (let qf = 0; qf <= 9000; qf += 1) {
      const n = p.tranches.filter((t, i) => (i === 0 ? qf >= t.de : qf > t.de) && (t.a === null || qf <= t.a)).length;
      expect(n, `QF ${qf}`).toBe(1);
    }
    for (const qf of [0, 450.5, 1000, 3500.25, 20000]) expect(tarifUnitaire(p, qf, 2)).not.toBeNull();
  });

  it("les prestations sans grille sont explicitement marquées A_VERIFIER", () => {
    for (const cle of CLES_PRESTATIONS) {
      const p = g.prestations[cle];
      if (p.unite !== "psu" && p.tranches.length === 0) expect(p.statut).toBe("A_VERIFIER");
    }
  });
});

describe("validation des tranches", () => {
  it("détecte un trou", () => {
    const e = erreursTranches([{ de: 0, a: 500, tarif: 1 }, { de: 600, a: null, tarif: 2 }]);
    expect(e.join()).toMatch(/trou ou chevauchement/);
  });
  it("détecte un chevauchement", () => {
    const e = erreursTranches([{ de: 0, a: 500, tarif: 1 }, { de: 400, a: null, tarif: 2 }]);
    expect(e.join()).toMatch(/trou ou chevauchement/);
  });
  it("exige une dernière tranche ouverte", () => {
    expect(erreursTranches([{ de: 0, a: 500, tarif: 1 }]).join()).toMatch(/dernière tranche/);
  });
  it("refuse un tarif négatif ou absent", () => {
    expect(erreursTranches([{ de: 0, a: null, tarif: -1 }]).join()).toMatch(/négatif/);
    expect(erreursTranches([{ de: 0, a: null }]).join()).toMatch(/exactement un tarif/);
  });
});

describe("calcul des tarifs unitaires (contrôle sur les sources)", () => {
  const g = (nom: string) => GRILLES.find((x) => x.commune === nom)!;

  it("Nancy : formule du simulateur officiel (QF 900 → 3,25 € le repas)", () => {
    expect(tarifUnitaire(g("Nancy").prestations.cantine, 900)).toEqual({ min: 3.25, max: 3.25 });
    expect(tarifUnitaire(g("Nancy").prestations.cantine, 300)).toEqual({ min: 1, max: 1 });
    expect(tarifUnitaire(g("Nancy").prestations.cantine, 2000)).toEqual({ min: 6.35, max: 6.35 });
  });

  it("Dijon : exemples de la brochure (QF 1 000 → 3,95 € ; QF 1 200 → 3,78 € le matin ; QF 750 → 3,99 € la journée)", () => {
    expect(tarifUnitaire(g("Dijon").prestations.cantine, 1000)?.min).toBe(3.95);
    expect(tarifUnitaire(g("Dijon").prestations.garderie_matin, 1200)?.min).toBe(3.78);
    expect(tarifUnitaire(g("Dijon").prestations.alsh_journee, 750)?.min).toBe(3.99);
    expect(tarifUnitaire(g("Dijon").prestations.garderie_soir, 100)?.min).toBe(0.91); // plancher
  });

  it("Bordeaux : formule du second degré, continue au plafond", () => {
    expect(tarifUnitaire(g("Bordeaux").prestations.cantine, 2242)?.min).toBeCloseTo(6.89, 2);
  });

  it("Toulouse : tarif selon le nombre d'enfants du foyer", () => {
    const p = g("Toulouse").prestations.cantine;
    expect(tarifUnitaire(p, 2000, 1)?.min).toBe(2.7);
    expect(tarifUnitaire(p, 2000, 2)?.min).toBe(2.65);
    expect(tarifUnitaire(p, 2000, 5)?.min).toBe(2.55);
  });

  it("Nantes : fourchette seulement", () => {
    expect(tarifUnitaire(g("Nantes").prestations.cantine, 900)).toEqual({ min: 0.85, max: 7.35 });
  });

  it("une prestation A_VERIFIER ne donne pas de tarif", () => {
    expect(tarifUnitaire(g("Reims").prestations.cantine, 900)).toBeNull();
  });

  it("trouverTranche respecte les bornes incluses", () => {
    const t = g("Metz").prestations.cantine.tranches;
    expect(trouverTranche(t, 350)?.tarif).toBe(1.15);
    expect(trouverTranche(t, 351)?.tarif).toBe(1.6);
  });
});
