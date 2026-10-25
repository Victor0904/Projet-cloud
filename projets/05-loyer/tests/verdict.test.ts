import { describe, expect, it } from "vitest";
import type { Reference } from "../src/lib/reference";
import { ajouterMois, analyserComplement, evaluer, moisEcoules, tropPercu } from "../src/lib/verdict";

const ref: Reference = { zone: "1", pieces: 1, epoque: "avant-1946", meuble: false, ref: 30, majore: 36, minore: 21, remarques: [] };

describe("verdict", () => {
  it("conforme sous le plafond", () => {
    const v = evaluer(ref, 25, { loyerHorsCharges: 900, complement: 0, dateSignature: "2025-01-01" });
    expect(v.plafond).toBe(900);
    expect(v.conforme).toBe(true);
    expect(v.depassementMensuel).toBe(0);
  });
  it("dépassement mensuel et annuel", () => {
    const v = evaluer(ref, 25, { loyerHorsCharges: 1000, complement: 0, dateSignature: "2025-01-01" });
    expect(v.depassementMensuel).toBe(100);
    expect(v.depassementAnnuel).toBe(1200);
    expect(v.conforme).toBe(false);
  });
  it("le complément est retiré du loyer de base", () => {
    const v = evaluer(ref, 25, { loyerHorsCharges: 1000, complement: 100, dateSignature: "2025-01-01" });
    expect(v.loyerBase).toBe(900);
    expect(v.conforme).toBe(true);
  });
  it("repère un loyer sous le minoré", () => {
    expect(evaluer(ref, 25, { loyerHorsCharges: 500, complement: 0, dateSignature: "2025-01-01" }).sousMinore).toBe(true);
  });
});

describe("complément de loyer", () => {
  it("contestable si le loyer de base est sous le plafond", () => {
    const v = evaluer(ref, 25, { loyerHorsCharges: 950, complement: 100, dateSignature: "2026-09-01" });
    const a = analyserComplement(v, "2026-09-01", "2026-10-25", [], 3);
    expect(a.contestable).toBe(true);
    expect(a.dateLimite).toBe("2026-12-01");
    expect(a.delaiDepasse).toBe(false);
  });
  it("contestable si une caractéristique l'interdit, délai dépassé après 3 mois", () => {
    const v = evaluer(ref, 25, { loyerHorsCharges: 1000, complement: 100, dateSignature: "2025-01-31" });
    const a = analyserComplement(v, "2025-01-31", "2026-10-25", ["le logement est classé F ou G"], 3);
    expect(a.contestable).toBe(true);
    expect(a.dateLimite).toBe("2025-04-30");
    expect(a.delaiDepasse).toBe(true);
  });
  it("pas de complément → rien à contester", () => {
    const v = evaluer(ref, 25, { loyerHorsCharges: 900, complement: 0, dateSignature: "2025-01-01" });
    expect(analyserComplement(v, "2025-01-01", "2025-02-01", ["x"], 3).contestable).toBe(false);
  });
});

describe("dates et trop-perçu", () => {
  it("ajoute des mois en gérant les fins de mois", () => {
    expect(ajouterMois("2024-01-31", 1)).toBe("2024-02-29");
    expect(ajouterMois("2026-10-25", -36)).toBe("2023-10-25");
  });
  it("compte les mois entiers", () => {
    expect(moisEcoules("2025-09-01", "2026-10-25")).toBe(13);
    expect(moisEcoules("2025-09-26", "2026-10-25")).toBe(12);
  });
  it("limite le trop-perçu à 3 ans", () => {
    const t = tropPercu(100, "2020-01-01", "2026-10-25", 3);
    expect(t.limiteParPrescription).toBe(true);
    expect(t.mois).toBe(36);
    expect(t.montant).toBe(3600);
    expect(tropPercu(100, "2025-09-01", "2026-10-25", 3)).toMatchObject({ mois: 13, montant: 1300, limiteParPrescription: false });
  });
});
