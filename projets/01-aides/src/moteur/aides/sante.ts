import { baremes, n } from "../baremes";
import { adultes, confianceDe, euros, nbEnfants, nbPersonnes, presDuSeuil, resultat, revenusMensuelsFoyer } from "../outils";
import type { ResultatAide, Situation } from "../types";
import { calculerAF, calculerCF } from "./famille";
import { calculerRSA } from "./minima";

const CSS = baremes.css;
const AAH = baremes.aah;

// ---------- Complémentaire santé solidaire ----------

export function plafondCSS(nbPers: number): number {
  const coef =
    1 +
    (nbPers >= 2 ? n(CSS.coef_2e_personne) : 0) +
    Math.min(Math.max(nbPers - 2, 0), 2) * n(CSS.coef_3e_4e_personne) +
    Math.max(nbPers - 4, 0) * n(CSS.coef_5e_personne_et_plus);
  return Math.round(n(CSS.plafond_base) * coef);
}

function participationMensuelle(age: number): number {
  if (age < 30) return n(CSS.participation_moins_30_ans);
  if (age < 50) return n(CSS.participation_30_49_ans);
  if (age < 60) return n(CSS.participation_50_59_ans);
  if (age < 70) return n(CSS.participation_60_69_ans);
  return n(CSS.participation_70_ans_et_plus);
}

export function calculerCSS(s: Situation): { gratuite: boolean; avecParticipation: boolean; participation: number; plafond: number; ressources: number } {
  const plafond = plafondCSS(nbPersonnes(s));
  // Ressources des 12 derniers mois : revenus + prestations familiales (approximation, hors forfait logement).
  const ressources = (revenusMensuelsFoyer(s) + calculerAF(s).montant + calculerCF(s).montant) * 12;
  const rsa = calculerRSA(s).montant > 0;
  const gratuite = rsa || ressources <= plafond;
  const avecParticipation = !gratuite && ressources <= plafond * (1 + n(CSS.majoration_participation));
  const ages = [...adultes(s).map((a) => a.age ?? 40), ...s.enfants.map((e) => e.age)];
  const participation = avecParticipation ? ages.reduce((t, a) => t + participationMensuelle(a), 0) : 0;
  return { gratuite, avecParticipation, participation, plafond, ressources };
}

export const regleCSS = (s: Situation): ResultatAide => {
  const c = calculerCSS(s);
  const valeurs = [CSS.plafond_base, CSS.coef_2e_personne, CSS.majoration_participation, CSS.participation_30_49_ans];
  const pres = presDuSeuil(c.ressources, c.plafond) || presDuSeuil(c.ressources, c.plafond * (1 + n(CSS.majoration_participation)));
  const base = {
    id: "css",
    nom: "Complémentaire santé solidaire",
    organisme: "Assurance maladie (CPAM ou MSA)",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F10027",
    periodicite: "mensuel" as const,
    valeurs,
    montantEstime: null,
  };
  if (!c.gratuite && !c.avecParticipation) {
    return resultat({
      ...base,
      eligible: false,
      confiance: confianceDe({ presSeuil: pres }),
      explication: `La complémentaire santé solidaire est réservée aux foyers dont les ressources annuelles sont sous ${euros(c.plafond * (1 + n(CSS.majoration_participation)))} pour votre composition familiale. Vos ressources estimées (${euros(c.ressources)}) dépassent ce plafond.`,
    });
  }
  return resultat({
    ...base,
    eligible: true,
    confiance: confianceDe({ presSeuil: pres }),
    explication: c.gratuite
      ? "Vous pourriez avoir une mutuelle gratuite : la complémentaire santé solidaire prend en charge le ticket modérateur, le forfait hospitalier et la plupart des lunettes, prothèses dentaires et auditives. La demande se fait en ligne sur le site de l'Assurance maladie."
      : `Vous pourriez avoir la complémentaire santé solidaire pour environ ${euros(c.participation)} par mois pour tout le foyer (le montant dépend de l'âge de chacun). Elle couvre la plupart des soins sans reste à charge.`,
  });
};

// ---------- AAH ----------

export const regleAAH = (s: Situation): ResultatAide => {
  const valeurs = [AAH.montant_max, AAH.taux_incapacite, AAH.taux_incapacite_rsdae, AAH.age_minimal, AAH.plafond_multiple_montant];
  const base = {
    id: "aah",
    nom: "Allocation aux adultes handicapés (AAH)",
    organisme: "MDPH puis CAF ou MSA",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F12242",
    periodicite: "mensuel" as const,
    valeurs,
    montantEstime: null,
  };
  if (!s.particulier.handicap) {
    return resultat({
      ...base,
      eligible: false,
      confiance: "probable",
      explication: "L'AAH s'adresse aux personnes dont le handicap est reconnu par la MDPH. Vous n'avez pas indiqué de situation de handicap.",
    });
  }
  const age = s.demandeur.age ?? 30;
  if (age < 16) {
    return resultat({
      ...base,
      eligible: false,
      confiance: "probable",
      explication: "L'AAH est versée à partir de 20 ans (16 ans si l'on n'est plus à la charge de ses parents). Pour un enfant, c'est l'allocation d'éducation de l'enfant handicapé (AEEH) qui s'applique.",
    });
  }
  // Depuis octobre 2023, les revenus du conjoint ne sont plus comptés.
  const plafond = n(AAH.montant_max) * n(AAH.plafond_multiple_montant) * (1 + n(AAH.majoration_plafond_par_enfant) * nbEnfants(s, 20));
  const revenusPerso = (s.demandeur.revenusActivite + (s.conjoint ? 0 : s.autresRevenus)) * 12;
  const sousPlafond = revenusPerso <= plafond;
  const taux = s.complements.tauxHandicap;
  const pctMax = Math.round(n(AAH.taux_incapacite) * 100);
  const pctMin = Math.round(n(AAH.taux_incapacite_rsdae) * 100);
  if (!sousPlafond) {
    return resultat({
      ...base,
      eligible: false,
      confiance: "possible",
      explication: `L'AAH est réservée aux personnes dont les revenus personnels restent sous environ ${euros(plafond)} par an (les revenus du conjoint ne comptent plus). Vos revenus semblent au-dessus, mais certains abattements peuvent s'appliquer.`,
    });
  }
  if (taux === null || taux === "inconnu") {
    return resultat({
      ...base,
      eligible: true,
      confiance: "a_verifier",
      questions: ["tauxHandicap"],
      explication: `L'AAH dépend du taux d'incapacité fixé par la MDPH : au moins ${pctMax} %, ou entre ${pctMin} et ${pctMax - 1} % avec une difficulté importante à trouver un emploi. Le montant maximal est de ${euros(n(AAH.montant_max))} par mois, réduit selon vos revenus.`,
    });
  }
  return resultat({
    ...base,
    eligible: true,
    confiance: taux === "80" ? "probable" : "possible",
    questions: [],
    explication:
      taux === "80"
        ? `Avec un taux d'incapacité d'au moins ${pctMax} % et des revenus modestes, vous remplissez les conditions principales de l'AAH. Le montant (jusqu'à ${euros(n(AAH.montant_max))} par mois) dépend de vos revenus : la demande se fait auprès de la MDPH.`
        : `Avec un taux entre ${pctMin} et ${pctMax - 1} %, l'AAH est accordée si la MDPH reconnaît une restriction durable d'accès à l'emploi. Le montant (jusqu'à ${euros(n(AAH.montant_max))} par mois) dépend de vos revenus.`,
  });
};
