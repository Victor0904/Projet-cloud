import { describe, expect, it } from "vitest";
import { estimerHorsZone, type CommuneCarte } from "../src/lib/hors-zone";
import { decoderPartage, encoderPartage, type EtatPartage } from "../src/lib/partage";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("lien de partage", () => {
  const e: EtatPartage = {
    v: 1, a: "Rue Oberkampf 75011 Paris", c: "75111", vi: "paris", s: "42", p: 1, e: "avant-1946",
    m: true, mai: false, sf: 20, l: 950, ch: 0, co: 0, d: "2025-09-01", r: { plafond: 854, depassement: 96 },
  };
  it("aller-retour", () => {
    expect(decoderPartage(encoderPartage(e))).toEqual(e);
  });
  it("refuse un lien abîmé ou trafiqué", () => {
    expect(decoderPartage("nimporte-quoi")).toBeNull();
    expect(decoderPartage(encoderPartage({ ...e, sf: -3 }))).toBeNull();
    expect(decoderPartage(encoderPartage({ ...e, d: "hier" }))).toBeNull();
  });
});

describe("hors zone : carte des loyers", () => {
  const rennes = (JSON.parse(readFileSync(join(__dirname, "../data/carte-loyers/35.json"), "utf-8")) as Record<string, CommuneCarte>)["35238"];
  it("Rennes a des indicateurs", () => {
    expect(rennes.n).toMatch(/Rennes/);
    expect(rennes.app12).toBeDefined();
  });
  it("choisit la typologie selon les pièces et le type", () => {
    const c: CommuneCarte = { n: "X", app: [10, 8, 12, 1], app12: [12, 10, 14, 1], app3: [9, 7, 11, 1], maison: [8, 6, 10, 0] };
    expect(estimerHorsZone(c, { pieces: 2, maison: false, surface: 40 })).toMatchObject({ typologie: "appartement 1-2 pièces", mensuel: 480 });
    expect(estimerHorsZone(c, { pieces: 3, maison: false, surface: 60 })).toMatchObject({ mensuel: 540, mensuelBas: 420, mensuelHaut: 660 });
    expect(estimerHorsZone(c, { pieces: 5, maison: true, surface: 100 })).toMatchObject({ typologie: "maison", precisionCommune: false });
    expect(estimerHorsZone({ n: "Y" }, { pieces: 1, maison: false, surface: 20 })).toBeNull();
  });
});
