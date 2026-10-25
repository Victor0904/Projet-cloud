// Droits et aides après un décès : qui y a probablement droit, combien, où le demander.
// Estimations indicatives : seuls les organismes calculent le montant réel.
import { euros } from "@vie-fr/fr-data";
import { valeurDroit, type ValeurDroit } from "../lib/donnees";
import { estConjointMarie, type Profil } from "../plan/profil";

export type Eligibilite = "probable" | "possible" | "non_concerne";

export type Droit = {
  id: string;
  titre: string;
  eligibilite: Eligibilite;
  /** Montant lisible, ex. « 4 009 € » ou « jusqu'à 719,58 € par mois ». */
  montant?: string;
  explication: string;
  ouDemander: string;
  /** Démarche du plan correspondante. */
  demarche?: string;
  /** Valeurs utilisées, pour afficher leur source et leur date de vérification. */
  valeurs: ValeurDroit[];
};

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

// ——— Calculs ———

export function capitalDecesIndependant(retraite = false): number {
  const pass = valeurDroit("pass_annuel").valeur;
  const taux = valeurDroit(
    retraite ? "capital_deces_independant_retraite_taux" : "capital_deces_independant_taux",
  ).valeur;
  return arrondi2(pass * taux);
}

/**
 * Allocation de veuvage mensuelle estimée : elle complète les ressources jusqu'au plafond trimestriel,
 * sans dépasser le montant maximum. `ressourcesMensuelles` = moyenne des 3 derniers mois.
 */
export function estimerVeuvage(ressourcesMensuelles: number): number {
  const max = valeurDroit("veuvage_montant_max").valeur;
  const plafondTrimestriel = valeurDroit("veuvage_plafond_trimestriel").valeur;
  const complement = (plafondTrimestriel - 3 * Math.max(0, ressourcesMensuelles)) / 3;
  return arrondi2(Math.min(max, Math.max(0, complement)));
}

export type EstimationReversion = {
  /** 54 % de la retraite de base du défunt, par mois. */
  theorique: number;
  /** Après application du plafond de ressources, par mois. */
  estimee: number;
  reduite: boolean;
};

/**
 * Réversion du régime général : 54 % de la retraite de base du défunt, réduite si les ressources
 * annuelles du survivant plus la réversion dépassent le plafond. Simplification : les règles fines
 * (abattement sur les revenus d'activité, biens propres) ne sont pas prises en compte.
 */
export function estimerReversionBase(
  retraiteBaseMensuelleDefunt: number,
  ressourcesAnnuellesSurvivant: number,
  enCouple = false,
): EstimationReversion {
  const taux = valeurDroit("reversion_base_taux").valeur;
  const plafond = valeurDroit(enCouple ? "reversion_plafond_couple" : "reversion_plafond_seul").valeur;
  const theorique = arrondi2(Math.max(0, retraiteBaseMensuelleDefunt) * taux);
  const ressources = Math.max(0, ressourcesAnnuellesSurvivant);
  if (ressources + 12 * theorique <= plafond) return { theorique, estimee: theorique, reduite: false };
  const estimee = arrondi2(Math.max(0, plafond - ressources) / 12);
  return { theorique, estimee, reduite: true };
}

/** Réversion Agirc-Arrco : 60 % de la retraite complémentaire du défunt, sans condition de ressources. */
export function estimerReversionComplementaire(retraiteComplementaireMensuelleDefunt: number): number {
  return arrondi2(
    Math.max(0, retraiteComplementaireMensuelleDefunt) * valeurDroit("reversion_agirc_arrco_taux").valeur,
  );
}

// ——— Liste des droits selon le profil ———

