import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lireCarteScolaire } from "../src/lib/import/secteurs.ts";
import { trouverSecteur } from "../src/lib/secteur.ts";
import type { FichierSecteurs } from "../src/lib/types.ts";
import { echantillon } from "./aide.ts";

const carte = lireCarteScolaire(echantillon.carte_scolaire, {
  departement: "54",
  source: { titre: "test", url: "https://exemple", telecharge_le: "2026-10-25" },
});
const nancy = (voie: string | null, numero: string | null) => trouverSecteur(carte, { codeInsee: "54395", voie, numero });

describe("Mon secteur", () => {
  it("département sans carte publiée → message dédié", () => {
    expect(trouverSecteur(null, { codeInsee: "31555", voie: "Rue X", numero: "1" })).toEqual({ statut: "non_publie" });
  });
  it("commune absente de la carte", () => {
    expect(trouverSecteur(carte, { codeInsee: "54999", voie: null, numero: null }).statut).toBe("commune_absente");
  });
  it("commune à secteur unique", () => {
    const r = trouverSecteur(carte, { codeInsee: "54013", voie: null, numero: null });
    expect(r).toMatchObject({ statut: "trouve", precision: "commune", colleges: ["0540011U"] });
  });
  it("trouve le collège par voie et numéro, quelle que soit l'écriture de la voie", () => {
    expect(nancy("Rue de la Prairie", "12")).toMatchObject({ statut: "trouve", colleges: ["0541817G"] });
    expect(nancy("Allée de Beauregard", "12")).toMatchObject({ statut: "trouve", colleges: ["0540110B"] });
    expect(nancy("Rue de l'Abbé Grégoire", "3")).toMatchObject({ statut: "trouve" });
    expect(nancy("Place Stanislas", "1")).toMatchObject({ statut: "trouve" });
    expect(nancy("Rue St-Dizier", "40")).toMatchObject({ statut: "trouve" });
  });
  it("voie partagée sans numéro → plusieurs collèges possibles", () => {
    const voie = Object.values(carte.communes["54395"].voies).find((v) => new Set(v.troncons.map((t) => t[3])).size > 1);
    if (!voie) return; // l'échantillon ne contient pas de voie partagée
    expect(nancy(voie.libelle, null).statut).toBe("plusieurs");
  });
  it("voie inconnue → liste des collèges de la commune", () => {
    const r = nancy("Rue qui n'existe pas", "1");
    expect(r.statut).toBe("voie_inconnue");
    if (r.statut === "voie_inconnue") expect(r.colleges.length).toBeGreaterThan(0);
  });

  const fichier = join(import.meta.dirname, "..", "public", "donnees", "054", "secteurs.json");
  it.runIf(existsSync(fichier))("sur la carte réelle du 54 : la place Stanislas a un collège de secteur", () => {
    const vraie = JSON.parse(readFileSync(fichier, "utf8")) as FichierSecteurs;
    const r = trouverSecteur(vraie, { codeInsee: "54395", voie: "Place Stanislas", numero: "1" });
    expect(r.statut).toBe("trouve");
  });
});
