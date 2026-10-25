import { describe, expect, it } from "vitest";
import {
  capitalDecesIndependant,
  droitsApplicables,
  estimerReversionBase,
  estimerReversionComplementaire,
  estimerVeuvage,
} from "../src/droits/calcul";
import { valeurDroit } from "../src/lib/donnees";
import { PROFIL_VIDE, type Profil } from "../src/plan/profil";

const profil = (p: Partial<Profil>): Profil => ({ ...PROFIL_VIDE, dateDeces: "2026-03-10", ...p });
const droit = (p: Partial<Profil>, id: string) => droitsApplicables(profil(p)).find((d) => d.id === id)!;

describe("estimations", () => {
  it("capital décès d'un indépendant = 20 % du PASS", () => {
    const pass = valeurDroit("pass_annuel").valeur;
    expect(capitalDecesIndependant()).toBeCloseTo(pass * 0.2, 2);
    expect(capitalDecesIndependant(true)).toBeCloseTo(pass * 0.08, 2);
  });

  it("allocation de veuvage : maximum sans ressources, différentielle sinon, nulle au-delà du plafond", () => {
    const max = valeurDroit("veuvage_montant_max").valeur;
    const plafond = valeurDroit("veuvage_plafond_trimestriel").valeur;
    expect(estimerVeuvage(0)).toBe(max);
    expect(estimerVeuvage(500)).toBeCloseTo(plafond / 3 - 500, 2);
    expect(estimerVeuvage(plafond / 3 + 1)).toBe(0);
    expect(estimerVeuvage(-100)).toBe(max);
  });

  it("réversion de base : 54 %, réduite au-delà du plafond", () => {
    const plafond = valeurDroit("reversion_plafond_seul").valeur;
    const r1 = estimerReversionBase(1000, 10000);
    expect(r1).toEqual({ theorique: 540, estimee: 540, reduite: false });
    const r2 = estimerReversionBase(1000, plafond - 3000);
    expect(r2.reduite).toBe(true);
    expect(r2.estimee).toBe(250);
    const r3 = estimerReversionBase(1000, plafond + 1);
    expect(r3.estimee).toBe(0);
  });

  it("réversion de base : plafond couple plus élevé", () => {
    const seul = estimerReversionBase(1000, 22000);
    const couple = estimerReversionBase(1000, 22000, true);
    expect(couple.estimee).toBeGreaterThan(seul.estimee);
  });

  it("réversion complémentaire : 60 %", () => {
    expect(estimerReversionComplementaire(500)).toBe(300);
  });
});

describe("droits selon le profil", () => {
  it("salarié : capital décès forfaitaire probable", () => {
    const d = droit({ activite: "salarie", lien: "enfant" }, "capital_deces");
    expect(d.eligibilite).toBe("probable");
    expect(d.montant).toMatch(/€/);
    expect(d.valeurs[0].source).toMatch(/^https:\/\//);
  });

  it("proche sans lien : pas de capital décès ni de congé", () => {
    expect(droit({ lien: "sans_lien", activite: "salarie" }, "capital_deces").eligibilite).toBe("non_concerne");
    expect(droit({ lien: "sans_lien" }, "conge").eligibilite).toBe("non_concerne");
  });

  it("conjoint marié de 70 ans : réversion probable, pas de veuvage", () => {
    const p = { lien: "conjoint" as const, union: "marie" as const, ageConjoint: 70, activite: "retraite" as const };
    expect(droit(p, "reversion").eligibilite).toBe("probable");
    expect(droit(p, "reversion_complementaire").eligibilite).toBe("probable");
    expect(droit(p, "veuvage").eligibilite).toBe("non_concerne");
  });

  it("conjoint marié de 45 ans : veuvage possible, réversion plus tard", () => {
    const p = { lien: "conjoint" as const, union: "marie" as const, ageConjoint: 45 };
    expect(droit(p, "veuvage").eligibilite).toBe("possible");
    expect(droit(p, "reversion").eligibilite).toBe("possible");
  });

  it("Pacs : pas de réversion, avec explication", () => {
    const d = droit({ lien: "conjoint", union: "pacse" }, "reversion");
    expect(d.eligibilite).toBe("non_concerne");
    expect(d.explication).toMatch(/Pacs/);
  });

  it("enfants mineurs : ASF probable", () => {
    expect(droit({ lien: "conjoint", union: "marie", enfantsMineurs: true }, "asf").eligibilite).toBe("probable");
    expect(droit({ enfantsMineurs: false }, "asf").eligibilite).toBe("non_concerne");
  });

  it("parent d'un enfant de moins de 25 ans : congé allongé et deuil", () => {
    const d = droit({ lien: "parent", procheSalarie: true, defuntJeuneOuParent: true }, "conge");
    expect(d.montant).toBe("14 jours ouvrables + 8 jours de deuil");
  });

  it("les droits concernés sont listés en premier", () => {
    const liste = droitsApplicables(profil({ lien: "enfant" }));
    const rangs = liste.map((d) => ["probable", "possible", "non_concerne"].indexOf(d.eligibilite));
    expect([...rangs].sort()).toEqual(rangs);
  });
});
