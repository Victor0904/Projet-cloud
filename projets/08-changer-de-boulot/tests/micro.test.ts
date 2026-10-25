import { describe, expect, it } from "vitest";
import refs from "./references-urssaf.json";
import { calculerMicro, etatTVA } from "../src/paie/micro";
import { calculerIR } from "../src/paie/impot";
import { TAUX } from "../src/paie/taux";

const base = { activite: "bnc" as const, acre: false, versementLiberatoire: false, clientsParticuliers: false };

describe("micro-entreprise", () => {
  it("BNC 90 000 € : cotisations, revenu abattu et impôt comme le simulateur Urssaf", () => {
    const ref = refs.micro[0];
    const r = calculerMicro({ ...base, caFacture: ref.ca });
    expect(r.cotisations).toBeCloseTo(ref.cotisationsAnnuelles, 0);
    expect(r.revenuNet).toBeCloseTo(ref.revenuNet, 0);
    expect(r.revenuAbattu).toBeCloseTo(ref.revenuAbattu, 0);
    expect(calculerIR(r.revenuImposable, { situation: "seul", enfants: 0, parentIsole: false }).impot).toBeCloseTo(ref.impotSeul, 0);
    expect(r.depasseSeuilMicro).toBe(ref.seuilDepasse);
  });

  it("seuil de chiffre d'affaires des prestations de services : 83 600 €", () => {
    const seuil = TAUX.micro.seuil_ca_services.valeur;
    expect(seuil).toBe(83600);
    expect(calculerMicro({ ...base, caFacture: seuil }).depasseSeuilMicro).toBe(false);
    expect(calculerMicro({ ...base, caFacture: seuil + 1 }).depasseSeuilMicro).toBe(true);
  });

  it("seuils de franchise de TVA : 37 500 € (base) et 41 250 € (majoré)", () => {
    expect(etatTVA(37500)).toBe("franchise");
    expect(etatTVA(37501)).toBe("tolerance");
    expect(etatTVA(41250)).toBe("tolerance");
    expect(etatTVA(41251)).toBe("due");
  });

  it("TVA avec des clients particuliers : la TVA est prise sur le chiffre d'affaires", () => {
    const pro = calculerMicro({ ...base, caFacture: 60000 });
    const part = calculerMicro({ ...base, caFacture: 60000, clientsParticuliers: true });
    expect(pro.caHT).toBe(60000);
    expect(part.caHT).toBeCloseTo(50000, 6);
    expect(part.tvaCollectee).toBeCloseTo(10000, 6);
    expect(calculerMicro({ ...base, caFacture: 30000, clientsParticuliers: true }).caHT).toBe(30000);
  });

  it("abattement minimum de 305 € et taux BIC services", () => {
    const r = calculerMicro({ ...base, activite: "bic_services", caFacture: 400 });
    expect(r.abattement).toBe(305);
    const r2 = calculerMicro({ ...base, activite: "bic_services", caFacture: 40000 });
    expect(r2.abattement).toBe(20000);
    expect(r2.cotisations).toBeCloseTo(40000 * (0.212 + 0.001), 6);
  });

  it("ACRE et versement libératoire", () => {
    const r = calculerMicro({ ...base, caFacture: 40000, acre: true, versementLiberatoire: true });
    expect(r.lignes[0].taux).toBeCloseTo(0.192, 6);
    expect(r.versementLiberatoire).toBeCloseTo(880, 6);
    expect(r.revenuImposable).toBe(0);
  });
});
