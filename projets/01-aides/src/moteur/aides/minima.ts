import { baremes, n } from "../baremes";
import { adultes, confianceDe, enCouple, euros, nbEnfants, presDuSeuil, resultat, revenusActiviteFoyer } from "../outils";
import type { Adulte, ResultatAide, Situation } from "../types";
import { calculerAF, calculerCF } from "./famille";
import { calculerAideLogement } from "./logement";

const RSA = baremes.rsa;
const PPA = baremes.prime_activite;

/** Enfants comptés pour le RSA et la prime d'activité (moins de 25 ans, à charge). */
const nbEnfantsRsa = (s: Situation) => nbEnfants(s, n(RSA.age_minimum));

/** Coefficient familial commun au RSA et à la prime d'activité (1 ; 1,5 ; 1,8 ; puis +0,3 ou +0,4). */
export function coefFamilial(nbParents: number, nbEnf: number): number {
  const np = nbParents + nbEnf;
  return (
    1 +
    (np >= 2 ? n(RSA.majoration_2e_personne) : 0) +
    (np >= 3 ? n(RSA.majoration_3e_personne) : 0) +
    (np >= 4 ? (nbParents === 1 ? n(RSA.majoration_enfant_supplementaire) : n(RSA.majoration_3e_personne)) : 0) +
    Math.max(np - 4, 0) * n(RSA.majoration_enfant_supplementaire)
  );
}

/** Parent isolé avec un enfant de moins de 3 ans, ou femme enceinte seule : montant majoré. */
const isolementMajore = (s: Situation) =>
  !enCouple(s) && (s.particulier.grossesse || s.enfants.some((e) => e.age < n(RSA.age_limite_enfant_isolement)));

function montantForfaitaire(s: Situation, base: number, majIsolBase: number, majIsolEnfant: number): number {
  const nbEnf = nbEnfantsRsa(s);
  if (isolementMajore(s)) return base * (majIsolBase + majIsolEnfant * nbEnf);
  return base * coefFamilial(adultes(s).length, nbEnf);
}

/** Forfait logement : déduit si l'on est logé gratuitement, propriétaire, ou si l'on touche une aide au logement. */
function forfaitLogement(s: Situation, base: number, t1: number, t2: number, t3: number, aideLogement: number): number {
  const np = adultes(s).length + nbEnfantsRsa(s);
  const coef = 1 + (np >= 2 ? n(RSA.majoration_2e_personne) : 0) + (np >= 3 ? n(RSA.majoration_3e_personne) : 0);
  const forfait = base * coef * (np === 1 ? t1 : np === 2 ? t2 : t3);
  const statut = s.logement.statut;
  if (statut === "proprietaire" || statut === "heberge") return forfait;
  if (aideLogement > 0) return Math.min(aideLogement, forfait);
  return 0;
}

/** Prestations familiales comptées dans les ressources (AF, complément familial ; pas l'ARS). */
const prestationsFamiliales = (s: Situation) => calculerAF(s).montant + calculerCF(s).montant;

// ---------- RSA ----------

export function calculerRSA(s: Situation): { montant: number; forfait: number; ressources: number } {
  const forfait = montantForfaitaire(s, n(RSA.montant_base), n(RSA.majoration_isolement_base), n(RSA.majoration_isolement_par_enfant));
  const al = calculerAideLogement(s)?.montant ?? 0;
  const fl = forfaitLogement(s, n(RSA.montant_base), n(RSA.forfait_logement_1_personne), n(RSA.forfait_logement_2_personnes), n(RSA.forfait_logement_3_personnes), al);
  const ressources = revenusActiviteFoyer(s) + Math.max(0, s.autresRevenus) + prestationsFamiliales(s) + fl;
  let montant = Math.max(0, forfait - ressources);
  if (montant < n(RSA.montant_minimum_verse)) montant = 0;
  return { montant, forfait, ressources };
}

export const regleRSA = (s: Situation): ResultatAide => {
  const valeurs = [RSA.montant_base, RSA.majoration_2e_personne, RSA.forfait_logement_1_personne, RSA.majoration_isolement_base];
  const base = {
    id: "rsa",
    nom: "Revenu de solidarité active (RSA)",
    organisme: "CAF ou MSA (pour le département)",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F19778",
    periodicite: "mensuel" as const,
    valeurs,
  };
  const age = s.demandeur.age;
  const aCharge = s.enfants.length > 0 || s.particulier.grossesse;
  if (age !== null && age < n(RSA.age_minimum) && !aCharge) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: "Le RSA est ouvert à partir de 25 ans, sauf si vous avez un enfant à charge ou attendez un enfant. Un « RSA jeune actif » existe pour les 18-24 ans ayant travaillé 2 ans à temps plein sur les 3 dernières années.",
    });
  }
  if (s.demandeur.activite === "etudiant" && (!s.conjoint || s.conjoint.activite === "etudiant")) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "possible",
      explication: "Les étudiants n'ont en général pas droit au RSA, sauf exceptions (par exemple s'ils ont des enfants et peu de ressources). Renseignez-vous auprès de votre CAF si c'est votre cas.",
    });
  }
  const rsa = calculerRSA(s);
  if (rsa.montant <= 0) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: confianceDe({ presSeuil: presDuSeuil(rsa.ressources, rsa.forfait, 0.1) }),
      explication: `Le RSA complète les ressources jusqu'à ${euros(rsa.forfait)} par mois pour votre foyer. Vos ressources (environ ${euros(rsa.ressources)} par mois, prestations comprises) dépassent ce montant.`,
    });
  }
  return resultat({
    ...base,
    eligible: true,
    montantEstime: rsa.montant,
    confiance: confianceDe({ presSeuil: presDuSeuil(rsa.ressources, rsa.forfait, 0.1) }),
    explication: `Le RSA complète vos ressources jusqu'à un montant garanti de ${euros(rsa.forfait)} par mois pour votre foyer. Il est calculé sur vos revenus des 3 derniers mois et s'accompagne d'un suivi pour l'insertion (inscription à France Travail).`,
  });
};