function capitalDeces(p: Profil): Droit {
  const base = {
    id: "capital_deces",
    titre: "Capital décès de l'Assurance maladie",
    ouDemander: "CPAM du défunt (formulaire S3180), ou MSA pour le régime agricole.",
    demarche: "cpam_capital",
  };
  if (p.lien === "sans_lien")
    return {
      ...base,
      eligibilite: "non_concerne",
      explication: "Il est réservé aux personnes à la charge du défunt et à sa famille proche.",
      valeurs: [],
    };
  const forfait = valeurDroit("capital_deces_forfait");
  switch (p.activite) {
    case "salarie":
    case "demandeur_emploi":
      return {
        ...base,
        eligibilite: "probable",
        montant: euros(forfait.valeur, true),
        explication:
          "Somme forfaitaire, versée une fois, non imposable. Elle va d'abord aux personnes qui étaient à la charge du défunt, sinon au conjoint, aux enfants, puis aux parents.",
        valeurs: [forfait],
      };
    case "independant":
      return {
        ...base,
        eligibilite: "probable",
        montant: euros(capitalDecesIndependant(), true),
        explication:
          "Pour un travailleur indépendant en activité, le capital est une part du plafond de la Sécurité sociale.",
        valeurs: [valeurDroit("pass_annuel"), valeurDroit("capital_deces_independant_taux")],
      };
    case "retraite":
      return {
        ...base,
        eligibilite: "possible",
        montant: euros(forfait.valeur, true),
        explication: `Pour un retraité du régime salarié, seulement si le décès survient peu après la fin de l'activité (moins d'un an) : renseignez-vous auprès de la CPAM. Pour un ancien indépendant retraité, le capital peut être de ${euros(capitalDecesIndependant(true), true)}.`,
        valeurs: [forfait, valeurDroit("pass_annuel"), valeurDroit("capital_deces_independant_retraite_taux")],
      };
    case "fonctionnaire":
      return {
        ...base,
        eligibilite: "probable",
        ouDemander: "L'administration employeur du défunt.",
        explication:
          "Pour un agent public, le capital décès est versé par l'employeur public, avec un montant propre à la fonction publique.",
        valeurs: [],
        demarche: "employeur_defunt",
      };
    default:
      return {
        ...base,
        eligibilite: "non_concerne",
        explication:
          "Le capital décès suppose que le défunt travaillait, était indemnisé par France Travail ou venait de prendre sa retraite.",
        valeurs: [],
      };
  }
}

function veuvage(p: Profil): Droit {
  const max = valeurDroit("veuvage_montant_max");
  const age = valeurDroit("veuvage_age_max");
  const base = {
    id: "veuvage",
    titre: "Allocation de veuvage",
    ouDemander: "Caisse de retraite du défunt (Assurance retraite ou MSA).",
    demarche: "veuvage",
    valeurs: [max, valeurDroit("veuvage_plafond_trimestriel"), age, valeurDroit("veuvage_duree")],
  };
  if (!estConjointMarie(p))
    return {
      ...base,
      eligibilite: "non_concerne",
      explication: "Réservée au conjoint marié survivant (pas au partenaire de Pacs ni au concubin).",
    };
  if (p.ageConjoint !== null && p.ageConjoint >= age.valeur)
    return {
      ...base,
      eligibilite: "non_concerne",
      explication: `Réservée aux conjoints de moins de ${age.valeur} ans. À partir de cet âge, c'est la pension de réversion qui prend le relais.`,
    };
  return {
    ...base,
    eligibilite: "possible",
    montant: `jusqu'à ${euros(max.valeur)} par mois`,
    explication: `Pour le conjoint marié de moins de ${age.valeur} ans, qui ne vit pas en couple et dont les ressources sont modestes. Versée pendant ${valeurDroit("veuvage_duree").valeur} ans au plus.`,
  };
}

function reversion(p: Profil): Droit[] {
  const taux = valeurDroit("reversion_base_taux");
  const ageMin = valeurDroit("reversion_age_min");
  const tauxCompl = valeurDroit("reversion_agirc_arrco_taux");
  if (!estConjointMarie(p))
    return [
      {
        id: "reversion",
        titre: "Pension de réversion",
        eligibilite: "non_concerne",
        explication:
          p.lien === "conjoint"
            ? "La réversion est réservée aux personnes mariées : le Pacs et le concubinage n'y ouvrent pas droit."
            : "Elle concerne le conjoint marié (ou ex-conjoint) du défunt. Les enfants orphelins peuvent, dans certains régimes, avoir droit à une réversion d'orphelin.",
        ouDemander: "info-retraite.fr",
        demarche: "reversion",
        valeurs: [],
      },
    ];
  const elig: Eligibilite = p.ageConjoint !== null && p.ageConjoint < ageMin.valeur ? "possible" : "probable";
  const droits: Droit[] = [
    {
      id: "reversion",
      titre: "Pension de réversion du régime de base",
      eligibilite: elig,
      montant: `${Math.round(taux.valeur * 100)} % de la retraite de base du défunt`,
      explication: `À partir de ${ageMin.valeur} ans, sous condition de ressources. Si vos ressources dépassent le plafond, elle est réduite d'autant.`,
      ouDemander: "Une seule demande sur info-retraite.fr, pour tous les régimes.",
      demarche: "reversion",
      valeurs: [taux, ageMin, valeurDroit("reversion_plafond_seul"), valeurDroit("reversion_plafond_couple")],
    },
  ];
  if (p.activite === "salarie" || p.activite === "retraite" || p.activite === "demandeur_emploi")
    droits.push({
      id: "reversion_complementaire",
      titre: "Réversion de la retraite complémentaire Agirc-Arrco",
      eligibilite: elig,
      montant: `${Math.round(tauxCompl.valeur * 100)} % de la retraite complémentaire du défunt`,
      explication: `Pour un défunt ancien salarié du privé. Dès ${ageMin.valeur} ans (plus tôt avec 2 enfants à charge ou en cas d'invalidité), sans condition de ressources. Elle cesse en cas de remariage.`,
      ouDemander: "La même demande sur info-retraite.fr, ou agirc-arrco.fr.",
      demarche: "reversion",
      valeurs: [tauxCompl, ageMin],
    });
  return droits;
}

