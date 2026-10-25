import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Application } from "../src/components/Application";

// Rendu serveur de la page avec l'état par défaut (2 enfants, Nancy vs Metz) : vérifie qu'elle s'affiche sans erreur.
describe("rendu de l'application", () => {
  const html = renderToString(<Application />);
  it("affiche le QF, la comparaison, la crèche et le formulaire de contribution", () => {
    expect(html).toContain("Votre quotient familial CAF");
    expect(html).toContain("Coût annuel par prestation et par commune");
    expect(html).toContain("Crèche conventionnée CAF");
    expect(html).toContain("Proposer la grille de votre commune");
  });
  it("mentionne que les données restent sur l'appareil", () => {
    expect(html).toContain("Vos données restent sur votre appareil.");
  });
});
