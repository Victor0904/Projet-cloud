import { baremes, n } from "../baremes";
import { departementDe, euros, nbPersonnes, presDuSeuil, resultat, revenuFiscal, revenusMensuelsFoyer } from "../outils";
import type { ResultatAide, Situation } from "../types";
import { calculerRSA } from "./minima";

const MPR = baremes.maprimerenov;
const FB = baremes.frais_bancaires;

// ---------- MaPrimeRénov' ----------

export type CategorieMPR = "bleu" | "jaune" | "violet" | "rose";

const NOMS: Record<CategorieMPR, string> = {
  bleu: "bleu (revenus très modestes)",
  jaune: "jaune (revenus modestes)",
  violet: "violet (revenus intermédiaires)",
  rose: "rose (revenus supérieurs)",
};
const CLE: Record<Exclude<CategorieMPR, "rose">, "tres_modestes" | "modestes" | "intermediaires"> = {
  bleu: "tres_modestes",
  jaune: "modestes",
  violet: "intermediaires",
};

export function plafondMPR(cat: Exclude<CategorieMPR, "rose">, nbPers: number, idf: boolean): number {
  const t = idf ? MPR.plafonds_idf.valeur : MPR.plafonds_hors_idf.valeur;
  const cle = CLE[cat];
  const liste = t[cle];
  return nbPers <= 5 ? liste[Math.max(1, nbPers) - 1] : liste[4] + (nbPers - 5) * t.par_personne_sup[cle];
}

export function categorieMPR(rfr: number, nbPers: number, idf: boolean): CategorieMPR {
  for (const c of ["bleu", "jaune", "violet"] as const) if (rfr <= plafondMPR(c, nbPers, idf)) return c;
  return "rose";
}

export const estIleDeFrance = (s: Situation) => {
  const c = s.logement.commune;
  const dep = c?.codeDepartement ?? (c?.codeInsee ? departementDe(c.codeInsee) : undefined);
  return dep ? MPR.departements_idf.valeur.includes(dep) : false;
};

export const regleMaPrimeRenov = (s: Situation): ResultatAide => {
  const valeurs = [MPR.plafonds_hors_idf, MPR.plafonds_idf, MPR.exemple_pac_air_eau, MPR.renovation_ampleur_taux];
  const base = {
    id: "maprimerenov",
    nom: "MaPrimeRénov'",
    organisme: "Anah (France Rénov')",
    lien: "https://france-renov.gouv.fr/aides/maprimerenov",
    periodicite: "annuel" as const,
    valeurs,
    montantEstime: null,
  };
  if (s.logement.statut !== "proprietaire") {
    return resultat({
      ...base,
      eligible: false,
      confiance: "probable",
      explication: "MaPrimeRénov' finance des travaux de rénovation énergétique pour les propriétaires (occupants ou bailleurs). En tant que locataire ou hébergé, vous n'êtes pas concerné, mais votre propriétaire peut l'être.",
    });
  }
  const nb = nbPersonnes(s);
  const idf = estIleDeFrance(s);
  const { montant: rfr, estime } = revenuFiscal(s);
  const cat = categorieMPR(rfr, nb, idf);
  const pres = cat !== "bleu" && presDuSeuil(rfr, plafondMPR(cat === "rose" ? "violet" : cat === "violet" ? "jaune" : "bleu", nb, idf), 0.05);
  const exemple = cat === "rose" ? 0 : MPR.exemple_pac_air_eau.valeur[CLE[cat]];
  const taux = Math.round(MPR.renovation_ampleur_taux.valeur[cat === "rose" ? "superieurs" : CLE[cat]] * 100);
  return resultat({
    ...base,
    eligible: true,
    confiance: estime || pres ? "possible" : "probable",
    questions: estime ? ["rfr"] : [],
    explication:
      cat === "rose"
        ? `Votre ménage serait en catégorie ${NOMS[cat]} : seule la rénovation d'ampleur est aidée, à hauteur de ${taux} % des travaux. Passez par un conseiller France Rénov' (gratuit) avant de signer un devis.`
        : `Votre ménage serait en catégorie ${NOMS[cat]}${idf ? " (barème Île-de-France)" : ""}. Exemple : ${euros(exemple)} pour une pompe à chaleur air/eau, ou ${taux} % d'une rénovation d'ampleur ; un conseiller France Rénov' vous aide gratuitement.`,
  });
};

// ---------- Frais bancaires (clientèle fragile) ----------

export const regleFraisBancaires = (s: Situation): ResultatAide => {
  const valeurs = [FB.plafond_frais_incidents_fragiles_mensuel, FB.offre_specifique_cout_max_mensuel, FB.seuil_revenu_indicatif_pct_smic, baremes.smic.mensuel_brut];
  const base = {
    id: "frais-bancaires",
    nom: "Plafonnement des frais bancaires (clientèle fragile)",
    organisme: "Votre banque",
    lien: "https://www.mesquestionsdargent.fr",
    periodicite: "mensuel" as const,
    valeurs,
    montantEstime: null,
  };
  const faiblesRessources =
    revenusMensuelsFoyer(s) <= n(baremes.smic.mensuel_brut) * n(FB.seuil_revenu_indicatif_pct_smic) || calculerRSA(s).montant > 0;
  const incidents = s.complements.incidentsBancaires;
  const plafond = euros(n(FB.plafond_frais_incidents_fragiles_mensuel));
  const offre = euros(n(FB.offre_specifique_cout_max_mensuel));
  if (incidents === null) {
    return resultat({
      ...base,
      eligible: faiblesRessources,
      confiance: faiblesRessources ? "a_verifier" : "possible",
      questions: ["incidentsBancaires"],
      explication: faiblesRessources
        ? `Si vous avez des incidents de paiement répétés, votre banque doit plafonner vos frais d'incidents (${plafond} par mois au plus) et vous proposer une offre à ${offre} par mois maximum. Dites-nous si c'est votre cas.`
        : `Ce dispositif protège les personnes en fragilité financière (incidents répétés, faibles ressources) : frais d'incidents plafonnés à ${plafond} par mois. Il ne semble pas vous concerner.`,
    });
  }
  const eligible = incidents && faiblesRessources;
  return resultat({
    ...base,
    eligible,
    confiance: eligible ? "possible" : incidents ? "possible" : "probable",
    questions: [],
    explication: eligible
      ? `Votre banque doit vous reconnaître en situation de fragilité financière : vos frais d'incidents sont alors plafonnés à ${plafond} par mois et vous pouvez demander l'« offre spécifique » (${offre} par mois au plus). Faites la demande par écrit à votre conseiller.`
      : incidents
        ? `Chaque banque fixe ses critères de fragilité financière. Avec des incidents répétés, demandez-lui si vous pouvez bénéficier du plafonnement des frais (${plafond} par mois).`
        : "Sans incidents de paiement répétés, vous n'êtes en principe pas concerné par ce dispositif. Il existe aussi un droit au compte gratuit auprès de la Banque de France si une banque vous refuse un compte.",
  });
};
