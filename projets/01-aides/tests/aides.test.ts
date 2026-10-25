// Un test par aide, au moins 3 cas : éligible franc, non éligible franc, cas limite au seuil.
// Les seuils sont lus dans data/baremes-2026.json pour que les tests suivent les barèmes.
import { describe, expect, it } from "vitest";
import { baremes, n } from "../src/moteur/baremes";
import { regleAideLogement, calculerAideLogement } from "../src/moteur/aides/logement";
import { reglePrimeActivite, regleRSA, calculerRSA, bonification } from "../src/moteur/aides/minima";
import { regleChequeEnergie, regleProtectionsEnergie, unitesConsommation } from "../src/moteur/aides/energie";
import { regleBourse, echelonBourse, pointsDeCharge } from "../src/moteur/aides/jeunes";
import { regleMobiliJeune } from "../src/moteur/aides/jeunes";
import { regleAllocationsFamiliales, regleComplementFamilial, regleARS } from "../src/moteur/aides/famille";
import { regleAAH, regleCSS, plafondCSS } from "../src/moteur/aides/sante";
import { regleMaPrimeRenov, regleFraisBancaires, plafondMPR, categorieMPR } from "../src/moteur/aides/autres";
import { zoneApl } from "../src/moteur/outils";
import { GUERET, LYON, PARIS, situation } from "./fixtures";

const B = baremes;
const bmaf = n(B.prestations_familiales.bmaf);

describe("Zones APL", () => {
  it("classe Paris en zone 1, Lyon en zone 2, Guéret en zone 3", () => {
    expect(zoneApl(PARIS.codeInsee).zone).toBe(1);
    expect(zoneApl("75115").zone).toBe(1); // arrondissement
    expect(zoneApl(LYON.codeInsee).zone).toBe(2);
    expect(zoneApl(GUERET.codeInsee).zone).toBe(3);
  });
  it("sans commune, utilise la zone majoritaire du département (estimée)", () => {
    expect(zoneApl(undefined, "75")).toEqual({ zone: 1, estimee: true });
    expect(zoneApl(undefined, "23")).toEqual({ zone: 3, estimee: true });
  });
});

describe("Aide au logement (APL/ALF/ALS)", () => {
  it("éligible franc : personne seule sans revenu, loyer 500 € à Lyon", () => {
    const r = regleAideLogement(situation());
    const L = n(B.aides_logement.plafonds_loyer.zone_2.personnes_seules);
    const C = n(B.aides_logement.charges_base);
    const P0 = Math.max(n(B.aides_logement.p0_taux) * (L + C), n(B.aides_logement.p0_forfait));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBeCloseTo((L + C - P0 - n(B.aides_logement.minoration_forfaitaire)) * (1 - n(B.prelevements.crds)), 1);
    expect(r.confiance).toBe("probable");
  });
  it("non éligible franc : propriétaire, ou revenus élevés", () => {
    expect(regleAideLogement(situation({ logement: { statut: "proprietaire", loyer: null } })).eligible).toBe(false);
    expect(regleAideLogement(situation({ demandeur: { revenusActivite: 4000 } })).eligible).toBe(false);
  });
  it("cas limite : loyer au seuil de suppression (dégressivité)", () => {
    const plafond = n(B.aides_logement.plafonds_loyer.zone_2.personnes_seules);
    const suppression = plafond * n(B.aides_logement.degressivite.zone_2.suppression);
    const degressivite = plafond * n(B.aides_logement.degressivite.zone_2.degressivite);
    const auSeuil = calculerAideLogement(situation({ logement: { loyer: Math.ceil(suppression) } }))!;
    const avant = calculerAideLogement(situation({ logement: { loyer: Math.floor(degressivite) } }))!;
    expect(auSeuil.montant).toBe(0);
    expect(avant.montant).toBeGreaterThan(0);
  });
  it("demande le loyer s'il manque", () => {
    const r = regleAideLogement(situation({ logement: { loyer: null } }));
    expect(r.confiance).toBe("a_verifier");
    expect(r.questions).toContain("loyer");
  });
  it("le plafond de loyer est plus haut en zone 1", () => {
    const paris = calculerAideLogement(situation({ logement: { loyer: 800, commune: PARIS } }))!;
    const gueret = calculerAideLogement(situation({ logement: { loyer: 800, commune: GUERET } }))!;
    expect(paris.loyerPlafond).toBeGreaterThan(gueret.loyerPlafond);
  });
});

