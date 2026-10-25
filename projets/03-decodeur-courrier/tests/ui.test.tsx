import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TYPES } from "@/donnees";
import { decoder } from "@/decodeur";
import { FicheDecodage } from "@/components/FicheDecodage";
import { GenerateurLettre } from "@/components/GenerateurLettre";
import { Orientation } from "@/components/Orientation";
import { TexteSurligne } from "@/components/TexteSurligne";
import { Decodeur } from "@/components/Decodeur";

// Rendu serveur des composants (sans navigateur) : vérifie qu'aucun type de courrier ne fait planter l'interface.
const dossier = join(__dirname, "corpus");
const aujourdhui = new Date(Date.UTC(2026, 9, 25));

describe("rendu des composants", () => {
  it("la page d'accueil s'affiche avec l'avertissement", () => {
    const html = renderToStaticMarkup(<Decodeur />);
    expect(html).toContain("aide à la compréhension");
    expect(html).toContain("Décoder ce courrier");
  });

  for (const f of readdirSync(dossier).filter((x) => x.endsWith(".txt"))) {
    it(`fiche, lettre, glossaire et contacts : ${f}`, () => {
      const texte = readFileSync(join(dossier, f), "utf8");
      const { classification, extraction } = decoder(texte);
      const type = classification.meilleur!.type;
      const reception = extraction.dateCourrier?.date ?? null;
      const html = renderToStaticMarkup(
        <>
          <FicheDecodage
            type={type}
            extraction={extraction}
            dates={{ reception, dateCourrier: reception, dateLimite: extraction.dateLimite?.date ?? null }}
            aujourdhui={aujourdhui}
            alsaceMoselle={false}
          />
          <GenerateurLettre type={type} extraction={extraction} reception={reception} />
          <TexteSurligne texte={texte} />
          <Orientation type={type} />
        </>,
      );
      for (const bloc of ["C&#x27;est quoi ?", "Ce que je risque", "Ce que je dois faire", "Délai"]) expect(html).toContain(bloc);
      expect(html).toContain("Comment l&#x27;envoyer");
      expect(html).toMatch(/Source/);
    });
  }

  it("tous les types (même hors corpus) se rendent sans date", () => {
    const vide = decoder("texte sans rien");
    for (const type of TYPES) {
      const html = renderToStaticMarkup(
        <FicheDecodage type={type} extraction={vide.extraction} dates={{ reception: null, dateCourrier: null, dateLimite: null }} aujourdhui={aujourdhui} alsaceMoselle={false} />,
      );
      expect(html).toContain("Délai");
    }
  });
});