// ---------- Prime d'activité ----------

const estApprenant = (a: Adulte, s: Situation, estDemandeur: boolean) =>
  a.activite === "etudiant" || (estDemandeur && (s.particulier.apprentissage || s.particulier.alternance));

const plancherApprenant = () =>
  n(PPA.plancher_apprenant_heures_smic) * n(baremes.smic.horaire_brut) * n(PPA.plancher_apprenant_taux);

export function bonification(revenuActivite: number): number {
  const smicH = n(baremes.smic.horaire_brut);
  const s1 = n(PPA.bonification_seuil_smic_horaire) * smicH;
  const s2 = n(PPA.bonification_seuil_max_smic_horaire) * smicH;
  const max = Math.round(n(PPA.bonification_taux_max) * n(PPA.montant_base) * 100) / 100;
  return Math.min(max, Math.max(0, (max * (revenuActivite - s1)) / (s2 - s1)));
}

export function calculerPrimeActivite(s: Situation): { montant: number; eligibleActivite: boolean } {
  const liste = adultes(s).map((a, i) => ({ a, apprenant: estApprenant(a, s, i === 0) }));
  // Un étudiant ou apprenti n'ouvre droit qu'au-delà d'environ 78 % du Smic net.
  const ouvrants = liste.filter(({ a, apprenant }) => a.revenusActivite > 0 && (!apprenant || a.revenusActivite >= plancherApprenant()));
  const majeurs = (s.demandeur.age ?? 99) >= n(PPA.age_minimum);
  if (ouvrants.length === 0 || !majeurs) return { montant: 0, eligibleActivite: false };

  const revAct = revenusActiviteFoyer(s);
  const forfait = montantForfaitaire(s, n(PPA.montant_base), n(PPA.majoration_isolement_base), n(PPA.majoration_isolement_par_enfant));
  const bonif = liste.reduce((t, { a }) => t + bonification(a.revenusActivite), 0);
  const al = calculerAideLogement(s)?.montant ?? 0;
  const fl = forfaitLogement(s, n(PPA.montant_base), n(PPA.forfait_logement_1_personne), n(PPA.forfait_logement_2_personnes), n(PPA.forfait_logement_3_personnes), al);
  const ressources = revAct + Math.max(0, s.autresRevenus) + prestationsFamiliales(s) + fl;
  let montant = Math.max(0, forfait + n(PPA.part_revenus_activite) * revAct + bonif - Math.max(forfait, ressources));
  if (montant < n(PPA.montant_minimum_verse)) montant = 0;
  return { montant, eligibleActivite: true };
}

export const reglePrimeActivite = (s: Situation): ResultatAide => {
  const valeurs = [PPA.montant_base, PPA.part_revenus_activite, PPA.bonification_taux_max, PPA.bonification_seuil_max_smic_horaire, baremes.smic.horaire_brut];
  const base = {
    id: "prime-activite",
    nom: "Prime d'activité",
    organisme: "CAF ou MSA",
    lien: "https://www.service-public.fr/particuliers/vosdroits/F2882",
    periodicite: "mensuel" as const,
    valeurs,
  };
  const ppa = calculerPrimeActivite(s);
  if (!ppa.eligibleActivite) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: null,
      confiance: "probable",
      explication: `La prime d'activité complète les revenus des personnes qui travaillent (salariés ou indépendants, dès 18 ans). Les étudiants et apprentis y ont droit seulement s'ils gagnent au moins ${euros(plancherApprenant())} par mois.`,
    });
  }
  if (ppa.montant <= 0) {
    return resultat({
      ...base,
      eligible: false,
      montantEstime: 0,
      confiance: "possible",
      explication: "Vos revenus d'activité et les autres ressources du foyer sont trop élevés pour la prime d'activité. Elle diminue quand les revenus augmentent et s'annule au-delà d'un certain niveau, qui dépend de la taille du foyer.",
    });
  }
  return resultat({
    ...base,
    eligible: true,
    montantEstime: ppa.montant,
    confiance: confianceDe({ presSeuil: ppa.montant < 60 }),
    explication: `La prime d'activité complète les revenus du travail : une part fixe selon le foyer, plus environ ${Math.round(n(PPA.part_revenus_activite) * 100)} % de vos revenus d'activité et un bonus par personne qui travaille, moins vos ressources. Elle est recalculée tous les 3 mois sur votre déclaration trimestrielle.`,
  });
};