describe("Prime d'activité", () => {
  const smicH = n(B.smic.horaire_brut);
  it("éligible franc : salarié seul au Smic", () => {
    const r = reglePrimeActivite(situation({ demandeur: { revenusActivite: 1450 } }));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime!).toBeGreaterThan(100);
  });
  it("non éligible franc : sans revenu d'activité, ou salaire élevé", () => {
    expect(reglePrimeActivite(situation()).eligible).toBe(false);
    expect(reglePrimeActivite(situation({ demandeur: { revenusActivite: 3500 } })).eligible).toBe(false);
  });
  it("cas limite : étudiant juste sous / juste au-dessus du plancher de 78 % du Smic", () => {
    const plancher = n(B.prime_activite.plancher_apprenant_heures_smic) * smicH * n(B.prime_activite.plancher_apprenant_taux);
    const sous = reglePrimeActivite(situation({ demandeur: { activite: "etudiant", revenusActivite: plancher - 1 } }));
    const dessus = reglePrimeActivite(situation({ demandeur: { activite: "etudiant", revenusActivite: plancher + 1 } }));
    expect(sous.eligible).toBe(false);
    expect(dessus.eligible).toBe(true);
  });
  it("bonification : nulle sous 59 h de Smic, maximale au-delà du seuil haut", () => {
    expect(bonification(n(B.prime_activite.bonification_seuil_smic_horaire) * smicH)).toBe(0);
    const max = Math.round(n(B.prime_activite.bonification_taux_max) * n(B.prime_activite.montant_base) * 100) / 100;
    expect(bonification(n(B.prime_activite.bonification_seuil_max_smic_horaire) * smicH + 100)).toBe(max);
  });
});

describe("RSA", () => {
  const base = n(B.rsa.montant_base);
  it("éligible franc : seul sans revenu, locataire sans aide au logement prise en compte ailleurs", () => {
    const s = situation({ logement: { statut: "locataire", loyer: 500 } });
    const r = regleRSA(s);
    expect(r.eligible).toBe(true);
    // RSA = montant forfaitaire − forfait logement (l'aide au logement dépasse le forfait).
    expect(r.montantEstime).toBeCloseTo(base * (1 - n(B.rsa.forfait_logement_1_personne)), 1);
  });
  it("non éligible franc : moins de 25 ans sans enfant, ou revenus suffisants", () => {
    expect(regleRSA(situation({ demandeur: { age: 22 } })).eligible).toBe(false);
    expect(regleRSA(situation({ demandeur: { revenusActivite: 1500 } })).eligible).toBe(false);
  });
  it("cas limite : reste à verser sous le minimum de 6 €", () => {
    // Hébergé gratuitement : forfait logement plein, pas d'aide au logement.
    const forfait = base * (1 - n(B.rsa.forfait_logement_1_personne));
    const juste = situation({ logement: { statut: "heberge", loyer: null }, autresRevenus: forfait - (n(B.rsa.montant_minimum_verse) - 1) });
    const assez = situation({ logement: { statut: "heberge", loyer: null }, autresRevenus: forfait - (n(B.rsa.montant_minimum_verse) + 1) });
    expect(calculerRSA(juste).montant).toBe(0);
    expect(calculerRSA(assez).montant).toBeCloseTo(n(B.rsa.montant_minimum_verse) + 1, 5);
  });
  it("majoration pour parent isolé avec un enfant de moins de 3 ans", () => {
    const isole = calculerRSA(situation({ enfants: [1], logement: { statut: "heberge", loyer: null } }));
    const couple = calculerRSA(situation({ conjoint: {}, logement: { statut: "heberge", loyer: null } }));
    expect(isole.forfait).toBeGreaterThan(couple.forfait);
  });
});

describe("Chèque énergie", () => {
  it("éligible franc : sans revenu", () => {
    const r = regleChequeEnergie(situation({ complements: { rfr: 0 } }));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBe(B.cheque_energie.baremes.valeur.une_uc[0][1]);
    expect(r.confiance).toBe("probable");
  });
  it("non éligible franc : RFR élevé", () => {
    expect(regleChequeEnergie(situation({ complements: { rfr: 40000 } })).eligible).toBe(false);
  });
  it("cas limite : RFR par UC juste sous / au plafond", () => {
    const table = B.cheque_energie.baremes.valeur.une_uc;
    const plafond = table[table.length - 1][0];
    expect(regleChequeEnergie(situation({ complements: { rfr: plafond - 1 } })).montantEstime).toBe(table[table.length - 2][1]);
    expect(regleChequeEnergie(situation({ complements: { rfr: plafond } })).eligible).toBe(false);
  });
  it("unités de consommation : couple + 2 enfants = 2,1", () => {
    expect(unitesConsommation(4)).toBeCloseTo(2.1);
  });
});

