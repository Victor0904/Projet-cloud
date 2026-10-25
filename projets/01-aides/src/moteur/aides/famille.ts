import { baremes, n } from "../baremes";
import { adultes, confianceDe, enCouple, euros, nbEnfants, nbEnfantsPF, presDuSeuil, resultat, revenuFiscal } from "../outils";
import type { ResultatAide, Situation } from "../types";

const PF = baremes.prestations_familiales;
const bmaf = () => n(PF.bmaf);

// ---------- Allocations familiales ----------

export function calculerAF(s: Situation): { montant: number; tranche: 1 | 2 | 3; plafond1: number; plafond2: number; ageIncertain: boolean } {
  const nb = nbEnfantsPF(s);
  if (nb < 2) return { montant: 0, tranche: 1, plafond1: 0, plafond2: 0, ageIncertain: false };
  const plafond1 = n(PF.af_plafond_1_deux_enfants) + (nb - 2) * n(PF.af_majoration_plafond_par_enfant);
  const plafond2 = n(PF.af_plafond_2_deux_enfants) + (nb - 2) * n(PF.af_majoration_plafond_par_enfant);
  const { montant: R } = revenuFiscal(s);
  const tranche = R <= plafond1 ? 1 : R <= plafond2 ? 2 : 3;
  const modulation = tranche === 1 ? 1 : tranche === 2 ? n(PF.af_modulation_tranche_2) : n(PF.af_modulation_tranche_3);

  const base = bmaf() * (n(PF.af_taux_2_enfants) + (nb - 2) * n(PF.af_taux_par_enfant_au_dela));

  // Majoration pour âge : enfants de 14 ans et plus, sauf l'aîné d'une famille de 2 enfants.
  // Depuis le 1er mars 2026, l'âge passe progressivement à 18 ans : un enfant de 14 ans aujourd'hui
  // n'y a droit que s'il a eu 14 ans avant le 1er mars 2026 → incertain.
  const seuil = n(PF.af_majoration_age_seuil);
  const ages = s.enfants.map((e) => e.age).filter((a) => a < n(PF.age_limite_enfant)).sort((a, b) => b - a);
  const eligiblesAge = ages.filter((a, i) => !(nb === 2 && i === 0) && a >= seuil + 1);
  const ageIncertain = ages.some((a, i) => !(nb === 2 && i === 0) && a === seuil);
  const majorations = eligiblesAge.length * bmaf() * n(PF.af_majoration_age_taux);

  return { montant: (base + majorations) * modulation, tranche, plafond1, plafond2, ageIncertain };
}

export const regleAllocationsFamiliales = (s: Situation): ResultatAide => {
  const nb = nbEnfantsPF(s);
  const valeurs = [PF.bmaf, PF.af_taux_2_enfants, PF.af_plafond_1_deux_enfants, PF.af_majoration_age_seuil];
  const base = {
    id: "allocations-familiales",
    nom: "Allocations familiales",
    organisme: "CAF ou MSA",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F13213",
    periodicite: "mensuel" as const,
    valeurs,
  };
  if (nb < 2) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: "Les allocations familiales sont versées à partir de 2 enfants à charge de moins de 20 ans. Votre foyer n'en compte pas assez pour l'instant (hors outre-mer, où elles existent dès le 1er enfant).",
    });
  }
  const af = calculerAF(s);
  const { montant: R, estime } = revenuFiscal(s);
  const pres = presDuSeuil(R, af.plafond1) || presDuSeuil(R, af.plafond2);
  return resultat({
    ...base,
    eligible: true,
    montantEstime: af.montant,
    confiance: confianceDe({ estime: (estime && pres) || af.ageIncertain, presSeuil: pres }),
    questions: estime && pres ? ["rfr"] : [],
    explication: `Elles sont versées sans démarche dès 2 enfants, avec un montant qui dépend du nombre d'enfants et des revenus (vous seriez dans la tranche ${af.tranche} sur 3). ${
      af.ageIncertain
        ? "Un enfant de 14 ans n'ouvre droit à la majoration pour âge que s'il a eu 14 ans avant le 1er mars 2026 : elle n'est pas comptée ici."
        : "Une majoration s'ajoute pour les enfants de 14 ans et plus (sauf l'aîné d'une famille de deux enfants)."
    }`,
  });
};

// ---------- Complément familial ----------

const estBiactif = (s: Situation) =>
  enCouple(s) && adultes(s).every((a) => a.revenusActivite * 12 >= 12 * bmaf());

export function calculerCF(s: Situation): { montant: number; plafond: number; majore: boolean } {
  const nbCF = nbEnfants(s, n(PF.cf_age_max), n(PF.cf_age_min));
  if (nbCF < n(PF.cf_nb_enfants_min)) return { montant: 0, plafond: 0, majore: false };
  const nbCharge = nbEnfants(s, n(PF.cf_age_max));
  const taux = 1 + n(PF.cf_majoration_2_premiers_enfants) * Math.min(nbCharge, 2) + n(PF.cf_majoration_3e_enfant_et_plus) * Math.max(nbCharge - 2, 0);
  const plafond = n(PF.cf_plafond_base) * taux + (!enCouple(s) || estBiactif(s) ? n(PF.cf_majoration_biactifs_isoles) : 0);
  const { montant: R } = revenuFiscal(s);
  if (R > plafond) return { montant: 0, plafond, majore: false };
  const majore = R <= plafond * n(PF.cf_coef_plafond_majore);
  return { montant: bmaf() * (majore ? n(PF.cf_taux_majore) : n(PF.cf_taux_base)), plafond, majore };
}

