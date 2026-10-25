// Impôt sur le revenu du foyer : quotient familial (plafonné), barème progressif, décote,
// contribution exceptionnelle sur les hauts revenus (CEHR), taux de prélèvement à la source estimé.
import { TAUX, appliquerBareme, tauxGrille, type Taux2026 } from "./taux";

export interface Foyer {
  situation: "seul" | "couple";
  enfants: number;
  /** Personne seule qui élève seule ses enfants (case T). */
  parentIsole: boolean;
}

export function nombreDeParts(f: Foyer): number {
  const base = f.situation === "couple" ? 2 : 1;
  const n = Math.max(0, Math.floor(f.enfants));
  const enfants = Math.min(n, 2) * 0.5 + Math.max(n - 2, 0);
  const majoration = f.situation === "seul" && f.parentIsole && n > 0 ? 0.5 : 0;
  return base + enfants + majoration;
}

/** Déduction forfaitaire de 10 % sur un salaire net imposable (bornée, et jamais supérieure au salaire). */
export function abattement10(netImposable: number, t: Taux2026 = TAUX): number {
  if (netImposable <= 0) return 0;
  const i = t.impot;
  const brut = netImposable * i.abattement_10_pourcent_taux.valeur;
  const borne = Math.min(Math.max(brut, i.abattement_10_pourcent_min.valeur), i.abattement_10_pourcent_max.valeur);
  return Math.min(borne, netImposable);
}

export interface ResultatIR {
  parts: number;
  revenuImposable: number;
  impotAvantPlafonnement: number;
  avantagePlafonne: number;
  impotBrut: number;
  decote: number;
  cehr: number;
  /** Impôt sur le revenu dû par le foyer (hors prélèvements sur dividendes au PFU). */
  impot: number;
  tauxMoyen: number;
}

/**
 * @param revenuImposable revenu net imposable du foyer, après abattements (10 %, frais réels, micro)
 * @param rfrEnPlus montants ajoutés au revenu fiscal de référence pour la CEHR (ex. dividendes au PFU)
 */
export function calculerIR(revenuImposable: number, f: Foyer, rfrEnPlus = 0, t: Taux2026 = TAUX): ResultatIR {
  const i = t.impot;
  const r = Math.max(revenuImposable, 0);
  const parts = nombreDeParts(f);
  const partsBase = f.situation === "couple" ? 2 : 1;
  const bareme = i.bareme.valeur;
  const impotAvecParts = appliquerBareme(r / parts, bareme) * parts;
  const impotSansEnfants = appliquerBareme(r / partsBase, bareme) * partsBase;

  // Plafonnement du quotient familial (art. 197 CGI).
  const majorationParentIsole = f.situation === "seul" && f.parentIsole && f.enfants > 0 ? 0.5 : 0;
  const demiPartsGenerales = (parts - partsBase - 2 * majorationParentIsole) * 2;
  const plafond =
    Math.max(demiPartsGenerales, 0) * i.plafond_quotient_familial_demi_part.valeur +
    (majorationParentIsole > 0 ? i.plafond_quotient_familial_parent_isole.valeur : 0);
  const avantage = impotSansEnfants - impotAvecParts;
  const impotBrut = avantage > plafond ? impotSansEnfants - plafond : impotAvecParts;

  // Décote.
  const seuil = f.situation === "couple" ? i.decote_seuil_couple.valeur : i.decote_seuil_personne_seule.valeur;
  const decote = Math.min(Math.max(seuil - i.decote_taux.valeur * impotBrut, 0), impotBrut);

  // CEHR (sur le revenu fiscal de référence, approché ici par le revenu imposable + rfrEnPlus).
  const cehrBareme = f.situation === "couple" ? i.cehr_couple.valeur : i.cehr_personne_seule.valeur;
  const cehr = appliquerBareme(r + Math.max(rfrEnPlus, 0), cehrBareme);

  const impot = Math.max(impotBrut - decote, 0) + cehr;
  return {
    parts,
    revenuImposable: r,
    impotAvantPlafonnement: impotAvecParts,
    avantagePlafonne: Math.max(avantage - plafond, 0),
    impotBrut,
    decote,
    cehr,
    impot,
    tauxMoyen: r > 0 ? impot / r : 0,
  };
}

/** Taux neutre (non personnalisé) du prélèvement à la source, selon le net imposable mensuel. */
export function tauxNeutre(netImposableMensuel: number, t: Taux2026 = TAUX): number {
  return tauxGrille(netImposableMensuel, t.impot.taux_neutre_grille.valeur);
}
