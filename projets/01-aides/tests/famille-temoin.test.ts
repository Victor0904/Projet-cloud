// Famille témoin du cahier des charges : couple, 2 enfants, locataire à Nancy, 2 400 € nets par mois.
// Hypothèses complémentaires (non fixées par le PROMPT) : salaires 1 500 € + 900 €, enfants de 4 et 8 ans,
// loyer de 750 € hors charges, pas d'autre revenu, revenu fiscal estimé par le simulateur.
import { describe, expect, it } from "vitest";
import { evaluer } from "../src/moteur";
import { NANCY, situation } from "./fixtures";

const famille = situation({
  demandeur: { age: 38, activite: "salarie", revenusActivite: 1500 },
  conjoint: { age: 36, activite: "salarie", revenusActivite: 900 },
  enfants: [4, 8],
  logement: { statut: "locataire", loyer: 750, commune: NANCY },
});

describe("Famille témoin — Nancy", () => {
  const bilan = evaluer(famille);
  const resume = bilan.eligibles.map((r) => ({
    aide: r.id,
    montant: r.montantEstime,
    periodicite: r.periodicite,
    confiance: r.confiance,
  }));

  it("propose les aides attendues", () => {
    expect(resume.map((r) => r.aide)).toEqual(
      expect.arrayContaining(["prime-activite", "allocations-familiales", "aide-logement", "ars"]),
    );
    expect(bilan.nonEligibles.map((r) => r.id)).toEqual(expect.arrayContaining(["rsa", "complement-familial", "maprimerenov"]));
  });

  it("trie par montant annuel décroissant", () => {
    const annuels = bilan.eligibles.map((r) => (r.periodicite === "mensuel" ? (r.montantEstime ?? 0) * 12 : (r.montantEstime ?? 0)));
    expect([...annuels].sort((a, b) => b - a)).toEqual(annuels);
  });

  it("chaque résultat cite au moins une source datée", () => {
    for (const r of [...bilan.eligibles, ...bilan.nonEligibles]) {
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) expect(s.verifie_le).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("liste figée (snapshot)", () => {
    expect({ totalAnnuel: bilan.totalAnnuel, aides: resume }).toMatchSnapshot();
  });
});