export const regleComplementFamilial = (s: Situation): ResultatAide => {
  const valeurs = [PF.bmaf, PF.cf_taux_base, PF.cf_taux_majore, PF.cf_plafond_base, PF.cf_majoration_biactifs_isoles];
  const base = {
    id: "complement-familial",
    nom: "Complément familial",
    organisme: "CAF ou MSA",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F13214",
    periodicite: "mensuel" as const,
    valeurs,
  };
  const nbCF = nbEnfants(s, n(PF.cf_age_max), n(PF.cf_age_min));
  if (nbCF < n(PF.cf_nb_enfants_min)) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: "Le complément familial est réservé aux familles d'au moins 3 enfants à charge âgés de 3 à 21 ans. Votre foyer ne remplit pas cette condition.",
    });
  }
  const cf = calculerCF(s);
  const { montant: R, estime } = revenuFiscal(s);
  const pres = presDuSeuil(R, cf.plafond) || presDuSeuil(R, cf.plafond * n(PF.cf_coef_plafond_majore));
  if (cf.montant === 0) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: confianceDe({ estime: estime && pres, presSeuil: pres }),
      questions: estime && pres ? ["rfr"] : [],
      explication: `Avec environ ${euros(R)} de revenus annuels, vous dépassez le plafond de ${euros(cf.plafond)}. Le complément familial est versé sous condition de ressources.`,
    });
  }
  return resultat({
    ...base,
    eligible: true,
    montantEstime: cf.montant,
    confiance: confianceDe({ estime: estime && pres, presSeuil: pres }),
    questions: estime && pres ? ["rfr"] : [],
    explication: `Avec au moins 3 enfants de 3 ans et plus et des revenus sous ${euros(cf.plafond)}, la CAF verse ce complément chaque mois. ${cf.majore ? "Vos revenus sont assez bas pour le montant majoré." : "Vous auriez le montant de base (le montant majoré est réservé aux revenus les plus faibles)."}`,
  });
};

// ---------- Allocation de rentrée scolaire ----------

export function calculerARS(s: Situation): { montant: number; plafond: number; nbScolaires: number } {
  const scolaires = s.enfants.filter((e) => e.age >= 6 && e.age <= 18);
  const nbCharge = nbEnfantsPF(s);
  const plafond = n(PF.ars_plafond_base) * (1 + n(PF.ars_majoration_par_enfant) * nbCharge);
  const { montant: R } = revenuFiscal(s);
  if (scolaires.length === 0 || R > plafond) return { montant: 0, plafond, nbScolaires: scolaires.length };
  const montant = scolaires.reduce((t, e) => {
    const taux = e.age <= 10 ? PF.ars_taux_6_10 : e.age <= 14 ? PF.ars_taux_11_14 : PF.ars_taux_15_18;
    return t + bmaf() * n(taux);
  }, 0);
  return { montant, plafond, nbScolaires: scolaires.length };
}

export const regleARS = (s: Situation): ResultatAide => {
  const valeurs = [PF.bmaf, PF.ars_taux_6_10, PF.ars_plafond_base, PF.ars_majoration_par_enfant];
  const base = {
    id: "ars",
    nom: "Allocation de rentrée scolaire (ARS)",
    organisme: "CAF ou MSA",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F1878",
    periodicite: "annuel" as const,
    valeurs,
  };
  const ars = calculerARS(s);
  if (ars.nbScolaires === 0) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: "L'allocation de rentrée scolaire concerne les enfants de 6 à 18 ans scolarisés. Aucun enfant de votre foyer n'a cet âge.",
    });
  }
  const { montant: R, estime } = revenuFiscal(s);
  const pres = presDuSeuil(R, ars.plafond);
  if (ars.montant === 0) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: confianceDe({ estime: estime && pres, presSeuil: pres }),
      questions: estime && pres ? ["rfr"] : [],
      explication: `Le plafond de ressources pour votre famille est d'environ ${euros(ars.plafond)} par an, et vos revenus estimés le dépassent. L'ARS est réservée aux familles modestes.`,
    });
  }
  return resultat({
    ...base,
    eligible: true,
    montantEstime: ars.montant,
    confiance: confianceDe({ estime: estime && pres, presSeuil: pres }),
    questions: estime && pres ? ["rfr"] : [],
    explication: `Versée fin août pour chaque enfant de 6 à 18 ans scolarisé, son montant augmente avec l'âge de l'enfant. Vos revenus sont sous le plafond de ${euros(ars.plafond)} : elle est en général versée automatiquement (attestation de scolarité à fournir dès 16 ans).`,
  });
};
