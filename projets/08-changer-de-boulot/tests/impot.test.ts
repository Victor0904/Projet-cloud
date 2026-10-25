import { describe, expect, it } from "vitest";
import refs from "./references-urssaf.json";
import { abattement10, calculerIR, nombreDeParts, tauxNeutre } from "../src/paie/impot";

describe("impôt sur le revenu : foyers types (référence : moteur Urssaf, barème LF 2026)", () => {
  for (const f of refs.foyers) {
    it(f.nom, () => {
      const foyer = { situation: f.situation as "seul" | "couple", enfants: f.enfants, parentIsole: f.parentIsole };
      expect(nombreDeParts(foyer)).toBe(f.parts);
      const r = calculerIR(f.revenuImposable, foyer);
      expect(Math.abs(r.impot - f.impot)).toBeLessThan(1);
    });
  }

  it("calcul à la main : célibataire, 40 000 € imposables", () => {
    // (29 579 − 11 600) × 11 % + (40 000 − 29 579) × 30 % = 1 977,69 + 3 126,30
    const r = calculerIR(40000, { situation: "seul", enfants: 0, parentIsole: false });
    expect(r.impot).toBeCloseTo(5103.99, 2);
    expect(r.decote).toBe(0);
  });

  it("3e enfant = 1 part entière", () => {
    expect(nombreDeParts({ situation: "couple", enfants: 3, parentIsole: false })).toBe(4);
    expect(nombreDeParts({ situation: "seul", enfants: 2, parentIsole: true })).toBe(2.5);
  });

  it("abattement de 10 % borné (509 € minimum, 14 555 € maximum)", () => {
    expect(abattement10(3000)).toBe(509);
    expect(abattement10(300)).toBe(300);
    expect(abattement10(30000)).toBeCloseTo(3000, 6);
    expect(abattement10(500000)).toBe(14555);
  });

  it("taux neutre du prélèvement à la source", () => {
    expect(tauxNeutre(1500)).toBe(0);
    expect(tauxNeutre(3000)).toBe(0.075);
    expect(tauxNeutre(100000)).toBe(0.43);
  });
});
