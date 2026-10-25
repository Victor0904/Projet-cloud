import { describe, expect, it } from "vitest";
import { lireAnnuaire, lireRattachements } from "../src/lib/import/annuaire.ts";
import { lireEffectifs, lireIps, lireIpsLycees, lireIval, lireIvac, lireLangues, NB_ANNEES, sommerEffectifs } from "../src/lib/import/indicateurs.ts";
import { lireCarteScolaire, NUMERO_MAX } from "../src/lib/import/secteurs.ts";
import { annee, cleVoie, cleVoieSansType, nombre, telephone } from "../src/lib/texte.ts";
import { urlExport } from "../scripts/telecharger.ts";
import { DEPARTEMENTS, JEUX } from "../scripts/config.ts";
import { echantillon } from "./aide.ts";

describe("nettoyage des valeurs", () => {
  it("lit les nombres sous toutes leurs formes", () => {
    expect(nombre(12)).toBe(12);
    expect(nombre("96.6")).toBe(96.6);
    expect(nombre("12,5")).toBe(12.5);
    expect(nombre("-3")).toBe(-3);
    expect(nombre("ND")).toBeNull();
    expect(nombre("")).toBeNull();
    expect(nombre(null)).toBeNull();
  });
  it("lit les années", () => {
    expect(annee("2024")).toBe(2024);
    expect(annee("2024-01-01T00:00:00+00:00")).toBe(2024);
    expect(annee("2023-2024")).toBe(2023);
    expect(annee(null)).toBeNull();
  });
  it("normalise les noms de voie", () => {
    expect(cleVoie("Rue de l'Abbé Grégoire")).toBe("RUE ABBE GREGOIRE");
    expect(cleVoie("RUE DE L ABBE GREGOIRE")).toBe("RUE ABBE GREGOIRE");
    expect(cleVoie("Av. du Gal Leclerc")).toBe("AVENUE GENERAL LECLERC");
    expect(cleVoie("Rue St-Dizier")).toBe(cleVoie("RUE SAINT DIZIER"));
    expect(cleVoieSansType("Allée de Beauregard")).toBe("BEAUREGARD");
  });
  it("formate les téléphones", () => {
    expect(telephone("0383285288")).toBe("03 83 28 52 88");
    expect(telephone(null)).toBeNull();
  });
});

describe("annuaire de l'éducation", () => {
  const etabs = lireAnnuaire(echantillon.annuaire);
  it("garde écoles, collèges et lycées géolocalisés, sans doublon", () => {
    expect(etabs.length).toBe(25);
    expect(new Set(etabs.map((e) => e.uai)).size).toBe(etabs.length);
    expect(etabs.every((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon))).toBe(true);
  });
  it("écarte les sous-structures (section d'enseignement professionnel) mais garde leur rattachement", () => {
    expect(etabs.some((e) => e.nature === "SECTION D ENSEIGNEMENT PROFESSIONNEL")).toBe(false);
    const r = lireRattachements(echantillon.annuaire);
    expect(r.size).toBe(1);
    const [, mere] = [...r][0];
    expect(etabs.some((e) => e.uai === mere)).toBe(true);
  });
  it("lit statut, niveau, options et contact", () => {
    const lamour = etabs.find((e) => e.uai === "0541327Z")!;
    expect(lamour).toMatchObject({ niveau: "college", statut: "public", commune: "Nancy", educationPrioritaire: "REP+" });
    expect(lamour.options).toContain("restauration");
    const prive = etabs.find((e) => e.nom === "Collège Saint-Dominique")!;
    expect(prive.statut).toBe("prive");
    expect(prive.contratPrive).toContain("contrat");
    const lycee = etabs.find((e) => e.nom === "Lycée Henri Poincaré")!;
    expect(lycee.niveau).toBe("lycee");
    expect(lycee.options).toContain("voie_generale");
  });
});

describe("indicateurs", () => {
  it("IVAC : 3 dernières sessions, dans l'ordre", () => {
    const m = lireIvac(echantillon.ivac!);
    const lamour = m.get("0541327Z")!;
    expect(lamour.length).toBe(NB_ANNEES);
    expect(lamour.map((r) => r.session)).toEqual([2023, 2024, 2025]);
    expect(lamour[2].tauxReussite).not.toBeNull();
  });
  it("IVAL : taux et valeurs ajoutées numériques", () => {
    const m = lireIval(echantillon.ival_gt!, "gt");
    const poincare = [...m.values()].flat();
    expect(poincare.length).toBeGreaterThan(0);
    for (const r of poincare) {
      expect(r.voie).toBe("gt");
      if (r.vaTauxReussite !== null) expect(typeof r.vaTauxReussite).toBe("number");
    }
    expect(Math.max(...[...m.values()].map((l) => l.length))).toBeLessThanOrEqual(NB_ANNEES);
  });
  it("IPS écoles (texte) et collèges (nombre) avec références", () => {
    const ecoles = [...lireIps(echantillon.ips_ecoles!).values()].flat();
    expect(ecoles.every((i) => typeof i.valeur === "number")).toBe(true);
    const colleges = [...lireIps(echantillon.ips_colleges!).values()].flat();
    expect(colleges[0].reference.departement).toBeTypeOf("number");
    const lycees = [...lireIpsLycees(echantillon.ips_lycees!).values()].flat();
    expect(lycees[0].reference.national).toBeTypeOf("number");
  });
  it("effectifs et langues", () => {
    const eff = lireEffectifs(echantillon.eff_ecoles!, "numero_ecole", "nombre_total_eleves", "nombre_total_classes");
    const une = [...eff.values()][0];
    expect(une.length).toBeLessThanOrEqual(NB_ANNEES);
    expect(une[0].classes).not.toBeNull();
    expect(sommerEffectifs([{ rentree: 2024, eleves: 100, classes: null }], [{ rentree: 2024, eleves: 50, classes: null }])).toEqual([
      { rentree: 2024, eleves: 150, classes: null },
    ]);
    const langues = lireLangues(echantillon.langues!);
    expect([...langues.values()].flat()).toContain("Anglais");
  });
});

describe("carte scolaire", () => {
  const carte = lireCarteScolaire(echantillon.carte_scolaire, {
    departement: "54",
    source: { titre: "test", url: "https://exemple", telecharge_le: "2026-10-25" },
  });
  it("regroupe les tronçons par commune et par voie", () => {
    const nancy = carte.communes["54395"];
    expect(nancy.voies["RUE PRAIRIE"].troncons.length).toBeGreaterThan(1);
    expect(nancy.voies["RUE PRAIRIE"].troncons.some((t) => t[1] === NUMERO_MAX)).toBe(true);
    expect(carte.communes["54013"].unique.length).toBe(1);
    expect(Object.keys(carte.communes["54013"].voies)).toHaveLength(0);
  });
});

describe("script de téléchargement", () => {
  it("construit une URL d'export filtrée par département", () => {
    const annuaire = JEUX.find((j) => j.cle === "annuaire")!;
    const url = new URL(urlExport(annuaire, DEPARTEMENTS[0]));
    expect(url.pathname).toContain("/fr-en-annuaire-education/exports/json");
    expect(url.searchParams.get("where")).toContain('code_departement="054"');
    expect(url.searchParams.get("select")).toContain("identifiant_de_l_etablissement");
    const ivac = JEUX.find((j) => j.cle === "ivac")!;
    expect(new URL(urlExport(ivac, DEPARTEMENTS[0])).searchParams.get("where")).toBe('startswith(uai, "054")');
  });
});
