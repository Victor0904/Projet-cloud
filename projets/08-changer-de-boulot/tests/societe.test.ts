import { describe, expect, it } from "vitest";
import refs from "./references-urssaf.json";
import { brutDepuisCoutEmployeur, brutVersNet } from "../src/paie/salarie";
import { calculerSociete, impotSocietes, meilleurArbitrage } from "../src/paie/societe";
import { calculerPortage } from "../src/paie/portage";

describe("SASU / EURL / portage", () => {
  it("SASU : rémunération totale → brut → net proche du simulateur Urssaf (2 %)", () => {
    const ref = refs.sasu[0];
    const o = {
      cadre: true,
      assimileSalarie: true,
      mutuelleMensuelle: 40,
      mutuellePartEmployeur: 0.5,
      tauxATMP: 0.0208,
      moinsDe11Salaries: true,
    };
    const brut = brutDepuisCoutEmployeur(ref.coutTotal, o);
    expect(Math.abs(brut - ref.brutAnnuel) / ref.brutAnnuel).toBeLessThan(0.02);
    const net = brutVersNet(brut, o).netAvantImpot;
    expect(Math.abs(net - ref.netAnnuel) / ref.netAnnuel).toBeLessThan(0.02);
  });

  it("EURL : approximation des cotisations TNS à moins de 5 % du simulateur Urssaf", () => {
    for (const r of refs.eurl) {
      const s = calculerSociete(
        { forme: "eurl", caHT: r.coutTotal, charges: 0, capitalSocial: 1000, partDistribuee: 1, mutuelleMensuelle: 0, mutuellePartEmployeur: 0 },
        r.coutTotal,
      );
      expect(Math.abs(s.netRemuneration - r.net) / r.net).toBeLessThan(0.05);
    }
  });

  it("impôt sur les sociétés : 15 % jusqu'à 42 500 €, 25 % au-delà", () => {
    expect(impotSocietes(-1000)).toBe(0);
    expect(impotSocietes(40000)).toBeCloseTo(6000, 6);
    expect(impotSocietes(100000)).toBeCloseTo(42500 * 0.15 + 57500 * 0.25, 6);
  });

  it("SASU tout en dividendes : IS puis prélèvement forfaitaire de 31,4 %", () => {
    const s = calculerSociete(
      { forme: "sasu", caHT: 50000, charges: 0, capitalSocial: 1000, partDistribuee: 1, mutuelleMensuelle: 0, mutuellePartEmployeur: 0 },
      0,
    );
    const apresIS = 50000 - (42500 * 0.15 + 7500 * 0.25);
    expect(s.dividendesBruts).toBeCloseTo(apresIS, 6);
    expect(s.dividendesNets).toBeCloseTo(apresIS * (1 - 0.314), 6);
  });

  it("l'arbitrage automatique fait au moins aussi bien que 0 % et 100 % de rémunération", () => {
    const o = { forme: "sasu" as const, caHT: 90000, charges: 3000, capitalSocial: 1000, partDistribuee: 1, mutuelleMensuelle: 0, mutuellePartEmployeur: 0 };
    const critere = (r: ReturnType<typeof calculerSociete>) => r.netRemuneration + r.dividendesNets;
    const best = meilleurArbitrage(o, critere);
    expect(critere(best.resultat)).toBeGreaterThanOrEqual(critere(calculerSociete(o, 0)) - 1e-6);
    expect(critere(best.resultat)).toBeGreaterThanOrEqual(critere(calculerSociete(o, 87000)) - 1e-6);
  });

  it("portage : l'enveloppe est entièrement consommée en salaire + cotisations", () => {
    const p = calculerPortage({ caHT: 90000, fraisGestion: 0.07, fraisRembourses: 0, mutuelleMensuelle: 40, mutuellePartEmployeur: 0.5 });
    expect(p.enveloppe).toBeCloseTo(83700, 6);
    expect(p.salaire.coutEmployeur).toBeCloseTo(83700, 1);
    // Ordre de grandeur connu : environ la moitié du CA en net.
    expect(p.salaire.netAvantImpot / 90000).toBeGreaterThan(0.45);
    expect(p.salaire.netAvantImpot / 90000).toBeLessThan(0.55);
  });
});
