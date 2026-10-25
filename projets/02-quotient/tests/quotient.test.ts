import { describe, expect, it } from "vitest";
import { partsCaf, partsFiscales, quotientCaf, quotientFiscal, valeurPourBase, type Foyer } from "../src/lib/quotient";

const foyer = (f: Partial<Foyer>): Foyer => ({
  situation: "couple",
  enfants: 0,
  enfantsAlternes: 0,
  enfantsAeeh: 0,
  revenusAnnuels: 0,
  prestationsMensuelles: 0,
  ...f,
});

describe("quotient familial CAF — 5 cas types", () => {
  it("cas 1 : couple, 2 enfants, 36 000 €/an, 150 € d'allocations → 3 parts, QF 1 050", () => {
    const f = foyer({ enfants: 2, revenusAnnuels: 36000, prestationsMensuelles: 150 });
    expect(partsCaf(f).total).toBe(3);
    expect(quotientCaf(f)).toBe(1050); // (3000 + 150) / 3
  });

  it("cas 2 : parent seul, 1 enfant, 18 000 €/an, 120 € d'APL → 2,5 parts, QF 648", () => {
    const f = foyer({ situation: "seul", enfants: 1, revenusAnnuels: 18000, prestationsMensuelles: 120 });
    expect(partsCaf(f).total).toBe(2.5);
    expect(quotientCaf(f)).toBe(648); // (1500 + 120) / 2,5
  });

  it("cas 3 : couple, 3 enfants (le 3e compte pour 1 part) → 4 parts", () => {
    const f = foyer({ enfants: 3, revenusAnnuels: 60000, prestationsMensuelles: 320 });
    expect(partsCaf(f).total).toBe(4);
    expect(quotientCaf(f)).toBe(1330); // (5000 + 320) / 4
  });

  it("cas 4 : garde alternée — parent seul, 1 enfant à temps plein + 1 en résidence alternée", () => {
    const f = foyer({ situation: "seul", enfants: 1, enfantsAlternes: 1, revenusAnnuels: 30000, prestationsMensuelles: 75 });
    // Hypothèse : l'enfant en résidence alternée compte pour une part entière chez chaque parent.
    expect(partsCaf(f).total).toBe(3);
    expect(quotientCaf(f)).toBe(858); // (2500 + 75) / 3 = 858,33
    expect(partsCaf(f).detail.at(-1)?.libelle).toContain("résidence alternée");
    // Côté fiscal, l'enfant en résidence alternée ne compte que pour moitié.
    expect(partsFiscales(f)).toBe(1 + 0.5 + 0.5 + 0.25);
  });

  it("cas 5 : couple, 4 enfants dont un bénéficiaire de l'AEEH, sans revenus", () => {
    const f = foyer({ enfants: 4, enfantsAeeh: 1, revenusAnnuels: 0, prestationsMensuelles: 900 });
    expect(partsCaf(f).total).toBe(2 + 0.5 + 0.5 + 1 + 0.5 + 0.5);
    expect(quotientCaf(f)).toBe(180);
  });

  it("un QF connu (attestation CAF) remplace le calcul", () => {
    expect(quotientCaf(foyer({ enfants: 2, revenusAnnuels: 99999, qfConnu: 900 }))).toBe(900);
  });

  it("bases municipales : quotient fiscal et revenus mensuels", () => {
    const f = foyer({ enfants: 2, revenusAnnuels: 36000, revenuFiscalReference: 33000 });
    expect(quotientFiscal(f)).toBe(916); // 33000 / 12 / 3
    expect(valeurPourBase("revenus_mensuels", f)).toBe(2750);
    expect(valeurPourBase("qf_municipal", f)).toBe(916);
  });
});
