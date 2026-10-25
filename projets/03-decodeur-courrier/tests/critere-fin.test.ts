import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculerDelais, decoder } from "@/decodeur";
import { MODELES, remplir } from "@/lettres/modeles";
import { referencePrincipale } from "@/extraction/extraire";
import { dateLongue, euros } from "@vie-fr/fr-data";

// Critère de fin du PROMPT : un courrier CAF d'indu collé produit en moins de 10 s une explication,
// la date limite de contestation et une lettre de recours prête à imprimer.
describe("critère de fin : courrier CAF d'indu", () => {
  it("explication + date limite + lettre en moins de 10 secondes", () => {
    const debut = performance.now();
    const texte = readFileSync(join(__dirname, "corpus", "01-caf-indu.txt"), "utf8");
    const { classification, extraction } = decoder(texte);
    const type = classification.meilleur!.type;
    expect(type.id).toBe("caf-indu");
    expect(type.cestQuoi).toMatch(/indu/);

    const reception = extraction.dateCourrier!.date;
    const [cra] = calculerDelais(type, { reception, dateCourrier: reception, dateLimite: null });
    expect(cra.delai.id).toBe("cra");
    expect(cra.calcul!.date.toISOString().slice(0, 10)).toBe("2026-05-03");

    const ref = referencePrincipale(extraction.references)!;
    const lettre = remplir(MODELES[type.lettres[0]].corps, {
      reference: ref.valeur,
      reference_libelle: ref.libelle,
      montant: euros(extraction.montantPrincipal!.valeur),
      date_courrier: dateLongue(extraction.dateCourrier!.date),
    });
    expect(lettre).toContain("Commission de recours amiable");
    expect(lettre).toContain("742,18 €");
    expect(lettre).toContain("3 mars 2026");
    expect(performance.now() - debut).toBeLessThan(10_000);
  });
});
