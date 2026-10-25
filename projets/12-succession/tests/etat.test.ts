import { describe, expect, it } from "vitest";
import {
  ajouterContratLibre,
  ajouterOrganisme,
  changerStatut,
  deserialiser,
  etatInitial,
  fusionner,
  marquerDemarche,
  organismesSuggeres,
  serialiser,
  type EtatApp,
} from "../src/etat/etat";
import { organisme } from "../src/lib/donnees";
import { PROFIL_VIDE } from "../src/plan/profil";

const jour = new Date(Date.UTC(2026, 2, 20));

function exemple(): EtatApp {
  let e = etatInitial();
  e = { ...e, profil: { ...PROFIL_VIDE, dateDeces: "2026-03-10", lien: "enfant" }, questionnaireValide: true };
  e = ajouterOrganisme(e, organisme("banque"));
  e = ajouterContratLibre(e, "Club de randonnée", "ADH-42");
  e = marquerDemarche(e, "declaration_deces", true, jour);
  return e;
}

describe("inventaire", () => {
  it("n'ajoute pas deux fois le même organisme", () => {
    const e = ajouterOrganisme(exemple(), organisme("banque"));
    expect(e.inventaire.filter((x) => x.organismeId === "banque")).toHaveLength(1);
  });

  it("ignore un contrat libre sans nom", () => {
    expect(ajouterContratLibre(exemple(), "   ").inventaire).toHaveLength(2);
  });

  it("date automatiquement l'envoi puis la réponse", () => {
    let e = changerStatut(exemple(), "banque", "en_attente", jour);
    expect(e.inventaire[0].dateEnvoi).toBe("2026-03-20");
    expect(e.inventaire[0].dateReponse).toBe("");
    e = changerStatut(e, "banque", "fait", new Date(Date.UTC(2026, 3, 2)));
    expect(e.inventaire[0].dateEnvoi).toBe("2026-03-20");
    expect(e.inventaire[0].dateReponse).toBe("2026-04-02");
    e = changerStatut(e, "banque", "a_prevenir", jour);
    expect(e.inventaire[0].dateEnvoi).toBe("");
  });

  it("suggère les organismes du plan", () => {
    const s = organismesSuggeres({ ...PROFIL_VIDE, dateDeces: "2026-03-10", logement: "proprietaire" });
    expect(s).toEqual(expect.arrayContaining(["mairie", "notaire", "syndic", "banque"]));
    expect(s).not.toContain("bailleur");
    expect(organismesSuggeres({ ...PROFIL_VIDE, dateDeces: "" })).toEqual([]);
  });

  it("démarche faite puis défaite", () => {
    const e = marquerDemarche(exemple(), "declaration_deces", false);
    expect(e.demarchesFaites.declaration_deces).toBeUndefined();
  });
});

describe("export / import JSON", () => {
  it("aller-retour sans perte", () => {
    const e = exemple();
    const r = deserialiser(serialiser(e));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.etat.profil).toEqual(e.profil);
      expect(r.etat.inventaire).toEqual(e.inventaire);
      expect(r.etat.demarchesFaites).toEqual({ declaration_deces: "2026-03-20" });
    }
  });

  it("refuse un fichier illisible ou étranger", () => {
    expect(deserialiser("pas du json").ok).toBe(false);
    expect(deserialiser(JSON.stringify({ application: "autre" })).ok).toBe(false);
    expect(deserialiser(JSON.stringify({ application: "vie-fr-12-succession", version: 99 })).ok).toBe(false);
  });

  it("nettoie les champs inattendus ou mal typés", () => {
    const brut = {
      application: "vie-fr-12-succession",
      version: 1,
      profil: { lien: "conjoint", animaux: "oui", inconnu: 3, ageConjoint: 60, union: "polygame" },
      inventaire: [{ id: "x", nom: "Test", statut: "bizarre" }, { pasDId: true }, "texte"],
      demarchesFaites: { a: "2026-01-01", b: 3 },
    };
    const r = deserialiser(JSON.stringify(brut));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.etat.profil.lien).toBe("conjoint");
      expect(r.etat.profil.animaux).toBe(false);
      expect(r.etat.profil.ageConjoint).toBe(60);
      expect(r.etat.profil.union).toBe(PROFIL_VIDE.union);
      expect("inconnu" in r.etat.profil).toBe(false);
      expect(r.etat.inventaire).toHaveLength(1);
      expect(r.etat.inventaire[0].statut).toBe("a_prevenir");
      expect(r.etat.demarchesFaites).toEqual({ a: "2026-01-01" });
    }
  });

  it("fusionne l'export d'une sœur : garde le plus récent, additionne les démarches faites", () => {
    const moi = exemple();
    const soeur: EtatApp = {
      ...moi,
      inventaire: moi.inventaire.map((e) =>
        e.id === "banque"
          ? { ...e, statut: "fait", majLe: "2999-01-01T00:00:00.000Z" }
          : { ...e, majLe: "2000-01-01T00:00:00.000Z" },
      ),
      demarchesFaites: { obseques: "2026-03-15" },
    };
    const soeurAvecAjout = ajouterOrganisme(soeur, organisme("mutuelle"));
    const f = fusionner(moi, soeurAvecAjout);
    expect(f.inventaire.find((e) => e.id === "banque")!.statut).toBe("fait");
    expect(f.inventaire.find((e) => e.nom === "Club de randonnée")!.majLe).not.toBe("2000-01-01T00:00:00.000Z");
    expect(f.inventaire.some((e) => e.id === "mutuelle")).toBe(true);
    expect(Object.keys(f.demarchesFaites).sort()).toEqual(["declaration_deces", "obseques"]);
  });
});
