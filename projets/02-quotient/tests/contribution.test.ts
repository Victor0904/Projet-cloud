import { describe, expect, it } from "vitest";
import { construireGrille, lireNombre, saisieVide, texteIssue } from "../src/lib/contribution";
import { validerGrille } from "../src/lib/validation";

describe("contribution", () => {
  it("transforme une saisie en grille valide", () => {
    const s = saisieVide();
    s.commune = "Épinal";
    s.codeInsee = "88160";
    s.source = "https://www.epinal.fr/tarifs";
    s.prestations.cantine.lignes = [
      { jusqua: "500", tarif: "1,20" },
      { jusqua: "1000", tarif: "3,10 €" },
      { jusqua: "", tarif: "4.50" },
    ];
    const g = construireGrille(s, "2026-10-25");
    expect(validerGrille(g)).toEqual([]);
    expect(g.prestations.cantine.tranches).toEqual([
      { de: 0, a: 500, tarif: 1.2 },
      { de: 500, a: 1000, tarif: 3.1 },
      { de: 1000, a: null, tarif: 4.5 },
    ]);
    expect(g.prestations.garderie_soir.statut).toBe("A_VERIFIER");
    expect(texteIssue(g)).toContain("passe la validation");
  });

  it("signale les erreurs dans le texte d'issue", () => {
    const s = saisieVide();
    s.prestations.cantine.lignes = [{ jusqua: "800", tarif: "2" }, { jusqua: "500", tarif: "3" }];
    const g = construireGrille(s, "2026-10-25");
    const erreurs = validerGrille(g);
    expect(erreurs.length).toBeGreaterThan(0);
    expect(texteIssue(g)).toContain("Points à corriger");
  });

  it("lit les nombres à la française", () => {
    expect(lireNombre("1 234,5 €")).toBe(1234.5);
    expect(Number.isNaN(lireNombre(""))).toBe(true);
  });
});
