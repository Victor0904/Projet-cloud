import { describe, expect, it } from "vitest";
import { dateVersIso } from "../src/lib/dates";
import { genererPlan, prochainesEcheances, type Plan } from "../src/plan/generer";
import { PROFIL_VIDE, type Profil } from "../src/plan/profil";
import { REGLES } from "../src/plan/regles";

const DECES = "2026-03-10";

const profil = (p: Partial<Profil>): Profil => ({ ...PROFIL_VIDE, dateDeces: DECES, ...p });

function plan(p: Partial<Profil>): Plan {
  const r = genererPlan(profil(p));
  if (!r) throw new Error("plan nul");
  return r;
}

const ids = (pl: Plan) => pl.demarches.map((d) => d.id);
const dem = (pl: Plan, id: string) => {
  const d = pl.demarches.find((x) => x.id === id);
  if (!d) throw new Error(`démarche absente : ${id}`);
  return d;
};
const echeance = (pl: Plan, id: string) => {
  const e = dem(pl, id).echeance.date;
  return e ? dateVersIso(e) : null;
};

describe("profil 1 : conjoint survivant, locataire", () => {
  const pl = plan({
    lien: "conjoint",
    union: "marie",
    enfants: true,
    enfantsMineurs: false,
    logement: "locataire",
    activite: "retraite",
    ageConjoint: 72,
    procheSalarie: false,
  });

  it("contient les démarches attendues", () => {
    for (const id of [
      "declaration_deces",
      "obseques",
      "banque_prevenir",
      "cpam_informer",
      "retraite_informer",
      "bailleur",
      "caf",
      "impots_conjoint",
      "notaire",
      "declaration_succession",
      "reversion",
      "revenus_defunt",
    ])
      expect(ids(pl)).toContain(id);
  });

  it("ne contient pas ce qui ne le concerne pas", () => {
    for (const id of ["syndic", "cpam_capital", "veuvage", "conge_proche", "vehicule", "entreprise", "asf"])
      expect(ids(pl)).not.toContain(id);
  });

  it("date correctement les démarches", () => {
    expect(echeance(pl, "declaration_deces")).toBe("2026-03-11");
    expect(echeance(pl, "obseques")).toBe("2026-03-24");
    expect(echeance(pl, "impots_conjoint")).toBe("2026-05-09");
    expect(echeance(pl, "declaration_succession")).toBe("2026-09-10");
    expect(echeance(pl, "reversion")).toBe("2027-03-10");
    expect(echeance(pl, "revenus_defunt")).toBeNull();
    expect(dem(pl, "revenus_defunt").echeance.libelle).toBe("au printemps 2027");
  });

  it("parle de transfert du bail au conjoint", () => {
    expect(dem(pl, "bailleur").pourquoi).toMatch(/transfert/);
  });

  it("range les démarches par phase et par date", () => {
    expect(pl.phases.map((p) => p.id)).toEqual(["premiers_jours", "premier_mois", "six_mois", "apres"]);
    const premiers = pl.phases[0].demarches.map((d) => d.echeance.date?.getTime() ?? Infinity);
    expect([...premiers].sort((a, b) => a - b)).toEqual(premiers);
    expect(pl.phases[0].demarches.map((d) => d.id)).toContain("declaration_deces");
    expect(pl.phases[0].demarches[0].id).toBe("certificat_deces");
    expect(pl.phases[0].demarches[1].id).toBe("declaration_deces");
    expect(pl.phases[2].demarches.map((d) => d.id)).toEqual(
      expect.arrayContaining(["declaration_succession", "reversion"]),
    );
  });
});

describe("profil 2 : enfant d'un parent propriétaire", () => {
  const pl = plan({
    lien: "enfant",
    union: "seul",
    logement: "proprietaire",
    activite: "retraite",
    testament: "ne_sait_pas",
    assuranceVie: "ne_sait_pas",
    vehicule: true,
    procheSalarie: true,
  });

  it("contient les démarches attendues", () => {
    for (const id of [
      "declaration_deces",
      "obseques",
      "conge_proche",
      "retraite_informer",
      "syndic",
      "notaire",
      "testament",
      "agira",
      "vehicule",
      "inventaire_comptes",
      "declaration_succession",
      "numerique",
    ])
      expect(ids(pl)).toContain(id);
  });

  it("ne contient ni réversion, ni bail, ni démarche du conjoint", () => {
    for (const id of ["reversion", "veuvage", "bailleur", "impots_conjoint", "cpam_capital"])
      expect(ids(pl)).not.toContain(id);
  });

  it("indique que le notaire est obligatoire (bien immobilier)", () => {
    expect(dem(pl, "notaire").pourquoi).toMatch(/obligatoire/);
  });

  it("date correctement les démarches", () => {
    expect(echeance(pl, "declaration_succession")).toBe("2026-09-10");
    expect(echeance(pl, "vehicule")).toBe("2026-04-10");
    expect(echeance(pl, "conge_proche")).toBe("2026-03-12");
    expect(echeance(pl, "agira")).toBe("2026-04-10");
  });

  it("annonce 3 jours de congé pour le décès d'un parent", () => {
    expect(dem(pl, "conge_proche").pourquoi).toMatch(/3 jours ouvrables/);
  });
});

