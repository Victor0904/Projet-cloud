import { describe, expect, it } from "vitest";
import {
  ajouterMois,
  calculerEcheance,
  dateVersIso,
  isoVersDate,
  joursRestants,
  libelleRelatif,
  reporterSiNonOuvrable,
} from "../src/lib/dates";
import { delai } from "../src/lib/donnees";

const d = (s: string) => isoVersDate(s)!;
const ech = (deces: string, id: string) => {
  const e = calculerEcheance(d(deces), delai(id));
  return e.date ? dateVersIso(e.date) : null;
};

describe("ajouterMois", () => {
  it("ajoute de date à date", () => {
    expect(dateVersIso(ajouterMois(d("2026-03-15"), 6))).toBe("2026-09-15");
  });
  it("prend le dernier jour du mois quand le jour n'existe pas", () => {
    expect(dateVersIso(ajouterMois(d("2026-08-31"), 6))).toBe("2027-02-28");
    expect(dateVersIso(ajouterMois(d("2027-08-31"), 6))).toBe("2028-02-29");
  });
  it("change d'année", () => {
    expect(dateVersIso(ajouterMois(d("2026-11-30"), 3))).toBe("2027-02-28");
  });
});

describe("report au jour ouvrable", () => {
  it("laisse un samedi ordinaire", () => {
    expect(dateVersIso(reporterSiNonOuvrable(d("2026-10-24")))).toBe("2026-10-24");
  });
  it("reporte un dimanche au lundi", () => {
    expect(dateVersIso(reporterSiNonOuvrable(d("2026-10-25")))).toBe("2026-10-26");
  });
  it("reporte un jour férié puis un dimanche", () => {
    // 15 août 2026 (samedi, Assomption) → 16 (dimanche) → lundi 17
    expect(dateVersIso(reporterSiNonOuvrable(d("2026-08-15")))).toBe("2026-08-17");
  });
});

describe("calcul des délais depuis la date du décès", () => {
  it("déclaration de décès : 24 heures → lendemain", () => {
    expect(ech("2026-03-10", "declaration_deces")).toBe("2026-03-11");
  });
  it("obsèques : 14 jours calendaires", () => {
    expect(ech("2026-03-10", "obseques")).toBe("2026-03-24");
  });
  it("capital décès prioritaire : 1 mois", () => {
    expect(ech("2026-01-31", "capital_deces_prioritaire")).toBe("2026-02-28");
  });
  it("capital décès autres bénéficiaires : 2 ans", () => {
    expect(ech("2026-03-10", "capital_deces_autres")).toBe("2028-03-10");
  });
  it("prélèvement à la source du conjoint : 60 jours", () => {
    expect(ech("2026-03-10", "impots_conjoint_60j")).toBe("2026-05-09");
  });
  it("succession : 6 mois en métropole", () => {
    expect(ech("2026-03-10", "declaration_succession")).toBe("2026-09-10");
  });
  it("succession : reportée si le dernier jour est férié ou un dimanche", () => {
    expect(ech("2026-02-15", "declaration_succession")).toBe("2026-08-17");
  });
  it("succession : 12 mois pour un décès à l'étranger", () => {
    expect(ech("2026-03-10", "declaration_succession_etranger")).toBe("2027-03-10");
  });
  it("allocation de veuvage : 2 ans à partir du 1er jour du mois du décès", () => {
    expect(ech("2026-03-20", "allocation_veuvage")).toBe("2028-02-29");
  });
  it("réversion : 12 mois pour un versement sans perte", () => {
    expect(ech("2026-03-10", "reversion_12_mois")).toBe("2027-03-10");
  });
  it("déclaration de revenus : pas de date fixe, l'année suivante", () => {
    const e = calculerEcheance(d("2026-03-10"), delai("revenus_defunt"));
    expect(e.date).toBeNull();
    expect(e.libelle).toBe("au printemps 2027");
  });
  it("sans délai : pas de date", () => {
    expect(calculerEcheance(d("2026-03-10"), delai("sans_delai")).date).toBeNull();
  });
  it("libellé en toutes lettres", () => {
    expect(calculerEcheance(d("2026-03-10"), delai("declaration_succession")).libelle).toBe("10 septembre 2026");
  });
});

describe("jours restants", () => {
  it("compte les jours et formule le retard", () => {
    expect(joursRestants(d("2026-03-20"), d("2026-03-10"))).toBe(10);
    expect(libelleRelatif(10)).toBe("dans 10 jours");
    expect(libelleRelatif(0)).toBe("aujourd'hui");
    expect(libelleRelatif(1)).toBe("demain");
    expect(libelleRelatif(-3)).toBe("date passée depuis 3 jours");
  });
});
