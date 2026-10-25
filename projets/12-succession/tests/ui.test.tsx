// Test de fumée des écrans : chaque vue se rend sans erreur pour les profils types (rendu serveur, sans navigateur).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Assistant } from "../src/components/Assistant";
import { Questionnaire } from "../src/components/Questionnaire";
import { VueDroits } from "../src/components/VueDroits";
import { VueInventaire } from "../src/components/VueInventaire";
import { VueLettres } from "../src/components/VueLettres";
import { VuePartage } from "../src/components/VuePartage";
import { VuePlan } from "../src/components/VuePlan";
import { ajouterContratLibre, ajouterOrganisme, etatInitial, organismesSuggeres } from "../src/etat/etat";
import { isoVersDate } from "../src/lib/dates";
import { organisme } from "../src/lib/donnees";
import { INFOS_VIDES } from "../src/lettres/modeles";
import { genererPlan } from "../src/plan/generer";
import { PROFIL_VIDE, type Profil } from "../src/plan/profil";

const rien = () => {};
const PROFILS: Partial<Profil>[] = [
  { lien: "conjoint", union: "marie", logement: "locataire", ageConjoint: 50, enfantsMineurs: true },
  { lien: "enfant", logement: "proprietaire" },
  { lien: "parent", activite: "independant", entreprise: true, defuntJeuneOuParent: true },
  { lien: "sans_lien" },
];

describe("écrans", () => {
  it("l'assistant s'affiche (questionnaire au premier rendu)", () => {
    const html = renderToStaticMarkup(<Assistant />);
    expect(html).toContain("Nous sommes désolés pour votre perte");
  });

  for (const p of PROFILS) {
    const profil: Profil = { ...PROFIL_VIDE, dateDeces: "2026-03-10", ...p };
    it(`toutes les vues se rendent pour le profil « ${profil.lien} »`, () => {
      const plan = genererPlan(profil)!;
      const aujourdhui = isoVersDate("2026-03-12")!;
      const htmlPlan = renderToStaticMarkup(
        <VuePlan
          plan={plan}
          profil={profil}
          demarchesFaites={{ declaration_deces: "2026-03-11" }}
          aujourdhui={aujourdhui}
          onToggle={rien}
          onLettre={rien}
          onModifier={rien}
        />,
      );
      expect(htmlPlan).toContain("Déclarer le décès à la mairie");
      expect(htmlPlan).toContain("Les premiers jours");
      expect(htmlPlan).toContain("consulté le");

      renderToStaticMarkup(<Questionnaire profil={profil} onChange={rien} onValider={rien} />);

      let etat = { ...etatInitial(), profil, questionnaireValide: true };
      etat = ajouterOrganisme(etat, organisme("banque"));
      etat = ajouterContratLibre(etat, "Club", "X1");
      const htmlInv = renderToStaticMarkup(
        <VueInventaire
          inventaire={etat.inventaire}
          suggeres={organismesSuggeres(profil)}
          onAjouter={rien}
          onAjouterSuggeres={rien}
          onAjouterLibre={rien}
          onRetirer={rien}
          onStatut={rien}
          onModifier={rien}
          onLettre={rien}
        />,
      );
      expect(htmlInv).toContain("Catalogue des organismes");

      const htmlLettre = renderToStaticMarkup(
        <VueLettres
          infos={INFOS_VIDES}
          profil={profil}
          selection={{ type: "resiliation", organisme: "bailleur" }}
          onInfos={rien}
          onSelection={rien}
        />,
      );
      expect(htmlLettre).toContain("Madame, Monsieur,");

      const htmlDroits = renderToStaticMarkup(<VueDroits profil={profil} onVoirDemarche={rien} />);
      expect(htmlDroits).toContain("Droits et aides");

      renderToStaticMarkup(<VuePartage etat={etat} onRemplacer={rien} onFusionner={rien} onEffacer={rien} />);
    });
  }
});
