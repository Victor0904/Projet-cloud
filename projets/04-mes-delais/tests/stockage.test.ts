import { describe, expect, it } from "vitest";
import { comparerUrgence, urgence } from "../src/lib/calcul";
import { catalogue } from "../src/lib/catalogue";
import { ajouterMois, alerteJourNonOuvre, ecartJours, estIso, relatif } from "../src/lib/dates";
import { aNotifier, texteNotification } from "../src/lib/notifications";
import { decoderLien, encoderLien, fusionner, validerEtat } from "../src/lib/stockage";
import type { Etat, Resultat } from "../src/lib/types";
import { lignes } from "../src/lib/vue";

const AUJ = "2026-10-25";

const etat: Etat = {
  version: 1,
  membres: [
    { id: "m1", nom: "Léa", genre: "personne" },
    { id: "m2", nom: "Zoé", genre: "personne" },
    { id: "v1", nom: "Kangoo", genre: "vehicule" },
  ],
  echeances: [
    { id: "a", typeId: "ct-voiture", membreId: "v1", dates: { mise_en_circulation: "2020-01-01" }, creeLe: AUJ },
    { id: "b", typeId: "cni", varianteId: "format-carte", membreId: "m1", dates: { date_delivrance: "2022-03-01" }, creeLe: AUJ },
    { id: "c", typeId: "passeport", varianteId: "mineur", membreId: "m2", dates: { date_delivrance: "2021-10-30" }, creeLe: AUJ },
    { id: "d", typeId: "libre", libelle: "Révision vélo", dates: {}, libre: { date: "2027-01-05", recurrenceMois: 12 }, parametres: { x: 1 }, derniere: { echeance: "2026-01-05", faitLe: "2026-01-04" }, creeLe: AUJ },
  ],
};

describe("catalogue", () => {
  it("contient au moins 30 types, chacun avec source, date de vérification et statut", () => {
    expect(catalogue.types.length).toBeGreaterThanOrEqual(30);
    for (const t of catalogue.types) {
      if (t.id === "libre") continue;
      expect(t.source, t.id).toMatch(/^https:\/\//);
      expect(estIso(t.verifie_le), t.id).toBe(true);
      expect(["recoupe", "verifie", "A_VERIFIER"]).toContain(t.statut);
      expect(t.demarche.url, t.id).toMatch(/^https:\/\//);
      expect(catalogue.categories.map((c) => c.id)).toContain(t.categorie);
    }
  });

  it("les identifiants sont uniques et les champs de règle existent", () => {
    const ids = catalogue.types.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of catalogue.types) {
      const r = t.regle as { champ?: string; champ_dernier?: string };
      if (r.champ) expect(t.champs.map((c) => c.id), t.id).toContain(r.champ);
      if (r.champ_dernier) expect(t.champs.map((c) => c.id), t.id).toContain(r.champ_dernier);
    }
  });
});

describe("dates", () => {
  it("ajoute des mois en ramenant au dernier jour du mois", () => {
    expect(ajouterMois("2024-02-29", 12)).toBe("2025-02-28");
    expect(ajouterMois("2024-02-29", 48)).toBe("2028-02-29");
    expect(ajouterMois("2026-03-31", -1)).toBe("2026-02-28");
    expect(ajouterMois("2026-01-15", -13)).toBe("2024-12-15");
  });
  it("calcule les écarts et les libellés relatifs", () => {
    expect(ecartJours("2024-02-28", "2024-03-01")).toBe(2);
    expect(relatif(AUJ, "2026-10-26")).toBe("demain");
    expect(relatif(AUJ, "2026-10-20")).toBe("il y a 5 jours");
  });
  it("repère les jours fériés calculés (packages/fr-data) et les week-ends", () => {
    expect(alerteJourNonOuvre("2026-12-25")).toContain("Noël");
    expect(alerteJourNonOuvre("2027-03-29")).toContain("Lundi de Pâques");
    expect(alerteJourNonOuvre("2026-10-25")).toBe("dimanche");
    expect(alerteJourNonOuvre("2026-10-26")).toBeNull();
  });
  it("valide les dates ISO", () => {
    expect(estIso("2024-02-29")).toBe(true);
    expect(estIso("2025-02-29")).toBe(false);
    expect(estIso("29/02/2024")).toBe(false);
  });
});

describe("export / import JSON", () => {
  it("relit un export à l'identique", () => {
    expect(validerEtat(JSON.parse(JSON.stringify(etat)))).toEqual(etat);
  });
  it("rejette un fichier qui n'est pas un export", () => {
    expect(validerEtat({ foo: 1 })).toBeNull();
    expect(validerEtat("texte")).toBeNull();
    expect(validerEtat(null)).toBeNull();
  });
  it("ignore les dates invalides et les éléments malformés", () => {
    const r = validerEtat({ echeances: [{ id: "x", typeId: "cni", dates: { date_delivrance: "2025-02-30" } }, { nope: 1 }] });
    expect(r?.echeances).toHaveLength(1);
    expect(r?.echeances[0].dates).toEqual({});
  });
  it("fusionne sans doublon", () => {
    const f = fusionner(etat, { version: 1, membres: [{ id: "m1", nom: "Léa B.", genre: "personne" }], echeances: [] });
    expect(f.membres).toHaveLength(3);
    expect(f.membres.find((m) => m.id === "m1")?.nom).toBe("Léa B.");
  });
});

describe("lien de rappel", () => {
  it("encode et décode l'état (accents compris)", () => {
    const lien = encoderLien(etat);
    expect(lien).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decoderLien(lien)).toEqual(etat);
  });
  it("reste assez court pour un QR code avec un foyer typique", () => {
    expect(encoderLien(etat).length).toBeLessThan(1500);
  });
  it("renvoie null pour un lien tronqué", () => {
    expect(decoderLien(encoderLien(etat).slice(0, 30))).toBeNull();
    expect(decoderLien("")).toBeNull();
  });
});

describe("tableau de bord", () => {
  const ls = lignes(etat, AUJ);
  it("trie par urgence : dépassé d'abord", () => {
    expect(ls.map((l) => l.echeance.id)).toEqual(["a", "c", "d", "b"]);
    expect(ls[0].urgence).toBe("depasse");
  });
  it("classe < 30 j et < 90 j", () => {
    const r = (date: string): Resultat => ({ statut: "a_venir", date, dateTheorique: date, suivantes: [], explication: "" });
    expect(urgence(r("2026-11-10"), AUJ)).toBe("moins30");
    expect(urgence(r("2027-01-10"), AUJ)).toBe("moins90");
    expect(urgence(r("2027-06-10"), AUJ)).toBe("plus_tard");
    expect(comparerUrgence(r("2026-11-10"), r("2027-06-10"), AUJ)).toBeLessThan(0);
  });
  it("sélectionne les échéances à notifier (retard ou ≤ 7 jours)", () => {
    const n = aNotifier(ls, AUJ);
    expect(n.map((l) => l.echeance.id)).toEqual(["a", "c"]);
    const t = texteNotification(n, AUJ);
    expect(t?.titre).toBe("Mes délais : 2 échéances proches");
    expect(t?.corps).toContain("en retard");
  });
});
