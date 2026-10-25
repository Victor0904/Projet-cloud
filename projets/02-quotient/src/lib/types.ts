// Types des grilles tarifaires (`data/grilles/<code-insee>.json`).

export const CLES_PRESTATIONS = [
  "cantine",
  "garderie_matin",
  "garderie_soir",
  "alsh_journee",
  "alsh_demi_journee",
  "creche",
] as const;

export type ClePrestation = (typeof CLES_PRESTATIONS)[number];

/** Prestations scolaires et de loisirs (la crèche est traitée à part, par le barème PSU). */
export const CLES_PERISCOLAIRES = CLES_PRESTATIONS.filter((c) => c !== "creche") as Exclude<ClePrestation, "creche">[];
export type ClePeriscolaire = (typeof CLES_PERISCOLAIRES)[number];

/**
 * Unité de facturation :
 * - repas / seance / heure : à chaque jour d'école utilisé ;
 * - jour / demi_journee : à l'unité, nombre saisi pour l'année ;
 * - mois : forfait mensuel, dû dès qu'on utilise la prestation ;
 * - an : forfait annuel, dû dès qu'on utilise la prestation ;
 * - psu : barème national des crèches.
 */
export type Unite = "repas" | "seance" | "heure" | "jour" | "demi_journee" | "mois" | "an" | "psu";

/** Ce sur quoi la commune calcule ses tranches. */
export type BaseCalcul = "qf_caf" | "qf_fiscal" | "qf_municipal" | "revenus_mensuels";

/** Tarif = somme des coef[i] x (valeur - x0)^i. */
export type Formule = { x0: number; coef: number[] };

/**
 * Une tranche couvre les valeurs strictement supérieures à `de` et inférieures ou égales à `a`
 * (la première tranche commence à 0 inclus ; `a: null` = sans limite haute).
 * Exactement une façon de donner le tarif :
 */
export type Tranche = {
  de: number;
  a: number | null;
  tarif?: number;
  /** Tarif selon le nombre d'enfants du foyer : [1 enfant, 2 enfants, 3 et plus]. */
  tarifs_par_nb_enfants?: number[];
  formule?: Formule;
  /** Tarif proportionnel entre le minimum (à `de`) et le maximum (à `a`). */
  interpolation?: [number, number];
  /** Seule une fourchette est connue : le résultat sera un intervalle. */
  fourchette?: [number, number];
};

export type ReductionFratrie = { a_partir_du_rang: number; taux: number };

export type StatutPrestation = "ok" | "fourchette" | "A_VERIFIER";

export type Prestation = {
  libelle: string;
  unite: Unite;
  statut: StatutPrestation;
  tranches: Tranche[];
  source?: string;
  verifie_le?: string;
  note?: string;
  /** Plancher et plafond appliqués au résultat de la formule. */
  bornes?: { min?: number; max?: number };
  reductions_fratrie?: ReductionFratrie[];
  /** Prestations couvertes par celle-ci (ex. forfait « matin + soir »). */
  inclut?: ClePrestation[];
};

export type Grille = {
  code_insee: string;
  commune: string;
  departement: string;
  periode: string;
  source: string;
  verifie_le: string;
  base_calcul: BaseCalcul;
  base_calcul_note: string;
  notes: string[];
  a_verifier: string[];
  prestations: Record<ClePrestation, Prestation>;
};

/** Montant connu exactement (min = max) ou seulement par une fourchette. */
export type Intervalle = { min: number; max: number };
