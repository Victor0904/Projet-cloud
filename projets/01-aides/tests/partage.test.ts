import { describe, expect, it } from "vitest";
import { decoderSituation, encoderSituation, lireFragment, normaliserSituation } from "../src/lib/partage";
import { NANCY, situation } from "./fixtures";

describe("Lien de partage", () => {
  const s = situation({ conjoint: { revenusActivite: 900 }, enfants: [4, 8], logement: { commune: NANCY, loyer: 750 } });

  it("aller-retour sans perte", () => {
    expect(decoderSituation(encoderSituation(s))).toEqual(s);
    expect(lireFragment(`#s=${encoderSituation(s)}`)).toEqual(s);
  });

  it("refuse un lien corrompu", () => {
    expect(decoderSituation("n'importe-quoi")).toBeNull();
    expect(lireFragment("#autre=1")).toBeNull();
  });

  it("nettoie les valeurs hors bornes ou de mauvais type", () => {
    const r = normaliserSituation({
      demandeur: { age: "200", activite: "pirate", revenusActivite: -5 },
      enfants: [{ age: 3 }, { age: "x" }],
      logement: { statut: "chateau", loyer: 1e9, commune: { codeInsee: "<script>" } },
      complements: { tauxHandicap: "100" },
    })!;
    expect(r.demandeur).toEqual({ age: 120, activite: "sans_activite", revenusActivite: 0 });
    expect(r.enfants).toEqual([{ age: 3 }]);
    expect(r.logement.statut).toBe("locataire");
    expect(r.logement.loyer).toBe(20000);
    expect(r.logement.commune).toBeNull();
    expect(r.complements.tauxHandicap).toBeNull();
  });
});