describe("Protections énergie (ex-tarif social)", () => {
  it("suit l'éligibilité au chèque énergie", () => {
    expect(regleProtectionsEnergie(situation({ complements: { rfr: 0 } })).eligible).toBe(true);
    expect(regleProtectionsEnergie(situation({ complements: { rfr: 40000 } })).eligible).toBe(false);
    const plafond = B.cheque_energie.baremes.valeur.une_uc.at(-1)![0];
    expect(regleProtectionsEnergie(situation({ complements: { rfr: plafond } })).eligible).toBe(false);
  });
  it("n'affiche pas de montant", () => {
    expect(regleProtectionsEnergie(situation({ complements: { rfr: 0 } })).montantEstime).toBeNull();
  });
});

describe("Bourse sur critères sociaux", () => {
  const etudiant = (rfrParents: number | null) =>
    situation({ demandeur: { age: 20, activite: "etudiant" }, complements: { rfrParents, nbFreresSoeurs: 0, distanceEtudesKm: 0 } });
  it("éligible franc : parents sans revenu → échelon 7", () => {
    const r = regleBourse(etudiant(0));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBeCloseTo(B.bourse_superieur.montants_mensuels.valeur["7"] * 10);
  });
  it("non éligible franc : pas étudiant, ou parents aisés", () => {
    expect(regleBourse(situation()).eligible).toBe(false);
    expect(regleBourse(etudiant(150000)).eligible).toBe(false);
  });
  it("cas limite : revenus des parents au plafond de l'échelon 0bis", () => {
    const plafond = B.bourse_superieur.plafonds_par_echelon.valeur["0bis"][0];
    expect(echelonBourse(plafond, 0)).toBe("0bis");
    expect(echelonBourse(plafond + 1, 0)).toBeNull();
  });
  it("points de charge : frère ou sœur et distance", () => {
    expect(pointsDeCharge(1, 300)).toBe(2 + 2);
    expect(pointsDeCharge(0, 29)).toBe(0);
  });
  it("à vérifier sans les revenus des parents, avec la question inline", () => {
    const r = regleBourse(etudiant(null));
    expect(r.confiance).toBe("a_verifier");
    expect(r.questions).toContain("rfrParents");
  });
});

describe("Mobili-Jeune", () => {
  const alternant = (revenusActivite: number, age = 22) =>
    situation({ demandeur: { age, revenusActivite }, particulier: { alternance: true }, logement: { loyer: 600 } });
  it("éligible franc : alternant de 22 ans, loyer 600 €", () => {
    const r = regleMobiliJeune(alternant(900));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBe(n(B.mobili_jeune.montant_maximum));
  });
  it("non éligible franc : 30 ans, ou pas en alternance", () => {
    expect(regleMobiliJeune(alternant(900, 30)).eligible).toBe(false);
    expect(regleMobiliJeune(situation({ demandeur: { age: 22, revenusActivite: 900 } })).eligible).toBe(false);
  });
  it("cas limite : salaire égal au Smic brut / juste au-dessus", () => {
    const smic = n(B.smic.mensuel_brut);
    expect(regleMobiliJeune(alternant(smic)).eligible).toBe(true);
    expect(regleMobiliJeune(alternant(smic + 1)).eligible).toBe(false);
  });
});