describe("profil 3 : parent d'un travailleur indépendant", () => {
  const pl = plan({
    lien: "parent",
    union: "seul",
    enfants: false,
    logement: "locataire",
    activite: "independant",
    entreprise: true,
    defuntJeuneOuParent: true,
    procheSalarie: true,
  });

  it("contient les démarches attendues", () => {
    for (const id of [
      "cpam_capital",
      "entreprise",
      "revenus_professionnels",
      "conge_proche",
      "conge_deuil",
      "bailleur",
      "declaration_succession",
    ])
      expect(ids(pl)).toContain(id);
  });

  it("le capital décès n'est pas prioritaire pour un parent : délai de 2 ans", () => {
    expect(dem(pl, "cpam_capital").delai.id).toBe("capital_deces_autres");
    expect(echeance(pl, "cpam_capital")).toBe("2028-03-10");
  });

  it("date les démarches propres à l'indépendant et au deuil", () => {
    expect(echeance(pl, "revenus_professionnels")).toBe("2026-09-10");
    expect(echeance(pl, "conge_deuil")).toBe("2027-03-10");
  });

  it("annonce le congé allongé pour le décès d'un enfant", () => {
    expect(dem(pl, "conge_proche").pourquoi).toMatch(/14 jours ouvrables/);
  });

  it("ne contient pas les démarches du conjoint ni du retraité", () => {
    for (const id of ["reversion", "veuvage", "retraite_informer", "employeur_defunt"])
      expect(ids(pl)).not.toContain(id);
  });
});

describe("profil 4 : proche sans lien familial", () => {
  const pl = plan({
    lien: "sans_lien",
    union: "seul",
    logement: "locataire",
    activite: "salarie",
    procheSalarie: true,
    animaux: true,
  });

  it("garde l'essentiel des premiers jours et les démarches ouvertes à tous", () => {
    for (const id of [
      "certificat_deces",
      "declaration_deces",
      "obseques",
      "remboursement_obseques",
      "animaux",
      "notaire",
      "agira",
    ])
      expect(ids(pl)).toContain(id);
  });

  it("n'attribue pas les démarches de la famille", () => {
    for (const id of [
      "cpam_capital",
      "conge_proche",
      "bailleur",
      "employeur_defunt",
      "reversion",
      "banque_prevenir",
      "revenus_defunt",
    ])
      expect(ids(pl)).not.toContain(id);
  });

  it("signale que la déclaration de succession revient aux héritiers", () => {
    const d = dem(pl, "declaration_succession");
    expect(d.qui).toBe("heritiers");
    expect(d.pourquoi).toMatch(/héritiers/);
    expect(echeance(pl, "declaration_succession")).toBe("2026-09-10");
  });

  it("date la déclaration de décès et les obsèques", () => {
    expect(echeance(pl, "declaration_deces")).toBe("2026-03-11");
    expect(echeance(pl, "obseques")).toBe("2026-03-24");
  });
});

describe("cas limites", () => {
  it("renvoie null sans date de décès valide", () => {
    expect(genererPlan(profil({ dateDeces: "" }))).toBeNull();
    expect(genererPlan(profil({ dateDeces: "2026-02-30" }))).toBeNull();
  });

  it("décès à l'étranger : succession à 12 mois", () => {
    const pl = plan({ decesEtranger: true });
    expect(echeance(pl, "declaration_succession")).toBe("2027-03-10");
  });

  it("conjoint marié de moins de 55 ans : allocation de veuvage", () => {
    const pl = plan({ lien: "conjoint", union: "marie", ageConjoint: 45, activite: "salarie" });
    expect(ids(pl)).toContain("veuvage");
    expect(echeance(pl, "veuvage")).toBe("2028-02-29");
    expect(dem(pl, "reversion").pourquoi).toMatch(/55 ans/);
    expect(dem(pl, "cpam_capital").delai.id).toBe("capital_deces_prioritaire");
    expect(echeance(pl, "cpam_capital")).toBe("2026-04-10");
  });

  it("partenaire de Pacs : pas de réversion ni de veuvage, mais impôts", () => {
    const pl = plan({ lien: "conjoint", union: "pacse" });
    expect(ids(pl)).not.toContain("reversion");
    expect(ids(pl)).not.toContain("veuvage");
    expect(ids(pl)).toContain("impots_conjoint");
  });

  it("enfants mineurs : allocation de soutien familial", () => {
    const pl = plan({ lien: "conjoint", union: "marie", enfantsMineurs: true });
    expect(ids(pl)).toContain("asf");
  });

  it("chaque règle référence des délais et organismes existants (aucune exception)", () => {
    const variantes: Partial<Profil>[] = [
      {},
      { lien: "conjoint", union: "marie", ageConjoint: 40, enfantsMineurs: true },
      { lien: "parent", activite: "independant", entreprise: true, defuntJeuneOuParent: true },
      { lien: "sans_lien" },
      { activite: "fonctionnaire", vehicule: true, animaux: true, assuranceVie: "oui", testament: "oui" },
      { activite: "demandeur_emploi", logement: "etablissement" },
    ];
    for (const v of variantes) expect(() => plan(v)).not.toThrow();
    expect(new Set(REGLES.map((r) => r.id)).size).toBe(REGLES.length);
  });

  it("prochaines échéances : ignore ce qui est fait", () => {
    const pl = plan({});
    const proch = prochainesEcheances(pl, new Set(["certificat_deces", "declaration_deces"]), 2);
    expect(proch.map((d) => d.id)).not.toContain("declaration_deces");
    expect(proch).toHaveLength(2);
  });
});
