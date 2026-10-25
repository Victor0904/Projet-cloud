import { describe, expect, it } from "vitest";
import { adresseApproximative, departement, secteurDuPoint, territoireDeLaCommune } from "../src/lib/territoire";
import { zones } from "./aide";

// Point-dans-polygone sur 3 adresses connues par ville (coordonnées du géocodeur, arrondies).
const CAS: Record<string, [string, number, number, string][]> = {
  paris: [
    ["Hôtel de Ville (4e)", 2.3522, 48.8566, "Saint-Merri"],
    ["100 rue Oberkampf (11e)", 2.3785, 48.8655, "Saint-Ambroise"],
    ["Tour Eiffel (7e)", 2.2945, 48.8584, "Gros-Caillou"],
  ],
  lyon: [
    ["Place Bellecour", 4.832, 45.7578, "69382"],
    ["Hôtel de ville de Villeurbanne", 4.88, 45.7665, "69266"],
    ["Gare de la Part-Dieu", 4.859, 45.7605, "69383"],
  ],
  montpellier: [
    ["Place de la Comédie", 3.8797, 43.6086, "1"],
    ["Antigone", 3.888, 43.608, "2"],
    ["Zoo du Lunaret", 3.874, 43.64, "2"],
  ],
  "est-ensemble": [
    ["Mairie de Montreuil", 2.4417, 48.862, "93048"],
    ["Mairie de Pantin", 2.405, 48.8945, "93055"],
    ["Préfecture à Bobigny", 2.44, 48.907, "93008"],
  ],
  "plaine-commune": [
    ["Basilique de Saint-Denis", 2.3597, 48.9355, "93066"],
    ["Mairie d'Aubervilliers", 2.383, 48.9146, "93001"],
    ["Mairie de Saint-Ouen", 2.333, 48.9118, "93070"],
  ],
};

describe("point dans polygone", () => {
  for (const [ville, cas] of Object.entries(CAS)) {
    const z = zones(ville);
    for (const [nom, lon, lat, attendu] of cas) {
      it(`${ville} — ${nom}`, () => {
        const s = secteurDuPoint(z, lon, lat);
        expect(s).not.toBeNull();
        expect([s!.nom, s!.insee, s!.secteur]).toContain(attendu);
      });
    }
  }

  it("un point hors de Paris n'est dans aucun quartier", () => {
    expect(secteurDuPoint(zones("paris"), 2.2, 48.7)).toBeNull();
  });
});

describe("territoire de la commune", () => {
  it("reconnaît un arrondissement de Paris, Villeurbanne, Lille et Bordeaux", () => {
    expect(territoireDeLaCommune("75111")).toMatchObject({ type: "encadre", ville: { id: "paris" } });
    expect(territoireDeLaCommune("69266")).toMatchObject({ type: "encadre", ville: { id: "lyon" } });
    expect(territoireDeLaCommune("59350")).toMatchObject({ type: "encadre", ville: { id: "lille", geolocalisation: "manuelle" } });
    expect(territoireDeLaCommune("33063")).toMatchObject({ type: "encadre", ville: { id: "bordeaux" } });
  });
  it("signale les territoires encadrés mais non couverts", () => {
    expect(territoireDeLaCommune("64102").type).toBe("non-couvert");
  });
  it("classe le reste hors zone", () => {
    expect(territoireDeLaCommune("35238").type).toBe("hors-zone");
  });
  it("calcule le département", () => {
    expect(departement("75111")).toBe("75");
    expect(departement("2A004")).toBe("2A");
    expect(departement("97411")).toBe("974");
  });
  it("retire le numéro de l'adresse partagée", () => {
    expect(adresseApproximative("100 Rue Oberkampf 75011 Paris")).toBe("Rue Oberkampf 75011 Paris");
    expect(adresseApproximative("12 bis Rue de la Paix 75002 Paris")).toBe("Rue de la Paix 75002 Paris");
    expect(adresseApproximative("Rue de la Paix 75002 Paris")).toBe("Rue de la Paix 75002 Paris");
  });
});
