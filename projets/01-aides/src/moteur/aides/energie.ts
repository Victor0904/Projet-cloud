import { baremes, n } from "../baremes";
import { confianceDe, euros, nbPersonnes, presDuSeuil, resultat, revenuFiscal } from "../outils";
import type { ResultatAide, Situation } from "../types";

const CE = baremes.cheque_energie;

/** Unités de consommation du chèque énergie : 1 + 0,5 pour la 2e personne + 0,3 par personne en plus. */
export const unitesConsommation = (nbPers: number) =>
  n(CE.uc_premiere_personne) + (nbPers >= 2 ? n(CE.uc_deuxieme_personne) : 0) + Math.max(nbPers - 2, 0) * n(CE.uc_autres_personnes);

export function calculerChequeEnergie(s: Situation): { montant: number; rfrParUc: number; plafond: number; uc: number } {
  const uc = unitesConsommation(nbPersonnes(s));
  const { montant: rfr } = revenuFiscal(s);
  const rfrParUc = rfr / uc;
  const table = uc <= 1 ? CE.baremes.valeur.une_uc : uc < 2 ? CE.baremes.valeur.entre_1_et_2_uc : CE.baremes.valeur.deux_uc_et_plus;
  const plafond = table[table.length - 1][0];
  let montant = 0;
  for (const [seuil, m] of table) if (rfrParUc >= seuil) montant = m;
  return { montant: rfrParUc < plafond ? montant : 0, rfrParUc, plafond, uc };
}

export const regleChequeEnergie = (s: Situation): ResultatAide => {
  const valeurs = [CE.baremes, CE.uc_premiere_personne, CE.uc_deuxieme_personne, CE.uc_autres_personnes];
  const base = {
    id: "cheque-energie",
    nom: "Chèque énergie",
    organisme: "État (Agence de services et de paiement)",
    lien: CE.lien.valeur,
    periodicite: "annuel" as const,
    valeurs,
  };
  const ce = calculerChequeEnergie(s);
  const { estime } = revenuFiscal(s);
  const pres = presDuSeuil(ce.rfrParUc, ce.plafond, 0.1);
  if (ce.montant === 0) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: confianceDe({ estime: estime && pres, presSeuil: pres }),
      questions: estime ? ["rfr"] : [],
      explication: `Le chèque énergie est réservé aux foyers dont le revenu fiscal de référence est inférieur à ${euros(ce.plafond)} par unité de consommation. Le vôtre est estimé à ${euros(ce.rfrParUc)} par unité.`,
    });
  }
  return resultat({
    ...base,
    eligible: true,
    montantEstime: ce.montant,
    confiance: confianceDe({ estime, presSeuil: pres }),
    questions: estime ? ["rfr"] : [],
    explication: `Votre revenu fiscal estimé (${euros(ce.rfrParUc)} par unité de consommation) est sous le plafond de ${euros(ce.plafond)}. Le chèque, envoyé une fois par an, paie une partie des factures d'électricité, de gaz, de fioul, de bois ou de travaux de rénovation.`,
  });
};

/**
 * « Tarif social de l'électricité » : supprimé fin 2017, remplacé par le chèque énergie.
 * On signale les protections qui restent attachées au chèque énergie.
 */
export const regleProtectionsEnergie = (s: Situation): ResultatAide => {
  const ce = calculerChequeEnergie(s);
  const { estime } = revenuFiscal(s);
  return resultat({
    id: "protections-energie",
    nom: "Protections énergie (ex-tarif social de l'électricité)",
    organisme: "Fournisseur d'énergie",
    lien: CE.lien.valeur,
    periodicite: "annuel",
    valeurs: [baremes.energie_protections.description, CE.baremes],
    eligible: ce.montant > 0,
    montantEstime: null,
    confiance: ce.montant > 0 ? confianceDe({ estime }) : "probable",
    questions: estime && ce.montant > 0 ? ["rfr"] : [],
    explication:
      ce.montant > 0
        ? "Le tarif social de l'électricité n'existe plus depuis 2018 : le chèque énergie l'a remplacé. En le transmettant à votre fournisseur, vous bénéficiez de protections : mise en service gratuite, frais réduits en cas d'impayé et pas de baisse de puissance pendant la trêve hivernale."
        : "Le tarif social de l'électricité a été remplacé en 2018 par le chèque énergie. Les protections associées (frais réduits, trêve hivernale renforcée) sont réservées aux bénéficiaires du chèque.",
  });
};
