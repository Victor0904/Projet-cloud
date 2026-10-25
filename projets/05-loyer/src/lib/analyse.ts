// Assemble toute l'analyse d'un bail en zone encadrée, à partir de données déjà chargées (fonction pure).
import regles from "../../data/regles.json";
import { choisirMillesime, trouverReference, zoneDuSecteur, type Reference } from "./reference";
import type { Logement, Millesime, Ville } from "./types";
import { analyserComplement, evaluer, tropPercu, type AnalyseComplement, type Bail, type TropPercu, type Verdict } from "./verdict";

export const REGLES = regles;

export type Analyse = {
  ville: Ville;
  millesime: Millesime;
  secteur: string;
  zone: string;
  reference: Reference;
  verdict: Verdict;
  complement: AnalyseComplement;
  /** Montant mensuel contestable : dépassement + complément contestable. */
  contestableMensuel: number;
  tropPercu: TropPercu;
  /** Il y a quelque chose à réclamer au bailleur. */
  action: boolean;
  avertissements: string[];
};

export type EntreeAnalyse = {
  ville: Ville;
  millesimes: Millesime[];
  secteur: string;
  logement: Logement;
  bail: Bail;
  aujourdhui: string;
  /** Libellés (tirés de regles.json) des caractéristiques qui interdisent un complément, cochées par l'utilisateur. */
  interdictions: string[];
};

export function analyser(e: EntreeAnalyse): Analyse | null {
  const periodes = Object.fromEntries(e.millesimes.map((m) => [m.millesime, [m.debut, m.fin] as [string, string]]));
  const choix = choisirMillesime(periodes, e.bail.dateSignature);
  const millesime = e.millesimes.find((m) => m.millesime === choix.id)!;
  const zone = zoneDuSecteur(millesime, e.secteur);
  const reference = trouverReference(millesime, zone, e.logement);
  if (!reference) return null;

  const avertissements: string[] = [];
  if (choix.remarque) avertissements.push(choix.remarque);
  if (e.bail.dateSignature < e.ville.entree_vigueur) {
    avertissements.push(
      `Votre bail a été signé avant l'entrée en vigueur de l'encadrement (${e.ville.entree_vigueur.split("-").reverse().join("/")}) : ` +
        "le plafond ne s'applique qu'aux baux signés ou renouvelés après cette date. Le résultat est donné à titre indicatif.",
    );
  }
  if (e.bail.dateSignature > REGLES.fin_experimentation.date) {
    avertissements.push(
      "Votre bail est signé après la date de fin prévue de l'expérimentation : vérifiez qu'elle a bien été prolongée.",
    );
  }
  if (millesime.statut === "A_VERIFIER" && millesime.note) avertissements.push(millesime.note);

  const verdict = evaluer(reference, e.logement.surface, e.bail);
  const complement = analyserComplement(
    verdict,
    e.bail.dateSignature,
    e.aujourdhui,
    e.interdictions,
    REGLES.complement.delai_contestation_mois,
  );
  const contestableMensuel =
    Math.round((verdict.depassementMensuel + (complement.contestable ? verdict.complement : 0)) * 100) / 100;
  const tp = tropPercu(contestableMensuel, e.bail.dateSignature, e.aujourdhui, REGLES.depassement.prescription_ans);

  return {
    ville: e.ville,
    millesime,
    secteur: e.secteur,
    zone,
    reference,
    verdict,
    complement,
    contestableMensuel,
    tropPercu: tp,
    action: contestableMensuel > 0,
    avertissements: [...reference.remarques, ...avertissements],
  };
}
