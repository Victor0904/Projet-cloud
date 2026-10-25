import { describe, expect, it } from "vitest";
import { ajouterMois, calculerEcheance, joursRestants } from "@/delais/calcul";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("jours calendaires", () => {
  it("le jour de départ ne compte pas", () => {
    const c = calculerEcheance({ depart: d("2026-03-02"), duree: 10, unite: "jours" });
    expect(iso(c.date)).toBe("2026-03-12");
    expect(iso(c.dateReportee)).toBe("2026-03-12");
  });
  it("échéance un samedi : date prudente conservée, report au lundi signalé", () => {
    const c = calculerEcheance({ depart: d("2026-03-04"), duree: 10, unite: "jours" }); // 14/03/2026 = samedi
    expect(iso(c.date)).toBe("2026-03-14");
    expect(iso(c.dateReportee)).toBe("2026-03-16");
    expect(c.etapes.join(" ")).toMatch(/samedi/);
  });
  it("échéance un dimanche suivi d'un lundi férié (Pâques 2026) : report au mardi", () => {
    const c = calculerEcheance({ depart: d("2026-03-21"), duree: 15, unite: "jours" }); // 05/04/2026 = dimanche de Pâques
    expect(iso(c.date)).toBe("2026-04-05");
    expect(iso(c.dateReportee)).toBe("2026-04-07");
  });
  it("échéance le 14 juillet (mardi) : report au 15", () => {
    const c = calculerEcheance({ depart: d("2026-06-14"), duree: 30, unite: "jours" });
    expect(iso(c.date)).toBe("2026-07-14");
    expect(iso(c.dateReportee)).toBe("2026-07-15");
    expect(c.etapes.join(" ")).toMatch(/Fête nationale/);
  });
  it("45 jours ANTAI à partir du 14/10/2026", () => {
    const c = calculerEcheance({ depart: d("2026-10-14"), duree: 45, unite: "jours" });
    expect(iso(c.date)).toBe("2026-11-28"); // samedi
    expect(iso(c.dateReportee)).toBe("2026-11-30");
  });
  it("semaines : 6 semaines = 42 jours", () => {
    expect(iso(calculerEcheance({ depart: d("2026-02-03"), duree: 6, unite: "semaines" }).date)).toBe("2026-03-17");
  });
});

describe("jours francs", () => {
  it("ni le jour de départ ni le dernier jour ne comptent", () => {
    const c = calculerEcheance({ depart: d("2026-03-02"), duree: 8, unite: "jours", mode: "franc" });
    expect(iso(c.date)).toBe("2026-03-11");
  });
  it("délai franc qui tombe un 1er mai (vendredi) : reporté au lundi 4 mai", () => {
    const c = calculerEcheance({ depart: d("2026-04-22"), duree: 8, unite: "jours", mode: "franc" });
    expect(iso(c.date)).toBe("2026-05-01");
    expect(iso(c.dateReportee)).toBe("2026-05-04");
  });
});

describe("jours ouvrés", () => {
  it("saute les week-ends", () => {
    const c = calculerEcheance({ depart: d("2026-03-06"), duree: 5, unite: "jours", mode: "ouvre" }); // vendredi
    expect(iso(c.date)).toBe("2026-03-13");
  });
  it("saute les jours fériés : Ascension 2026 (jeudi 14 mai)", () => {
    const c = calculerEcheance({ depart: d("2026-05-12"), duree: 3, unite: "jours", mode: "ouvre" });
    expect(iso(c.date)).toBe("2026-05-18"); // 13, 15, 18
    expect(c.etapes.join(" ")).toMatch(/14 mai 2026/);
  });
  it("Noël et Saint-Étienne en Alsace-Moselle", () => {
    const national = calculerEcheance({ depart: d("2026-12-24"), duree: 1, unite: "jours", mode: "ouvre" });
    const alsace = calculerEcheance({ depart: d("2026-12-24"), duree: 1, unite: "jours", mode: "ouvre", alsaceMoselle: true });
    expect(iso(national.date)).toBe("2026-12-28"); // 25 férié, 26-27 week-end
    expect(iso(alsace.date)).toBe("2026-12-28");
    const v = calculerEcheance({ depart: d("2027-12-24"), duree: 1, unite: "jours", mode: "ouvre", alsaceMoselle: true });
    expect(iso(v.date)).toBe("2027-12-27"); // 25 samedi, 26 dimanche
    const vs = calculerEcheance({ depart: d("2026-04-02"), duree: 1, unite: "jours", mode: "ouvre", alsaceMoselle: true });
    expect(iso(vs.date)).toBe("2026-04-07"); // Vendredi saint 3/4, lundi de Pâques 6/4
  });
});

describe("mois", () => {
  it("même quantième", () => expect(iso(ajouterMois(d("2026-03-03"), 2))).toBe("2026-05-03"));
  it("31 janvier + 1 mois = 28 février", () => expect(iso(ajouterMois(d("2026-01-31"), 1))).toBe("2026-02-28"));
  it("année bissextile", () => expect(iso(ajouterMois(d("2028-01-31"), 1))).toBe("2028-02-29"));
  it("2 mois depuis le 3 mars 2026 : 3 mai 2026 (dimanche) → report au lundi 4 mai", () => {
    const c = calculerEcheance({ depart: d("2026-03-03"), duree: 2, unite: "mois" });
    expect(iso(c.date)).toBe("2026-05-03");
    expect(iso(c.dateReportee)).toBe("2026-05-04");
  });
  it("décembre → année suivante", () => expect(iso(ajouterMois(d("2026-12-15"), 2))).toBe("2027-02-15"));
});

describe("fin d'année (réclamation fiscale)", () => {
  it("31 décembre de la 2e année suivante", () => {
    const c = calculerEcheance({ depart: d("2026-07-31"), duree: 2, unite: "fin_annee" });
    expect(iso(c.date)).toBe("2028-12-31");
  });
});

describe("jours restants", () => {
  it("compte les jours calendaires", () => {
    expect(joursRestants(d("2026-10-25"), d("2026-11-01"))).toBe(7);
    expect(joursRestants(d("2026-10-25"), d("2026-10-20"))).toBe(-5);
  });
});
