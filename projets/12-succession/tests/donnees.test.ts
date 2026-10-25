// Garde-fous sur les fichiers de data/ : chaque valeur a une source et une date de vérification.
import { describe, expect, it } from "vitest";
import { DELAIS, ENVOIS, ORGANISMES, VALEURS_DROITS } from "../src/lib/donnees";
import { TYPES_LETTRES } from "../src/lettres/modeles";
import { REGLES } from "../src/plan/regles";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_OK = /^https:\/\//;
const STATUTS = ["verifie", "A_VERIFIER", "conseil_outil"];

describe("données", () => {
  it("chaque délai a une source, une date de vérification et un statut", () => {
    for (const d of DELAIS) {
      expect(d.source, d.id).toMatch(URL_OK);
      expect(d.verifie_le, d.id).toMatch(DATE);
      expect(STATUTS, d.id).toContain(d.statut);
      if (["heures", "jours", "mois", "ans"].includes(d.unite)) expect(typeof d.valeur, d.id).toBe("number");
    }
  });

  it("chaque montant a une source, une date de vérification et un statut", () => {
    for (const v of VALEURS_DROITS) {
      expect(v.source, v.id).toMatch(URL_OK);
      expect(v.verifie_le, v.id).toMatch(DATE);
      expect(STATUTS, v.id).toContain(v.statut);
      expect(Number.isFinite(v.valeur), v.id).toBe(true);
    }
  });

  it("chaque organisme a un lien, des pièces, un délai connu et un modèle de lettre existant", () => {
    const delais = new Set(DELAIS.map((d) => d.id));
    const lettres = new Set(TYPES_LETTRES.map((t) => t.id));
    const canaux = new Set(ENVOIS.modes.map((m) => m.id));
    for (const o of ORGANISMES) {
      expect(o.lien, o.id).toMatch(URL_OK);
      expect(o.source, o.id).toMatch(URL_OK);
      expect(o.pieces.length, o.id).toBeGreaterThan(0);
      expect(delais.has(o.delai), o.id).toBe(true);
      if (o.lettre) expect(lettres.has(o.lettre), o.id).toBe(true);
      for (const c of o.canaux) expect(canaux.has(c), `${o.id} ${c}`).toBe(true);
      expect(o.canaux, o.id).toContain(o.canal_conseille);
    }
  });

  it("le catalogue couvre les organismes demandés par le cahier des charges", () => {
    const ids = new Set(ORGANISMES.map((o) => o.id));
    for (const id of [
      "mairie",
      "pompes_funebres",
      "employeur",
      "caisse_retraite_base",
      "retraite_complementaire",
      "cpam",
      "caf",
      "impots",
      "banque",
      "assureurs",
      "mutuelle",
      "bailleur",
      "syndic",
      "energie",
      "telecom",
      "mobile",
      "netflix",
      "spotify",
      "apple",
      "google",
      "amazon",
      "meta",
      "reseaux_autres",
      "agira",
      "prefecture_ants",
      "notaire",
    ])
      expect(ids.has(id), id).toBe(true);
  });

  it("les règles du plan ne référencent que des organismes du catalogue", () => {
    const ids = new Set(ORGANISMES.map((o) => o.id));
    for (const r of REGLES) {
      for (const o of r.organismes) expect(ids.has(o), `${r.id} → ${o}`).toBe(true);
      if (r.lettre) expect(ids.has(r.lettre.organisme), r.id).toBe(true);
    }
  });
});
