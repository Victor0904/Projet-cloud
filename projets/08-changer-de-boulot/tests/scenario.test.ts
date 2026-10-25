import { describe, expect, it } from "vitest";
import { calculerScenario, exempleParis, scenarioParDefaut, avecMontant, type Contexte } from "../src/paie/scenario";
import { pointIndifference } from "../src/paie/indifference";
import { lienDePartage, lireFragment, normaliserEtat } from "../src/paie/partage";
import { baremeKilometrique, coutTransport } from "../src/paie/frais";
import { toutesLesValeurs } from "../src/paie/taux";

const ctx: Contexte = { foyer: { situation: "seul", enfants: 0, parentIsole: false }, revenusConjoint: 0, autresRevenus: 0 };

describe("scénarios complets", () => {
  it("critère de fin : CDI cadre 48 k€ à Paris vs freelance 450 €/j × 200 j", () => {
    const [cdi, freelance, portage] = exempleParis().map((s) => calculerScenario(s, ctx));
    for (const r of [cdi, freelance, portage]) {
      expect(r.netApresImpotAnnuel).toBeGreaterThan(0);
      expect(r.resteAnnuel).toBeLessThanOrEqual(r.netApresImpotAnnuel + r.totalAvantages);
      expect(r.horaireReel).toBeGreaterThan(0);
      expect(r.hypotheses.length).toBeGreaterThan(0);
    }
    expect(freelance.chiffreAffaires).toBe(90000);
    // 90 000 € dépasse le plafond micro et la franchise de TVA : l'outil doit le dire.
    expect(freelance.alertes.some((a) => a.includes("plafond de la micro-entreprise"))).toBe(true);
    expect(freelance.alertes.some((a) => a.includes("TVA"))).toBe(true);
    // Le CDI : net mensuel autour de 3 140 € (48 000 € brut cadre).
    expect(cdi.netMensuel).toBeGreaterThan(3000);
    expect(cdi.netMensuel).toBeLessThan(3300);
    expect(cdi.heuresTrajet).toBeGreaterThan(0);
  });

  it("le point d'indifférence rend B équivalent à A", () => {
    const [a, b] = exempleParis();
    const p = pointIndifference(a, b, ctx);
    expect(p.unite).toBe("tjm");
    expect(p.montant).not.toBeNull();
    const ra = calculerScenario(a, ctx).resteAnnuel;
    const rb = calculerScenario(avecMontant(b, p.montant!), ctx).resteAnnuel;
    expect(Math.abs(rb - ra)).toBeLessThan(ra * 0.005);
    expect(p.montant!).toBeLessThan(450);
  });

  it("point d'indifférence en brut entre deux salariés", () => {
    const a = { ...scenarioParDefaut("salarie_cadre", "A"), brutAnnuel: 50000 };
    const b = { ...scenarioParDefaut("salarie_cadre", "B"), brutAnnuel: 40000, trajetMinutesAllerRetour: 0 };
    const p = pointIndifference(a, b, ctx);
    expect(p.unite).toBe("brut");
    expect(Math.abs(p.montant! - 50000)).toBeLessThan(5);
  });

  it("le conjoint change l'impôt attribué", () => {
    const s = { ...scenarioParDefaut("salarie_cadre"), brutAnnuel: 60000 };
    const seul = calculerScenario(s, ctx);
    const couple = calculerScenario(s, { foyer: { situation: "couple", enfants: 0, parentIsole: false }, revenusConjoint: 20000, autresRevenus: 0 });
    expect(couple.impotRevenu).toBeLessThan(seul.impotRevenu);
  });

  it("tous les statuts se calculent sans valeur aberrante", () => {
    for (const st of ["salarie_non_cadre", "salarie_cadre", "micro_bnc", "micro_bic", "societe", "portage"] as const) {
      const r = calculerScenario(scenarioParDefaut(st), ctx);
      expect(Number.isFinite(r.resteAnnuel)).toBe(true);
      expect(r.netApresImpotAnnuel).toBeGreaterThan(0);
    }
  });

  it("transport : barème kilométrique et jours de télétravail", () => {
    expect(baremeKilometrique(4000, 5, false)).toBeCloseTo(4000 * 0.636, 6);
    expect(baremeKilometrique(10000, 5, false)).toBeCloseTo(10000 * 0.357 + 1395, 6);
    const c = coutTransport({ mode: "voiture", abonnementMensuel: 0, kmAller: 50, chevauxFiscaux: 5, electrique: false }, 200, 0);
    expect(c.distanceAnnuelle).toBe(20000);
    expect(c.deductibleFraisReels).toBeLessThan(c.cout);
  });
});

describe("partage et données", () => {
  it("aller-retour du lien de partage, sans le foyer si demandé", () => {
    const etat = { v: 1 as const, scenarios: exempleParis(), contexte: { ...ctx, revenusConjoint: 30000 } };
    const lien = lienDePartage(etat, "https://exemple.fr/#ancien", false);
    const relu = lireFragment(lien.slice(lien.indexOf("#")));
    expect(relu?.scenarios).toEqual(etat.scenarios);
    expect(relu?.contexte.revenusConjoint).toBe(0);
  });

  it("un état corrompu est rejeté ou complété", () => {
    expect(lireFragment("#e=%%%")).toBeNull();
    expect(normaliserEtat({ scenarios: [] })).toBeNull();
    const e = normaliserEtat({ scenarios: [{ statut: "inconnu", brutAnnuel: "abc" }, {}, {}, {}] });
    expect(e?.scenarios).toHaveLength(3);
    expect(e?.scenarios[0].statut).toBe("salarie_cadre");
    expect(typeof e?.scenarios[0].brutAnnuel).toBe("number");
  });

  it("chaque valeur de taux-2026.json a une source, une date et un statut", () => {
    for (const { cle, v } of toutesLesValeurs()) {
      expect(v.source, cle).toMatch(/^https:\/\//);
      expect(v.verifie_le, cle).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["VERIFIE", "A_VERIFIER"], cle).toContain(v.statut);
    }
  });
});
