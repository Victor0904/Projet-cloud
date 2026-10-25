import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classer } from "@/classif/classifieur";
import { extraire } from "@/extraction/extraire";
import { TYPES } from "@/donnees";
import { verifierControles } from "@/decodeur";

type Attendu = {
  type: string;
  montants: number[];
  montantPrincipal?: number;
  dates: string[];
  dateCourrier?: string;
  dateLimite?: string;
  reference?: string;
  alerte?: boolean;
};

const dossier = join(__dirname, "corpus");
const attendus = JSON.parse(readFileSync(join(dossier, "attendus.json"), "utf8")) as Record<string, Attendu>;
const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".txt"));
const lire = (nom: string) => readFileSync(join(dossier, `${nom}.txt`), "utf8");
const iso = (d: Date | undefined | null) => d?.toISOString().slice(0, 10);

describe("corpus de courriers fictifs", () => {
  it("contient au moins 30 courriers, tous décrits dans attendus.json", () => {
    expect(fichiers.length).toBeGreaterThanOrEqual(30);
    for (const f of fichiers) expect(attendus[f.replace(/\.txt$/, "")], f).toBeDefined();
  });

  it("couvre au moins 25 types de courrier distincts", () => {
    expect(new Set(Object.values(attendus).map((a) => a.type)).size).toBeGreaterThanOrEqual(25);
    expect(TYPES.length).toBeGreaterThanOrEqual(25);
  });

  it("précision du classifieur ≥ 90 %", () => {
    const erreurs: string[] = [];
    for (const [nom, a] of Object.entries(attendus)) {
      const c = classer(lire(nom));
      if (c.meilleur?.type.id !== a.type) erreurs.push(`${nom} : attendu ${a.type}, obtenu ${c.meilleur?.type.id ?? "aucun"}`);
    }
    const precision = 1 - erreurs.length / Object.keys(attendus).length;
    if (erreurs.length) console.warn(`Erreurs de classification :\n${erreurs.join("\n")}`);
    expect(precision).toBeGreaterThanOrEqual(0.9);
  });

  for (const [nom, a] of Object.entries(attendus)) {
    it(`${nom} : montants, dates et références extraits`, () => {
      const e = extraire(lire(nom));
      const valeurs = e.montants.map((m) => m.valeur);
      for (const m of a.montants) expect(valeurs, `montant ${m}`).toContain(m);
      if (a.montantPrincipal !== undefined) expect(e.montantPrincipal?.valeur).toBe(a.montantPrincipal);
      const dates = e.dates.map((d) => iso(d.date));
      for (const d of a.dates) expect(dates, `date ${d}`).toContain(d);
      if (a.dateCourrier) expect(iso(e.dateCourrier?.date)).toBe(a.dateCourrier);
      if (a.dateLimite) expect(iso(e.dateLimite?.date)).toBe(a.dateLimite);
      if (a.reference) expect(e.references.map((r) => r.valeur)).toContain(a.reference);
    });
  }

  it("signale des frais de rejet supérieurs au plafond (28-banque-rejet)", () => {
    const texte = lire("28-banque-rejet");
    const type = TYPES.find((t) => t.id === "banque-rejet")!;
    const alertes = verifierControles(type, extraire(texte).montants);
    expect(alertes.map((x) => x.montant.valeur)).toEqual([25]);
  });
});
