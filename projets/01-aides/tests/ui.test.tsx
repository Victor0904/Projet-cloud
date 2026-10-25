// Rendu serveur rapide des composants principaux : vérifie qu'ils s'affichent sans erreur.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Resultats } from "../src/composants/Resultats";
import { Simulateur } from "../src/composants/Simulateur";
import { NANCY, situation } from "./fixtures";

describe("Interface", () => {
  it("affiche la première étape du formulaire", () => {
    const html = renderToString(<Simulateur />);
    expect(html).toContain("Votre foyer");
    expect(html).toContain("Votre âge");
  });

  it("affiche les résultats de la famille témoin avec badges, sources et démarches", () => {
    const s = situation({
      demandeur: { revenusActivite: 1500 },
      conjoint: { revenusActivite: 900 },
      enfants: [4, 8],
      logement: { loyer: 750, commune: NANCY },
    });
    const html = renderToString(<Resultats s={s} maj={() => {}} modifier={() => {}} />);
    expect(html).toContain("Prime d&#x27;activité");
    expect(html).toContain("Probable");
    expect(html).toContain("Faire la démarche officielle");
    expect(html).toContain("vérifié le");
  });

  it("affiche une question inline pour une aide à vérifier", () => {
    const s = situation({ particulier: { handicap: true } });
    const html = renderToString(<Resultats s={s} maj={() => {}} modifier={() => {}} />);
    expect(html).toContain("Taux d&#x27;incapacité reconnu par la MDPH");
    expect(html).toContain("À vérifier");
  });
});
