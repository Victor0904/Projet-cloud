import { describe, expect, it } from "vitest";
import { organisme } from "../src/lib/donnees";
import { genererLettre, INFOS_VIDES, TYPES_LETTRES, type InfosLettre } from "../src/lettres/modeles";

const infos: InfosLettre = {
  ...INFOS_VIDES,
  expediteurNom: "Claire Martin",
  expediteurAdresse: "3 rue des Lilas\n69003 Lyon",
  qualite: "fille de la personne décédée",
  defuntNom: "Jean Martin",
  dateDeces: "2026-03-10",
  reference: "AB-123",
  ville: "Lyon",
};
const jour = new Date(2026, 2, 20);

describe("modèles de lettres", () => {
  it("chaque modèle produit une lettre complète", () => {
    for (const t of TYPES_LETTRES) {
      const l = genererLettre(t.id, infos, undefined, jour);
      expect(l.texte).toContain("Claire Martin");
      expect(l.texte).toContain("Jean Martin");
      expect(l.texte).toContain("10 mars 2026");
      expect(l.texte).toContain("Lyon, le 20 mars 2026");
      expect(l.texte).toContain("Madame, Monsieur,");
      expect(l.piecesJointes.length).toBeGreaterThan(0);
      expect(l.texte).not.toContain("undefined");
    }
  });

  it("met la mention recommandée quand l'envoi conseillé est la LRAR", () => {
    const l = genererLettre("resiliation", infos, organisme("telecom"), jour);
    expect(l.envoi).toBe("lrar");
    expect(l.texte).toContain("Lettre recommandée avec accusé de réception");
    expect(l.texte).toContain("AB-123");
  });

  it("information simple : courrier simple si l'organisme ne demande pas de LRAR", () => {
    const l = genererLettre("information_deces", infos, organisme("caf"), jour);
    expect(l.envoi).toBe("courrier");
    expect(l.texte).not.toContain("Lettre recommandée");
  });

  it("bail : transfert ou résiliation", () => {
    const transfert = genererLettre("resiliation", { ...infos, transfertBail: true }, organisme("bailleur"), jour);
    expect(transfert.objet).toMatch(/transfert du bail/);
    const resil = genererLettre("resiliation", infos, organisme("bailleur"), jour);
    expect(resil.texte).toMatch(/état des lieux/);
  });

  it("champs vides : repères entre crochets plutôt que du vide", () => {
    const l = genererLettre("information_deces", INFOS_VIDES, organisme("banque"), jour);
    expect(l.texte).toContain("[vos nom et prénom]");
    expect(l.texte).toContain("[date du décès]");
    expect(l.texte).toContain(organisme("banque").nom);
  });

  it("mentionne le notaire s'il est renseigné", () => {
    const l = genererLettre("information_deces", { ...infos, notaire: "Me Durand, Lyon" }, undefined, jour);
    expect(l.texte).toContain("Me Durand, Lyon");
  });
});
