import { describe, expect, it } from "vitest";
import { SAISIE_VIDE, validerSaisie, type Saisie } from "../src/lib/saisie";

const adresse = { label: "100 Rue Oberkampf 75011 Paris", codeInsee: "75111", codePostal: "75011", ville: "Paris", lon: 2.3785, lat: 48.8655, score: 0.9 };
const ok: Saisie = { ...SAISIE_VIDE, adresse, adresseTexte: adresse.label, surface: "20,5", loyer: "950", dateSignature: "2025-09-01", meuble: "oui" };

describe("validation de la saisie", () => {
  it("accepte une saisie complète (virgule décimale comprise)", () => {
    const r = validerSaisie(ok, "2026-10-25");
    expect(r.ok && r.valeurs).toMatchObject({ surface: 20.5, loyer: 950, meuble: true, complement: 0, charges: 0 });
  });
  it("liste les erreurs en français", () => {
    const r = validerSaisie({ ...SAISIE_VIDE }, "2026-10-25");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.length).toBeGreaterThanOrEqual(4);
  });
  it("refuse un bail signé dans le futur et un complément supérieur au loyer", () => {
    const r = validerSaisie({ ...ok, dateSignature: "2027-01-01", complement: "1000" }, "2026-10-25");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.join(" ")).toMatch(/futur.*|complément/);
  });
  it("accepte une ville choisie à la main sans adresse", () => {
    expect(validerSaisie({ ...ok, adresse: null, villeManuelle: "lille" }, "2026-10-25").ok).toBe(true);
  });
});
