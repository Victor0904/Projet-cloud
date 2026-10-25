import { describe, expect, it } from "vitest";
import { extraireDates, extraireMontants, extraireReferences, lireNombreFr } from "@/extraction/extraire";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("lecture des nombres au format français", () => {
  it.each([
    ["1 234,56", 1234.56],
    ["1.234,56", 1234.56],
    ["1234.56", 1234.56],
    ["742,18", 742.18],
    ["185 000", 185000],
    ["12", 12],
  ])("%s → %d", (s, n) => expect(lireNombreFr(s)).toBe(n));
});

describe("montants", () => {
  it("reconnaît €, euros, EUR avant ou après, espaces insécables", () => {
    const m = extraireMontants("Total : 1 234,56 € ; frais 25 euros ; EUR 12,00 ; solde 3 870,00 €").map((x) => x.valeur);
    expect(m).toEqual([1234.56, 25, 12, 3870]);
  });
  it("ignore les nombres sans unité monétaire", () => {
    expect(extraireMontants("Revenu fiscal de référence : 31 452 ; vitesse 87 km/h")).toEqual([]);
  });
});

describe("dates", () => {
  it("formats numériques et en lettres, 1er, abréviations", () => {
    const d = extraireDates("le 03/03/2026, le 1er mars 2026, le 5 sept. 2026, le 7.10.26, le 12 février 2026").map((x) => iso(x.date));
    expect(d).toEqual(["2026-03-03", "2026-03-01", "2026-09-05", "2026-10-07", "2026-02-12"]);
  });
  it("rejette les dates impossibles", () => {
    expect(extraireDates("le 31/02/2026 et le 45/01/2026")).toEqual([]);
  });
  it("repère les dates limites", () => {
    const d = extraireDates("Courrier du 01/03/2026. Merci de payer avant le 15/03/2026.");
    expect(d.map((x) => x.role)).toEqual(["autre", "limite"]);
  });
});

describe("références", () => {
  it("n° allocataire, immatriculation, numéro fiscal", () => {
    const r = extraireReferences("N° allocataire : 1234567 — véhicule ab-123-cd — Numéro fiscal : 12 34 567 890 123");
    expect(r).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "allocataire", valeur: "1234567" }),
        expect.objectContaining({ type: "immatriculation", valeur: "AB-123-CD" }),
        expect.objectContaining({ type: "fiscal", valeur: "12 34 567 890 123" }),
      ]),
    );
  });
});
