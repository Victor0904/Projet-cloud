// Accès typé aux taux 2026 (data/taux-2026.json). Aucun chiffre réglementaire n'est codé en dur ailleurs.
import donnees from "../../data/taux-2026.json";

export type Statut = "VERIFIE" | "A_VERIFIER";

export interface Valeur<T = number> {
  valeur: T;
  unite: string;
  note?: string;
  source: string;
  verifie_le: string;
  statut: Statut;
}

export interface Tranche {
  jusqua: number | null;
  taux: number;
}

export interface BaremeKmLigne {
  cv: number;
  jusqua5000: [number, number];
  jusqua20000: [number, number];
  audela: [number, number];
}

type Groupe = Record<string, Valeur>;

export interface Taux2026 {
  meta: { titre: string; annee: number; verifie_le: string; methode: string };
  general: {
    pass_annuel: Valeur;
    smic_horaire: Valeur;
    heures_mensuelles_35h: Valeur;
    heures_smic_par_trimestre_retraite: Valeur;
  };
  salarie: {
    vieillesse_plafonnee: Valeur;
    vieillesse_deplafonnee: Valeur;
    retraite_complementaire_t1: Valeur;
    retraite_complementaire_t2: Valeur;
    ceg_t1: Valeur;
    ceg_t2: Valeur;
    cet: Valeur;
    apec: Valeur;
    csg_deductible: Valeur;
    csg_non_deductible: Valeur;
    crds: Valeur;
    assiette_csg_part_retenue: Valeur;
    assiette_csg_limite_pass: Valeur;
    csg_crds_epargne_salariale: Valeur;
  };
  employeur: {
    maladie: Valeur;
    vieillesse_plafonnee: Valeur;
    vieillesse_deplafonnee: Valeur;
    allocations_familiales: Valeur;
    atmp: Valeur;
    fnal: Valeur;
    csa: Valeur;
    chomage: Valeur;
    ags: Valeur;
    retraite_complementaire_t1: Valeur;
    retraite_complementaire_t2: Valeur;
    ceg_t1: Valeur;
    ceg_t2: Valeur;
    cet: Valeur;
    apec: Valeur;
    prevoyance_cadre: Valeur;
    formation_professionnelle: Valeur;
    formation_professionnelle_moins_11: Valeur;
    taxe_apprentissage: Valeur;
    dialogue_social: Valeur;
  };
  avantages: {
    titre_restaurant_exoneration_max: Valeur;
    titre_restaurant_part_employeur_min: Valeur;
    titre_restaurant_part_employeur_max: Valeur;
    transport_prise_en_charge_obligatoire: Valeur;
    mutuelle_part_employeur_min: Valeur;
    teletravail_allocation_exoneree_mois: Valeur;
  };
  impot: {
    bareme: Valeur<Tranche[]>;
    decote_seuil_personne_seule: Valeur;
    decote_seuil_couple: Valeur;
    decote_taux: Valeur;
    plafond_quotient_familial_demi_part: Valeur;
    plafond_quotient_familial_parent_isole: Valeur;
    abattement_10_pourcent_taux: Valeur;
    abattement_10_pourcent_min: Valeur;
    abattement_10_pourcent_max: Valeur;
    frais_reels_distance_max_km: Valeur;
    cehr_personne_seule: Valeur<Tranche[]>;
    cehr_couple: Valeur<Tranche[]>;
    pfu_impot: Valeur;
    prelevements_sociaux_capital: Valeur;
    taux_neutre_grille: Valeur<Tranche[]>;
  };
  bareme_kilometrique: {
    voiture: Valeur<BaremeKmLigne[]>;
    majoration_electrique: Valeur;
  };
  micro: {
    taux_cotisations_bnc: Valeur;
    taux_cotisations_bic_services: Valeur;
    cfp_bnc: Valeur;
    cfp_bic: Valeur;
    abattement_bnc: Valeur;
    abattement_bic_services: Valeur;
    abattement_minimum: Valeur;
    versement_liberatoire_bnc: Valeur;
    versement_liberatoire_bic_services: Valeur;
    versement_liberatoire_plafond_rfr_par_part: Valeur;
    acre_coefficient: Valeur;
    seuil_ca_services: Valeur;
    seuil_ca_ventes: Valeur;
    tva_franchise_services: Valeur;
    tva_franchise_services_majore: Valeur;
    tva_franchise_ventes: Valeur;
    tva_franchise_ventes_majore: Valeur;
    tva_taux_normal: Valeur;
  };
  societe: {
    is_taux_reduit: Valeur;
    is_plafond_taux_reduit: Valeur;
    is_taux_normal: Valeur;
    tns_taux_global_sur_remuneration: Valeur;
    tns_ratio_imposable_sur_net: Valeur;
    tns_seuil_dividendes_capital: Valeur;
    tns_taux_sur_dividendes_excedentaires: Valeur;
  };
  portage: {
    frais_gestion_defaut: Valeur;
    salaire_minimum_part_pass: Valeur;
  };
}

export const TAUX = donnees as unknown as Taux2026;

/** Toutes les valeurs à plat, pour l'affichage des sources et la liste des A_VERIFIER. */
export function toutesLesValeurs(t: Taux2026 = TAUX): { cle: string; v: Valeur<unknown> }[] {
  const res: { cle: string; v: Valeur<unknown> }[] = [];
  for (const [groupe, contenu] of Object.entries(t)) {
    if (groupe === "meta") continue;
    for (const [cle, v] of Object.entries(contenu as Groupe)) res.push({ cle: `${groupe}.${cle}`, v });
  }
  return res;
}

/** Applique un barème progressif par tranches (taux marginaux). */
export function appliquerBareme(assiette: number, tranches: Tranche[]): number {
  let total = 0;
  let bas = 0;
  for (const t of tranches) {
    const haut = t.jusqua ?? Infinity;
    if (assiette > bas) total += (Math.min(assiette, haut) - bas) * t.taux;
    bas = haut;
  }
  return total;
}

/** Grille à taux unique (taux neutre du prélèvement à la source) : renvoie le taux de la tranche. */
export function tauxGrille(assiette: number, tranches: Tranche[]): number {
  for (const t of tranches) if (t.jusqua === null || assiette <= t.jusqua) return t.taux;
  return tranches[tranches.length - 1].taux;
}
