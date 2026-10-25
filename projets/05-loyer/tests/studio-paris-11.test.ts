// Cas figé : studio meublé de 20 m² à Paris 11e (100 rue Oberkampf), 950 € hors charges.
import { describe, expect, it } from "vitest";
import { analyser } from "../src/lib/analyse";
import { genererLettre, lettreEnTexte } from "../src/lib/lettre";
import { secteurDuPoint, villeParId } from "../src/lib/territoire";
import { millesime, zones } from "./aide";

describe("studio meublé Paris 11e à 950 €", () => {
  const secteur = secteurDuPoint(zones("paris"), 2.3785, 48.8655)!;
  const a = analyser({
    ville: villeParId("paris")!,
    millesimes: ["2023", "2024", "2025"].map((id) => millesime("paris", id)),
    secteur: secteur.secteur,
    logement: { pieces: 1, epoque: "avant-1946", meuble: true, maison: false, surface: 20 },
    bail: { loyerHorsCharges: 950, complement: 0, dateSignature: "2025-09-01" },
    aujourdhui: "2026-10-25",
    interdictions: [],
  })!;

  it("dépasse le plafond de 96 € par mois", () => {
    expect(a.millesime.millesime).toBe("2025");
    expect(a.verdict.plafond).toBe(854);
    expect(a.verdict.depassementMensuel).toBe(96);
    expect(a.verdict.depassementAnnuel).toBe(1152);
    expect(a.tropPercu.montant).toBe(1248);
  });

  it("résultat et lettre figés", () => {
    const { ville, millesime: m, ...reste } = a;
    const lettre = genererLettre({
      locataireNom: "Camille Martin",
      locataireAdresse: "100 rue Oberkampf, 75011 Paris",
      bailleurNom: "",
      bailleurAdresse: "",
      adresseLogement: "100 rue Oberkampf, 75011 Paris",
      ville: ville.nom,
      dateSignature: "2025-09-01",
      dateLettre: "2026-10-25",
      surface: 20,
      loyerBase: a.verdict.loyerBase,
      plafond: a.verdict.plafond,
      loyerDemande: Math.min(a.verdict.loyerBase, a.verdict.plafond),
      loyerReferenceMajoreM2: a.reference.majore,
      depassementMensuel: a.verdict.depassementMensuel,
      complement: 0,
      complementContestable: false,
      raisonsComplement: [],
      tropPercu: a.tropPercu.montant,
      tropPercuDepuis: a.tropPercu.depuis,
      delaiReponseJours: 30,
      arrete: m.arrete,
    });
    expect({ ville: ville.id, millesime: m.millesime, quartier: secteur.nom, ...reste }).toMatchSnapshot();
    expect(lettreEnTexte(lettre)).toMatchSnapshot();
  });
});
