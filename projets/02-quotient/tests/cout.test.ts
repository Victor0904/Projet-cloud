import { describe, expect, it } from "vitest";
import { grilleParCode } from "../src/lib/catalogue";
import { comparer, coutCommune, type Usage } from "../src/lib/cout";
import type { Foyer } from "../src/lib/quotient";

const nancy = grilleParCode("54395")!;
const metz = grilleParCode("57463")!;
const strasbourg = grilleParCode("67482")!;

const foyerQf900: Foyer = {
  situation: "couple",
  enfants: 2,
  enfantsAlternes: 0,
  enfantsAeeh: 0,
  revenusAnnuels: 0,
  prestationsMensuelles: 0,
  qfConnu: 900,
};

const usage: Usage = {
  enfantsConcernes: 2,
  cantine: 4,
  garderie_matin: 0,
  garderie_soir: 3,
  heuresSoir: 1,
  alsh_journee: 10,
  alsh_demi_journee: 0,
};

describe("cas complet : 2 enfants, QF 900, Nancy vs Metz", () => {
  it("détail figé", () => {
    const c = comparer([nancy, metz], foyerQf900, usage);
    const resume = c.resultats.map((r) => ({
      commune: r.grille.commune,
      valeurBase: r.valeurBase,
      annuel: r.annuel,
      mensuel: r.mensuel,
      manquantes: r.manquantes,
      lignes: r.lignes.filter((l) => l.utilisee).map((l) => ({ cle: l.cle, tarif: l.tarifUnitaire, quantite: l.quantiteParEnfant, annuel: l.annuel })),
    }));
    expect({ resume, comparables: c.comparables, totauxComparables: c.totauxComparables, moinsChere: c.moinsChere, ecarts: c.ecarts }).toMatchSnapshot();
    // Sur les prestations connues dans les deux villes (cantine + soir), Nancy est moins chère.
    expect(c.comparables).toEqual(["cantine", "garderie_soir"]);
    expect(c.resultats[c.moinsChere].grille.commune).toBe("Nancy");
  });

  it("Nancy : 4 repas x 36 semaines x 2 enfants au tarif de 3,25 €", () => {
    const r = coutCommune(nancy, foyerQf900, usage);
    const cantine = r.lignes.find((l) => l.cle === "cantine")!;
    expect(cantine.quantiteParEnfant).toBe(144);
    expect(cantine.annuel.min).toBe(936); // 3,25 x 144 x 2
  });

  it("Metz : l'accueil de loisirs n'a pas de grille, le total est signalé incomplet", () => {
    const r = coutCommune(metz, foyerQf900, usage);
    expect(r.manquantes).toEqual(["Accueil de loisirs vacances — journée"]);
  });
});

describe("règles particulières", () => {
  it("Metz : abattement de 25 % pour le 3e enfant", () => {
    const u = { ...usage, enfantsConcernes: 3, garderie_soir: 0, alsh_journee: 0 };
    const r = coutCommune(metz, { ...foyerQf900, enfants: 3 }, u);
    const cantine = r.lignes.find((l) => l.cle === "cantine")!;
    expect(cantine.annuel.min).toBeCloseTo(3.97 * 144 * 2.75, 2);
  });

  it("Strasbourg : le forfait du soir inclut le matin, facturé 10 mois", () => {
    const u = { ...usage, enfantsConcernes: 1, garderie_matin: 5, garderie_soir: 2, alsh_journee: 0, cantine: 0 };
    const r = coutCommune(strasbourg, { ...foyerQf900, revenuFiscalReference: 32400 }, u);
    const matin = r.lignes.find((l) => l.cle === "garderie_matin")!;
    const soir = r.lignes.find((l) => l.cle === "garderie_soir")!;
    expect(matin.annuel.min).toBe(0);
    expect(matin.inclusDans).toBeTruthy();
    expect(r.valeurBase).toBe(900); // 32 400 / 12 / 3 parts
    expect(soir.annuel.min).toBe(29.07 * 10);
  });

  it("aucun usage → coût nul", () => {
    const vide = { ...usage, cantine: 0, garderie_soir: 0, alsh_journee: 0 };
    expect(coutCommune(nancy, foyerQf900, vide).annuel).toEqual({ min: 0, max: 0 });
  });

  it("une fourchette se propage au total", () => {
    const r = coutCommune(grilleParCode("44109")!, foyerQf900, { ...usage, alsh_journee: 0 });
    expect(r.estFourchette).toBe(true);
    expect(r.annuel.min).toBeLessThan(r.annuel.max);
  });
});
