// Comparaison du loyer payé au plafond légal, complément de loyer, trop-perçu récupérable.
import type { Reference } from "./reference";

const centimes = (n: number) => Math.round(n * 100) / 100;

export type Bail = {
  /** Loyer mensuel hors charges, complément de loyer inclus s'il y en a un. */
  loyerHorsCharges: number;
  /** Partie du loyer présentée comme « complément de loyer » dans le bail (0 sinon). */
  complement: number;
  /** Date de signature (ISO). */
  dateSignature: string;
};

export type Verdict = {
  surface: number;
  loyerBase: number;
  complement: number;
  /** Plafonds mensuels pour ce logement (€/mois hors charges). */
  loyerReference: number;
  plafond: number;
  plancher: number;
  /** Loyer de base au m². */
  loyerBaseM2: number;
  /** Dépassement du loyer de base sur le plafond (≥ 0). */
  depassementMensuel: number;
  depassementAnnuel: number;
  conforme: boolean;
  /** Le loyer de base est sous le loyer minoré (le bailleur peut demander une hausse au renouvellement). */
  sousMinore: boolean;
};

export function evaluer(ref: Reference, surface: number, bail: Bail): Verdict {
  const complement = Math.max(0, bail.complement || 0);
  const loyerBase = centimes(bail.loyerHorsCharges - complement);
  const plafond = centimes(ref.majore * surface);
  const depassementMensuel = centimes(Math.max(0, loyerBase - plafond));
  return {
    surface,
    loyerBase,
    complement,
    loyerReference: centimes(ref.ref * surface),
    plafond,
    plancher: centimes(ref.minore * surface),
    loyerBaseM2: centimes(loyerBase / surface),
    depassementMensuel,
    depassementAnnuel: centimes(depassementMensuel * 12),
    conforme: depassementMensuel === 0,
    sousMinore: loyerBase < ref.minore * surface,
  };
}

export type AnalyseComplement = {
  present: boolean;
  /** true si le complément est contestable d'après les réponses (au moins une raison). */
  contestable: boolean;
  raisons: string[];
  /** Date limite de saisine de la commission (ISO), 3 mois après la signature. */
  dateLimite: string;
  delaiDepasse: boolean;
};

/** Ajoute n mois à une date ISO (le 31 janvier + 1 mois → 28/29 février). */
export function ajouterMois(iso: string, n: number): string {
  const [a, m, j] = iso.split("-").map(Number);
  const cible = new Date(Date.UTC(a, m - 1 + n, 1));
  const dernierJour = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(j, dernierJour));
  return cible.toISOString().slice(0, 10);
}

export function analyserComplement(
  v: Verdict,
  dateSignature: string,
  aujourdhui: string,
  caracteristiquesInterdites: string[],
  delaiMois: number,
): AnalyseComplement {
  const dateLimite = ajouterMois(dateSignature, delaiMois);
  const raisons: string[] = [];
  if (v.complement > 0) {
    if (v.loyerBase < v.plafond) {
      raisons.push(
        "Le loyer de base est inférieur au plafond : un complément ne peut s'ajouter qu'à un loyer de base égal au loyer de référence majoré.",
      );
    }
    for (const c of caracteristiquesInterdites) raisons.push(`Complément interdit car ${c}.`);
  }
  return {
    present: v.complement > 0,
    contestable: raisons.length > 0,
    raisons,
    dateLimite,
    delaiDepasse: aujourdhui > dateLimite,
  };
}

/** Nombre de mois entiers écoulés entre deux dates ISO. */
export function moisEcoules(debut: string, fin: string): number {
  const [a1, m1, j1] = debut.split("-").map(Number);
  const [a2, m2, j2] = fin.split("-").map(Number);
  const n = (a2 - a1) * 12 + (m2 - m1) - (j2 < j1 ? 1 : 0);
  return Math.max(0, n);
}

export type TropPercu = { mois: number; depuis: string; montant: number; limiteParPrescription: boolean };

/**
 * Trop-perçu récupérable : dépassement mensuel × mois payés depuis la signature,
 * dans la limite de la prescription (3 ans).
 */
export function tropPercu(
  montantMensuel: number,
  dateSignature: string,
  aujourdhui: string,
  prescriptionAns: number,
): TropPercu {
  const limite = ajouterMois(aujourdhui, -12 * prescriptionAns);
  const depuis = dateSignature > limite ? dateSignature : limite;
  const mois = moisEcoules(depuis, aujourdhui);
  return { mois, depuis, montant: centimes(montantMensuel * mois), limiteParPrescription: depuis !== dateSignature };
}
