import { describe, expect, it } from "vitest";
import { decouper, termesReperes } from "@/glossaire/reperer";
import { normaliser } from "@/extraction/normaliser";

describe("glossaire", () => {
  it("normaliser conserve la longueur", () => {
    const t = "Trop-perçu — échéancier, Œuvre l’indu";
    expect(normaliser(t).length).toBe(t.length);
  });
  it("repère les termes sans tenir compte des accents ni de la casse", () => {
    const ids = termesReperes("La FORCLUSION du recours ; l'indu est un titre exécutoire.").map((t) => t.id);
    expect(ids).toEqual(["forclusion", "indu", "titre-executoire"]);
  });
  it("le découpage restitue exactement le texte d'origine", () => {
    const t = "Mise en demeure : commandement de payer, signification le 3 mars.";
    const segs = decouper(t);
    expect(segs.map((s) => s.texte).join("")).toBe(t);
    expect(segs.filter((s) => s.terme).map((s) => s.texte)).toEqual(["Mise en demeure", "commandement de payer", "signification"]);
  });
  it("ne repère pas un terme à l'intérieur d'un mot", () => {
    expect(termesReperes("individuel, indult")).toEqual([]);
  });
});