function asf(p: Profil): Droit {
  const un = valeurDroit("asf_un_parent");
  const deux = valeurDroit("asf_deux_parents");
  return {
    id: "asf",
    titre: "Allocation de soutien familial (enfants)",
    eligibilite: p.enfantsMineurs && p.lien !== "sans_lien" ? "probable" : "non_concerne",
    montant: `${euros(un.valeur)} par enfant et par mois (${euros(deux.valeur)} si l'enfant a perdu ses deux parents)`,
    explication:
      "Pour chaque enfant à charge qui a perdu un parent, sans condition de ressources. Elle est demandée à la CAF par la personne qui élève l'enfant.",
    ouDemander: "CAF (ou MSA).",
    demarche: "asf",
    valeurs: [un, deux],
  };
}

function obseques(): Droit[] {
  const plafond = valeurDroit("obseques_prelevement_banque");
  return [
    {
      id: "obseques_banque",
      titre: "Paiement des obsèques par la banque du défunt",
      eligibilite: "probable",
      montant: `jusqu'à ${euros(plafond.valeur, true)}`,
      explication:
        "La personne qui a payé les obsèques, héritière ou non, peut se faire rembourser sur les comptes du défunt, dans la limite des sommes disponibles. La banque peut aussi payer directement les pompes funèbres.",
      ouDemander: "La banque du défunt, avec la facture.",
      demarche: "remboursement_obseques",
      valeurs: [plafond],
    },
    {
      id: "aides_obseques",
      titre: "Autres aides aux frais d'obsèques",
      eligibilite: "possible",
      explication:
        "Selon les cas : allocation obsèques de la mutuelle ou d'une prévoyance, aide de l'action sociale de la caisse de retraite, contrat obsèques. Si le défunt n'avait pas de ressources, la commune prend en charge des obsèques simples.",
      ouDemander: "Mutuelle, caisse de retraite (action sociale), mairie (CCAS).",
      demarche: "assurances",
      valeurs: [],
    },
  ];
}

function conge(p: Profil): Droit {
  const base = {
    id: "conge",
    titre: "Congé pour décès (si vous êtes salarié)",
    ouDemander: "Votre employeur.",
    demarche: "conge_proche",
  };
  if (!p.procheSalarie || !["conjoint", "enfant", "parent", "frere_soeur"].includes(p.lien))
    return {
      ...base,
      eligibilite: "non_concerne",
      explication:
        "Le Code du travail prévoit ce congé pour le décès d'un conjoint, d'un enfant, d'un parent, d'un beau-parent, d'un frère ou d'une sœur. Votre convention collective peut aller plus loin.",
      valeurs: [],
    };
  if (p.lien === "parent") {
    const j = valeurDroit(p.defuntJeuneOuParent ? "conge_enfant_moins_25" : "conge_enfant");
    const deuil = valeurDroit("conge_deuil");
    return {
      ...base,
      eligibilite: "probable",
      montant: p.defuntJeuneOuParent
        ? `${j.valeur} jours ouvrables + ${deuil.valeur} jours de deuil`
        : `${j.valeur} jours ouvrables`,
      explication: "Congé payé, en plus de vos congés annuels. Votre convention collective peut prévoir davantage.",
      valeurs: p.defuntJeuneOuParent ? [j, deuil] : [j],
    };
  }
  const j = valeurDroit(p.lien === "conjoint" ? "conge_conjoint" : "conge_parent_ou_fratrie");
  return {
    ...base,
    eligibilite: "probable",
    montant: `${j.valeur} jours ouvrables`,
    explication: "Congé payé, à prendre au moment du décès. Votre convention collective peut prévoir davantage.",
    valeurs: [j],
  };
}

export function droitsApplicables(p: Profil): Droit[] {
  const tous = [capitalDeces(p), veuvage(p), ...reversion(p), asf(p), ...obseques(), conge(p)];
  const rang: Record<Eligibilite, number> = { probable: 0, possible: 1, non_concerne: 2 };
  return tous.sort((a, b) => rang[a.eligibilite] - rang[b.eligibilite]);
}
