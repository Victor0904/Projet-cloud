import { describe, expect, it } from "vitest";
import refs from "./references-urssaf.json";
import { brutDepuisCoutEmployeur, brutVersNet } from "../src/paie/salarie";

const ecart = (a: number, b: number) => Math.abs(a - b) / b;

describe("brut → net salarié : 5 salaires de référence (tolérance 2 % vs simulateur Urssaf)", () => {
  for (const r of refs.salaires) {
    it(r.nom, () => {
      const res = brutVersNet(r.brutAnnuel, { cadre: r.cadre, mutuelleMensuelle: 40, mutuellePartEmployeur: 0.5 });
      const netMensuel = res.netAvantImpot / 12;
      expect(ecart(netMensuel, r.netMensuel)).toBeLessThan(0.02);
      // En pratique l'écart est quasi nul : on le vérifie plus finement pour détecter une régression.
      expect(Math.abs(netMensuel - r.netMensuel)).toBeLessThan(1);
    });
  }

  it("net imposable proche du simulateur (écart = prévoyance cadre patronale non réintégrée)", () => {
    for (const r of refs.salaires) {
      const res = brutVersNet(r.brutAnnuel, { cadre: r.cadre, mutuelleMensuelle: 40, mutuellePartEmployeur: 0.5 });
      expect(ecart(res.netImposable / 12, r.netImposableMensuel)).toBeLessThan(0.02);
    }
  });

  it("la participation placée sur un PEE ne supporte que la CSG-CRDS et n'est pas imposable", () => {
    const sans = brutVersNet(40000, { cadre: false, mutuelleMensuelle: 0, mutuellePartEmployeur: 0.5 });
    const avec = brutVersNet(40000, {
      cadre: false,
      mutuelleMensuelle: 0,
      mutuellePartEmployeur: 0.5,
      participationAnnuelle: 1000,
      participationPEE: true,
    });
    expect(avec.netAvantImpot - sans.netAvantImpot).toBeCloseTo(903, 0);
    expect(avec.netImposable).toBeCloseTo(sans.netImposable, 6);
  });

  it("coût employeur → brut est l'inverse de brut → coût", () => {
    const o = { cadre: true, mutuelleMensuelle: 40, mutuellePartEmployeur: 0.5 };
    const brut = brutDepuisCoutEmployeur(80000, o);
    expect(brutVersNet(brut, o).coutEmployeur).toBeCloseTo(80000, 2);
  });

  it("salaire nul : pas de valeur négative", () => {
    const r = brutVersNet(0, { cadre: true, mutuelleMensuelle: 0, mutuellePartEmployeur: 0.5 });
    expect(r.netAvantImpot).toBe(0);
  });
});
