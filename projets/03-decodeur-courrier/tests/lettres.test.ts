import { describe, expect, it } from "vitest";
import { MODELES, lireModele, remplir } from "@/lettres/modeles";

describe("modèles de lettres", () => {
  it("lit l'en-tête", () => {
    const m = lireModele("x", "---\ntitre: Essai\nenvoi: lrar, simple\nconseil_envoi: Envoyez-la.\n---\nBonjour {{nom}}\n");
    expect(m).toMatchObject({ titre: "Essai", envoi: ["lrar", "simple"], conseil_envoi: "Envoyez-la." });
  });
  it("refuse un modèle sans en-tête", () => expect(() => lireModele("x", "Bonjour")).toThrow());
  it("remplace les variables et signale celles qui manquent", () => {
    const t = remplir("{{nom}} doit {{montant}} (réf. {{reference}})", { nom: "Camille Martin", montant: "742,18 €" });
    expect(t).toBe("Camille Martin doit 742,18 € (réf. [à compléter : référence du dossier])");
  });
  it("la lettre de recours CRA reprend référence, montant et date", () => {
    const t = remplir(MODELES["recours-cra"].corps, {
      reference: "1234567",
      reference_libelle: "N° allocataire",
      montant: "742,18 €",
      date_courrier: "3 mars 2026",
    });
    expect(t).toContain("N° allocataire : 1234567");
    expect(t).toContain("742,18 €");
    expect(t).toContain("décision du 3 mars 2026");
  });
});
