import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTACTS, GLOSSAIRE, LETTRES_BRUTES, ORGANISMES, TYPES } from "@/donnees";
import { MODELES, VARIABLES, variablesDe } from "@/lettres/modeles";

const data = join(__dirname, "..", "data");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("intégrité des données", () => {
  it("chaque fichier de data/types-courrier et data/lettres est indexé", () => {
    const types = readdirSync(join(data, "types-courrier")).map((f) => f.replace(/\.json$/, ""));
    expect(TYPES.map((t) => t.id).sort()).toEqual(types.sort());
    const lettres = readdirSync(join(data, "lettres")).map((f) => f.replace(/\.md$/, ""));
    expect(Object.keys(LETTRES_BRUTES).sort()).toEqual(lettres.sort());
  });

  it("chaque type a un organisme connu, des lettres (1 à 3) et des contacts existants", () => {
    const orgs = ORGANISMES.map((o) => o.id);
    for (const t of TYPES) {
      expect(orgs, t.id).toContain(t.organisme);
      expect(t.lettres.length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.lettres.length, t.id).toBeLessThanOrEqual(3);
      for (const l of t.lettres) expect(MODELES[l], `${t.id} → lettre ${l}`).toBeDefined();
      expect(t.contacts.length, t.id).toBeGreaterThan(0);
      for (const c of t.contacts) expect(CONTACTS.find((x) => x.id === c), `${t.id} → contact ${c}`).toBeDefined();
      expect(t.risques.length && t.actions.length && t.delais.length, t.id).toBeTruthy();
    }
  });

  it("chaque délai et chaque contrôle a une source et une date de vérification (ou A_VERIFIER)", () => {
    for (const t of TYPES) {
      for (const x of [...t.delais, ...(t.controles ?? [])]) {
        expect(x.source, `${t.id}`).toBeTruthy();
        expect(x.verifie_le === "A_VERIFIER" || DATE.test(x.verifie_le), `${t.id} ${x.verifie_le}`).toBe(true);
        if (x.statut === "A_VERIFIER") expect(x.verifie_le).toBe("A_VERIFIER");
      }
      for (const d of t.delais) {
        if (d.depart !== "date_limite_courrier") {
          expect(d.duree, `${t.id}/${d.id}`).toBeGreaterThan(0);
          expect(d.unite, `${t.id}/${d.id}`).toBeTruthy();
        }
      }
    }
    for (const c of CONTACTS) expect(c.url).toMatch(/^https:\/\//);
  });

  it("les mots-clés sont écrits sans accents et en minuscules (comme le texte normalisé)", () => {
    const termes = [
      ...TYPES.flatMap((t) => [...t.motsCles, ...(t.exclusions ?? [])].map((m) => m.terme)),
      ...ORGANISMES.flatMap((o) => o.motsCles.map((m) => m.terme)),
      ...GLOSSAIRE.flatMap((g) => g.variantes),
    ];
    for (const m of termes) expect(m, m).toMatch(/^[a-z0-9 '.\-/()]+$/);
  });

  it("les modèles de lettres n'utilisent que des variables connues", () => {
    for (const m of Object.values(MODELES)) {
      for (const v of variablesDe(m.corps)) expect(VARIABLES, `${m.id} : {{${v}}}`).toContain(v);
      expect(m.conseil_envoi, m.id).toBeTruthy();
    }
  });
});