describe("Allocations familiales", () => {
  const PF = B.prestations_familiales;
  it("éligible franc : 2 enfants jeunes, revenus modestes", () => {
    const r = regleAllocationsFamiliales(situation({ enfants: [3, 6], complements: { rfr: 20000 } }));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBeCloseTo(bmaf * n(PF.af_taux_2_enfants), 1);
  });
  it("non éligible franc : un seul enfant", () => {
    expect(regleAllocationsFamiliales(situation({ enfants: [5] })).eligible).toBe(false);
  });
  it("cas limite : RFR au plafond de la 1re tranche / juste au-dessus (montant divisé par 2)", () => {
    const p1 = n(PF.af_plafond_1_deux_enfants);
    const plein = regleAllocationsFamiliales(situation({ enfants: [3, 6], complements: { rfr: p1 } })).montantEstime!;
    const demi = regleAllocationsFamiliales(situation({ enfants: [3, 6], complements: { rfr: p1 + 1 } })).montantEstime!;
    expect(demi).toBeCloseTo(plein * n(PF.af_modulation_tranche_2), 1);
  });
  it("majoration pour âge : pas pour l'aîné de 2 enfants, oui pour le cadet de 15 ans", () => {
    const sans = regleAllocationsFamiliales(situation({ enfants: [16, 5], complements: { rfr: 0 } })).montantEstime!;
    const avec = regleAllocationsFamiliales(situation({ enfants: [17, 15], complements: { rfr: 0 } })).montantEstime!;
    expect(avec - sans).toBeCloseTo(bmaf * n(PF.af_majoration_age_taux), 1);
  });
});

describe("Complément familial", () => {
  const PF = B.prestations_familiales;
  const plafond3 = (isole: boolean) =>
    n(PF.cf_plafond_base) * (1 + 2 * n(PF.cf_majoration_2_premiers_enfants) + n(PF.cf_majoration_3e_enfant_et_plus)) +
    (isole ? n(PF.cf_majoration_biactifs_isoles) : 0);
  it("éligible franc : 3 enfants de 3 ans et plus, revenus faibles → montant majoré", () => {
    const r = regleComplementFamilial(situation({ enfants: [4, 7, 10], complements: { rfr: 10000 } }));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBeCloseTo(bmaf * n(PF.cf_taux_majore), 1);
  });
  it("non éligible franc : 2 enfants seulement", () => {
    expect(regleComplementFamilial(situation({ enfants: [4, 7], complements: { rfr: 0 } })).eligible).toBe(false);
  });
  it("cas limite : RFR au plafond / juste au-dessus (parent isolé)", () => {
    const p = plafond3(true);
    expect(regleComplementFamilial(situation({ enfants: [4, 7, 10], complements: { rfr: Math.floor(p) } })).eligible).toBe(true);
    expect(regleComplementFamilial(situation({ enfants: [4, 7, 10], complements: { rfr: Math.ceil(p) + 1 } })).eligible).toBe(false);
  });
});

describe("Allocation de rentrée scolaire", () => {
  const PF = B.prestations_familiales;
  it("éligible franc : un enfant de 8 ans, revenus faibles", () => {
    const r = regleARS(situation({ enfants: [8], complements: { rfr: 10000 } }));
    expect(r.eligible).toBe(true);
    expect(r.montantEstime).toBeCloseTo(bmaf * n(PF.ars_taux_6_10), 1);
    expect(r.periodicite).toBe("annuel");
  });
  it("non éligible franc : enfant de 4 ans", () => {
    expect(regleARS(situation({ enfants: [4], complements: { rfr: 0 } })).eligible).toBe(false);
  });
  it("cas limite : RFR au plafond / juste au-dessus", () => {
    const p = n(PF.ars_plafond_base) * (1 + n(PF.ars_majoration_par_enfant));
    expect(regleARS(situation({ enfants: [12], complements: { rfr: Math.floor(p) } })).eligible).toBe(true);
    expect(regleARS(situation({ enfants: [12], complements: { rfr: Math.ceil(p) + 1 } })).eligible).toBe(false);
  });
});

describe("AAH (éligibilité seulement)", () => {
  const A = B.aah;
  it("éligible franc : handicap ≥ 80 %, sans revenu", () => {
    const r = regleAAH(situation({ particulier: { handicap: true }, complements: { tauxHandicap: "80" } }));
    expect(r.eligible).toBe(true);
    expect(r.confiance).toBe("probable");
    expect(r.montantEstime).toBeNull();
  });
  it("non éligible franc : pas de handicap déclaré", () => {
    expect(regleAAH(situation()).eligible).toBe(false);
  });
  it("cas limite : revenus personnels au plafond / au-dessus", () => {
    const plafond = n(A.montant_max) * n(A.plafond_multiple_montant);
    const mk = (rev: number) => situation({ demandeur: { revenusActivite: rev }, particulier: { handicap: true }, complements: { tauxHandicap: "80" } });
    expect(regleAAH(mk(plafond / 12)).eligible).toBe(true);
    expect(regleAAH(mk(plafond / 12 + 1)).eligible).toBe(false);
  });
  it("à vérifier si le taux d'incapacité est inconnu, avec la question inline", () => {
    const r = regleAAH(situation({ particulier: { handicap: true } }));
    expect(r.confiance).toBe("a_verifier");
    expect(r.questions).toEqual(["tauxHandicap"]);
  });
});

