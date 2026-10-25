import { describe, expect, it } from "vitest";
import { choisirMillesime, epoquesCandidates, trouverReference, zoneDuSecteur } from "../src/lib/reference";
import type { EpoqueSaisie, Logement } from "../src/lib/types";
import { millesime } from "./aide";

const logement = (pieces: number, epoque: EpoqueSaisie, meuble: boolean, maison = false): Logement => ({
  pieces,
  epoque,
  meuble,
  maison,
  surface: 30,
});

// Valeurs attendues relevées directement dans les fichiers sources (opendata.paris.fr 2025, data.grandlyon.com 2025-2026).
describe("loyer de référence : 10 combinaisons pièces × époque × meublé", () => {
  const paris = millesime("paris", "2025");
  const zoneStAmbroise = zoneDuSecteur(paris, "42");
  const zoneGrosCaillou = zoneDuSecteur(paris, "28");
  const lyon = millesime("lyon", "2025-2026");
  const zoneBellecour = zoneDuSecteur(lyon, "693820204");

  const cas: [string, ReturnType<typeof millesime>, string, Logement, [number, number, number]][] = [
    ["Paris 11e, 1 p., avant 1946, meublé", paris, zoneStAmbroise, logement(1, "avant-1946", true), [35.6, 42.7, 24.9]],
    ["Paris 11e, 1 p., avant 1946, vide", paris, zoneStAmbroise, logement(1, "avant-1946", false), [31.2, 37.4, 21.8]],
    ["Paris 11e, 2 p., 1946-1970, vide", paris, zoneStAmbroise, logement(2, "1946-1970", false), [24.1, 28.9, 16.9]],
    ["Paris 11e, 3 p., 1971-1990, meublé", paris, zoneStAmbroise, logement(3, "1971-1990", true), [27.2, 32.6, 19.0]],
    ["Paris 11e, 4 p., 1991-2005 → après 1990, vide", paris, zoneStAmbroise, logement(4, "1991-2005", false), [22.4, 26.9, 15.7]],
    ["Paris 11e, 6 p. → 4 et plus, après 2005, vide", paris, zoneStAmbroise, logement(6, "apres-2005", false), [22.4, 26.9, 15.7]],
    ["Paris 7e, 2 p., avant 1946, meublé", paris, zoneGrosCaillou, logement(2, "avant-1946", true), [34.9, 41.9, 24.4]],
    ["Lyon 2e, 1 p., avant 1946, meublé", lyon, zoneBellecour, logement(1, "avant-1946", true), [19.8, 23.8, 13.9]],
    ["Lyon 2e, 2 p., 1991-2005, vide", lyon, zoneBellecour, logement(2, "1991-2005", false), [15.4, 18.5, 10.8]],
    ["Lyon 2e, 3 p., après 2005, meublé", lyon, zoneBellecour, logement(3, "apres-2005", true), [15.4, 18.5, 10.8]],
    ["Lyon 2e, 4 p., 1946-1970, vide", lyon, zoneBellecour, logement(4, "1946-1970", false), [11.8, 14.2, 8.3]],
  ];
  for (const [nom, m, zone, l, [ref, majore, minore]] of cas) {
    it(nom, () => {
      const r = trouverReference(m, zone, l);
      expect(r).not.toBeNull();
      expect([r!.ref, r!.majore, r!.minore]).toEqual([ref, majore, minore]);
    });
  }

  it("époque inconnue : retient le plafond le plus haut", () => {
    const r = trouverReference(paris, zoneStAmbroise, logement(1, "inconnue", true))!;
    const tous = paris.lignes.filter((x) => x.zone === zoneStAmbroise && x.pieces === 1 && x.meuble);
    expect(r.majore).toBe(Math.max(...tous.map((x) => x.majore)));
    expect(r.remarques.join(" ")).toMatch(/inconnue/);
  });

  it("Bordeaux distingue maison et appartement", () => {
    const b = millesime("bordeaux", "2023");
    const app = trouverReference(b, "1", logement(1, "avant-1946", false, false))!;
    const mai = trouverReference(b, "1", logement(1, "avant-1946", false, true))!;
    expect(app.majore).toBe(21.7);
    expect(mai.majore).toBe(24.1);
  });

  it("zone inconnue → null", () => {
    expect(trouverReference(paris, "999", logement(1, "avant-1946", true))).toBeNull();
  });
});

describe("époques", () => {
  it("adapte les tranches fines aux villes à 4 tranches", () => {
    expect(epoquesCandidates("apres-2005", new Set(["avant-1946", "apres-1990"]))).toEqual(["apres-1990"]);
    expect(epoquesCandidates("1991-2005", new Set(["1991-2005", "apres-2005"]))).toEqual(["1991-2005"]);
  });
});

describe("choix de l'arrêté selon la date de signature", () => {
  const p: Record<string, [string, string]> = {
    "2023": ["2023-07-01", "2024-06-30"],
    "2024": ["2024-07-01", "2025-06-30"],
    "2025": ["2025-07-01", "2026-06-30"],
  };
  it("prend l'arrêté en vigueur à la signature", () => {
    expect(choisirMillesime(p, "2024-06-30")).toEqual({ id: "2023" });
    expect(choisirMillesime(p, "2024-07-01")).toEqual({ id: "2024" });
  });
  it("prévient quand la date sort des données", () => {
    expect(choisirMillesime(p, "2026-09-01").id).toBe("2025");
    expect(choisirMillesime(p, "2026-09-01").remarque).toBeTruthy();
    expect(choisirMillesime(p, "2020-01-01").id).toBe("2023");
  });
});
