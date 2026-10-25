import { describe, expect, it } from "vitest";
import { coutAssistanteMaternelle, coutCrechePsu, creditImpot, ressourcesRetenues, type BesoinGarde } from "../src/lib/garde";

// 40 h x 48 semaines / 12 = 160 h par mois ; 27,5 h x 48 / 12 = 110 h.
const besoin = (b: Partial<BesoinGarde>): BesoinGarde => ({
  heuresParSemaine: 40,
  semainesParAn: 48,
  enfantsACharge: 1,
  handicap: false,
  ressourcesAnnuelles: 24000,
  ...b,
});
const params2025 = { coutReference: 4.85, plafondHoraire: 8 };

describe("crèche — barème PSU 2026", () => {
  it("2 000 €/mois, 1 enfant : 1,24 €/h (exemple de la brochure de Dijon)", () => {
    const r = coutCrechePsu(besoin({}));
    expect(r.tarifHoraire).toBe(1.24);
    expect(r.coutMensuel).toBe(198.4);
  });

  it("applique le plancher et le plafond de ressources", () => {
    expect(ressourcesRetenues(0, 814.62, 8500)).toBe(814.62);
    expect(ressourcesRetenues(200000, 814.62, 8500)).toBe(8500);
    expect(coutCrechePsu(besoin({ ressourcesAnnuelles: 300000 })).tarifHoraire).toBe(5.26); // 8500 x 0,0619 %
  });

  it("enfant handicapé : taux du rang suivant", () => {
    expect(coutCrechePsu(besoin({ handicap: true })).tauxEffort).toBe(0.000516);
  });
});

describe("assistante maternelle — CMG (exemples du communiqué CAF, paramètres 2025)", () => {
  it("couple, 2 000 €/mois, 1 enfant, 160 h à 4,85 € → reste à charge 198,08 €, CMG 577,92 €", () => {
    const r = coutAssistanteMaternelle(besoin({}), 4.85, params2025);
    expect(r.coutMensuel).toBe(776);
    expect(r.cmgMensuel).toBe(577.92);
    expect(r.resteMensuel).toBe(198.08);
  });

  it("parent isolé, 1 141 €/mois, 2 enfants, 110 h → reste à charge 64,77 €", () => {
    const r = coutAssistanteMaternelle(besoin({ heuresParSemaine: 27.5, enfantsACharge: 2, ressourcesAnnuelles: 1141 * 12 }), 4.85, params2025);
    expect(r.resteMensuel).toBeCloseTo(64.77, 1); // la CAF arrondit au centime supérieur (64,763 €)
  });

  it("couple, 4 000 €/mois, 2 enfants, 110 h → même reste à charge qu'en crèche (227,04 €)", () => {
    const b = besoin({ heuresParSemaine: 27.5, enfantsACharge: 2, ressourcesAnnuelles: 48000 });
    expect(coutAssistanteMaternelle(b, 4.85, params2025).resteMensuel).toBe(227.04);
    expect(coutCrechePsu(b).coutMensuel).toBeCloseTo(227.04, 0);
  });

  it("au-delà du plafond horaire, le surcoût reste à la charge de la famille", () => {
    const r = coutAssistanteMaternelle(besoin({}), 9, params2025);
    expect(r.depassementPlafond).toBe(true);
    expect(r.resteMensuel).toBeGreaterThan((9 - 8) * 160);
  });

  it("revenus élevés : CMG nul", () => {
    expect(coutAssistanteMaternelle(besoin({ ressourcesAnnuelles: 120000 }), 4.85, params2025).cmgMensuel).toBe(0);
  });
});

describe("crédit d'impôt", () => {
  it("50 % dans la limite de 3 500 € par enfant", () => {
    expect(creditImpot(2000)).toBe(1000);
    expect(creditImpot(10000)).toBe(1750);
    expect(creditImpot(10000, true)).toBe(875);
  });
});