describe("MaPrimeRénov'", () => {
  it("éligible franc : propriétaire aux revenus très modestes → bleu", () => {
    const r = regleMaPrimeRenov(situation({ logement: { statut: "proprietaire", loyer: null }, complements: { rfr: 10000 } }));
    expect(r.eligible).toBe(true);
    expect(r.explication).toContain("bleu");
  });
  it("non éligible franc : locataire", () => {
    expect(regleMaPrimeRenov(situation()).eligible).toBe(false);
  });
  it("cas limite : RFR au plafond bleu → bleu, un euro de plus → jaune", () => {
    const p = plafondMPR("bleu", 1, false);
    expect(categorieMPR(p, 1, false)).toBe("bleu");
    expect(categorieMPR(p + 1, 1, false)).toBe("jaune");
  });
  it("barème Île-de-France et personnes supplémentaires", () => {
    expect(plafondMPR("bleu", 1, true)).toBeGreaterThan(plafondMPR("bleu", 1, false));
    expect(plafondMPR("violet", 6, false)).toBe(
      B.maprimerenov.plafonds_hors_idf.valeur.intermediaires[4] + B.maprimerenov.plafonds_hors_idf.valeur.par_personne_sup.intermediaires,
    );
    expect(categorieMPR(1_000_000, 2, true)).toBe("rose");
  });
});

describe("Plafonnement des frais bancaires", () => {
  it("éligible : incidents répétés et faibles ressources", () => {
    expect(regleFraisBancaires(situation({ complements: { incidentsBancaires: true } })).eligible).toBe(true);
  });
  it("non éligible franc : pas d'incident", () => {
    expect(regleFraisBancaires(situation({ complements: { incidentsBancaires: false } })).eligible).toBe(false);
  });
  it("cas limite : ressources au seuil indicatif / au-dessus", () => {
    const seuil = n(B.smic.mensuel_brut) * n(B.frais_bancaires.seuil_revenu_indicatif_pct_smic);
    const mk = (rev: number) => situation({ demandeur: { revenusActivite: rev }, complements: { incidentsBancaires: true } });
    expect(regleFraisBancaires(mk(seuil)).eligible).toBe(true);
    expect(regleFraisBancaires(mk(seuil + 1)).eligible).toBe(false);
  });
  it("pose la question si l'information manque", () => {
    const r = regleFraisBancaires(situation());
    expect(r.confiance).toBe("a_verifier");
    expect(r.questions).toEqual(["incidentsBancaires"]);
  });
});

describe("Complémentaire santé solidaire", () => {
  const plafond = plafondCSS(1);
  const maj = 1 + n(B.css.majoration_participation);
  const mk = (annuel: number) => situation({ logement: { statut: "proprietaire", loyer: null }, demandeur: { age: 66 }, autresRevenus: annuel / 12 });
  it("éligible franc : sans revenu → gratuite", () => {
    const r = regleCSS(situation());
    expect(r.eligible).toBe(true);
    expect(r.explication).toContain("gratuite");
  });
  it("non éligible franc : revenus élevés", () => {
    expect(regleCSS(mk(30000)).eligible).toBe(false);
  });
  it("cas limite : au plafond → gratuite ; au plafond majoré → avec participation ; au-delà → rien", () => {
    expect(regleCSS(mk(plafond - 0.01)).explication).toContain("gratuite");
    const participation = regleCSS(mk(plafond * maj - 0.01));
    expect(participation.eligible).toBe(true);
    expect(participation.explication).toContain(`${n(B.css.participation_60_69_ans)} €`);
    expect(regleCSS(mk(plafond * maj + 12)).eligible).toBe(false);
  });
  it("plafond familial : 2 personnes = +50 %", () => {
    expect(plafondCSS(2)).toBe(Math.round(n(B.css.plafond_base) * (1 + n(B.css.coef_2e_personne))));
  });
});
