// Moteur brut → net pour les salariés (non-cadre, cadre), les salariés portés et les présidents de SASU
// (assimilés salariés). Calcul annualisé : les tranches s'appliquent au PASS annuel.
import { TAUX, type Taux2026 } from "./taux";

export interface Ligne {
  libelle: string;
  base: number;
  taux: number | null;
  montant: number;
}

export interface OptionsSalarie {
  cadre: boolean;
  /** Président de SASU : pas d'assurance chômage, pas d'AGS ni d'APEC. */
  assimileSalarie?: boolean;
  /** Cotisation mutuelle totale (salarié + employeur), en €/mois. */
  mutuelleMensuelle: number;
  /** Part payée par l'employeur, entre 0 et 1. */
  mutuellePartEmployeur: number;
  /** Participation / intéressement versés dans l'année (€ bruts). */
  participationAnnuelle?: number;
  /** Placée sur un plan d'épargne salariale : exonérée d'impôt sur le revenu. */
  participationPEE?: boolean;
  /** Taux AT/MP employeur (défaut : taux « fonctions support » du fichier de données). */
  tauxATMP?: number;
  /** Entreprise de moins de 11 salariés (taux de formation professionnelle réduit). */
  moinsDe11Salaries?: boolean;
}

export interface ResultatSalarie {
  brutAnnuel: number;
  lignesSalarie: Ligne[];
  cotisationsSalarie: number;
  /** Net versé sur le compte, participation nette comprise, avant prélèvement à la source. */
  netAvantImpot: number;
  /** Net imposable (avant abattement de 10 %). */
  netImposable: number;
  lignesEmployeur: Ligne[];
  cotisationsEmployeur: number;
  coutEmployeur: number;
  participationNette: number;
}

const tranche1 = (brut: number, pass: number) => Math.min(Math.max(brut, 0), pass);
const tranche2 = (brut: number, pass: number) => Math.min(Math.max(brut - pass, 0), 7 * pass);

function ligne(libelle: string, base: number, taux: number): Ligne {
  return { libelle, base, taux, montant: base * taux };
}

export function cotisationsSalariales(brut: number, o: OptionsSalarie, t: Taux2026 = TAUX) {
  const s = t.salarie;
  const pass = t.general.pass_annuel.valeur;
  const t1 = tranche1(brut, pass);
  const t2 = tranche2(brut, pass);
  const mutuelleAn = Math.max(o.mutuelleMensuelle, 0) * 12;
  const mutuelleSalarie = mutuelleAn * (1 - o.mutuellePartEmployeur);
  const mutuelleEmployeur = mutuelleAn * o.mutuellePartEmployeur;
  const prevoyanceCadreEmployeur = o.cadre ? t1 * t.employeur.prevoyance_cadre.valeur : 0;

  const lignes: Ligne[] = [
    ligne("Assurance vieillesse plafonnée", t1, s.vieillesse_plafonnee.valeur),
    ligne("Assurance vieillesse déplafonnée", brut, s.vieillesse_deplafonnee.valeur),
    ligne("Retraite complémentaire Agirc-Arrco T1", t1, s.retraite_complementaire_t1.valeur),
    ligne("Retraite complémentaire Agirc-Arrco T2", t2, s.retraite_complementaire_t2.valeur),
    ligne("Contribution d'équilibre général T1", t1, s.ceg_t1.valeur),
    ligne("Contribution d'équilibre général T2", t2, s.ceg_t2.valeur),
  ];
  if (brut > pass) lignes.push(ligne("Contribution d'équilibre technique", Math.min(brut, 8 * pass), s.cet.valeur));
  if (o.cadre && !o.assimileSalarie) lignes.push(ligne("APEC", Math.min(brut, 4 * pass), s.apec.valeur));
  if (mutuelleSalarie > 0)
    lignes.push({ libelle: "Mutuelle (part salariée)", base: mutuelleAn, taux: null, montant: mutuelleSalarie });

  // Assiette CSG/CRDS : 98,25 % du brut jusqu'à 4 PASS, 100 % au-delà, + prévoyance et mutuelle patronales.
  const limite = s.assiette_csg_limite_pass.valeur * pass;
  const assietteCsg =
    Math.min(brut, limite) * s.assiette_csg_part_retenue.valeur +
    Math.max(brut - limite, 0) +
    mutuelleEmployeur +
    prevoyanceCadreEmployeur;
  const csgDed = assietteCsg * s.csg_deductible.valeur;
  const csgNonDed = assietteCsg * s.csg_non_deductible.valeur;
  const crds = assietteCsg * s.crds.valeur;
  lignes.push(
    { libelle: "CSG déductible", base: assietteCsg, taux: s.csg_deductible.valeur, montant: csgDed },
    { libelle: "CSG non déductible", base: assietteCsg, taux: s.csg_non_deductible.valeur, montant: csgNonDed },
    { libelle: "CRDS", base: assietteCsg, taux: s.crds.valeur, montant: crds },
  );
  const total = lignes.reduce((a, l) => a + l.montant, 0);
  return { lignes, total, csgNonDed, crds, mutuelleEmployeur, prevoyanceCadreEmployeur };
}

export function cotisationsPatronales(brut: number, o: OptionsSalarie, t: Taux2026 = TAUX) {
  const e = t.employeur;
  const pass = t.general.pass_annuel.valeur;
  const t1 = tranche1(brut, pass);
  const t2 = tranche2(brut, pass);
  const mutuelleEmployeur = Math.max(o.mutuelleMensuelle, 0) * 12 * o.mutuellePartEmployeur;
  const lignes: Ligne[] = [
    ligne("Maladie, maternité, invalidité, décès", brut, e.maladie.valeur),
    ligne("Vieillesse plafonnée", t1, e.vieillesse_plafonnee.valeur),
    ligne("Vieillesse déplafonnée", brut, e.vieillesse_deplafonnee.valeur),
    ligne("Allocations familiales", brut, e.allocations_familiales.valeur),
    ligne("Accidents du travail", brut, o.tauxATMP ?? e.atmp.valeur),
    ligne("FNAL", t1, e.fnal.valeur),
    ligne("Contribution solidarité autonomie", brut, e.csa.valeur),
    ligne("Retraite complémentaire T1", t1, e.retraite_complementaire_t1.valeur),
    ligne("Retraite complémentaire T2", t2, e.retraite_complementaire_t2.valeur),
    ligne("CEG T1", t1, e.ceg_t1.valeur),
    ligne("CEG T2", t2, e.ceg_t2.valeur),
    ligne(
      "Formation professionnelle",
      brut,
      o.moinsDe11Salaries ? e.formation_professionnelle_moins_11.valeur : e.formation_professionnelle.valeur,
    ),
    ligne("Taxe d'apprentissage", brut, e.taxe_apprentissage.valeur),
    ligne("Dialogue social", brut, e.dialogue_social.valeur),
  ];
  if (brut > pass) lignes.push(ligne("CET", Math.min(brut, 8 * pass), e.cet.valeur));
  if (!o.assimileSalarie) {
    lignes.push(ligne("Assurance chômage", Math.min(brut, 4 * pass), e.chomage.valeur));
    lignes.push(ligne("AGS", Math.min(brut, 4 * pass), e.ags.valeur));
    if (o.cadre) lignes.push(ligne("APEC", Math.min(brut, 4 * pass), e.apec.valeur));
  }
  if (o.cadre) lignes.push(ligne("Prévoyance cadre", t1, e.prevoyance_cadre.valeur));
  if (mutuelleEmployeur > 0)
    lignes.push({ libelle: "Mutuelle (part employeur)", base: mutuelleEmployeur, taux: null, montant: mutuelleEmployeur });
  const total = lignes.reduce((a, l) => a + l.montant, 0);
  return { lignes, total };
}

/** Brut annuel → net annuel. */
export function brutVersNet(brutAnnuel: number, o: OptionsSalarie, t: Taux2026 = TAUX): ResultatSalarie {
  const brut = Math.max(brutAnnuel, 0);
  const sal = cotisationsSalariales(brut, o, t);
  const pat = cotisationsPatronales(brut, o, t);
  const participation = Math.max(o.participationAnnuelle ?? 0, 0);
  const csgParticipation = participation * t.salarie.csg_crds_epargne_salariale.valeur;
  const participationNette = participation - csgParticipation;
  const netSalaire = brut - sal.total;
  // Imposable : on réintègre la CSG non déductible, la CRDS et la mutuelle payée par l'employeur.
  let netImposable = netSalaire + sal.csgNonDed + sal.crds + sal.mutuelleEmployeur;
  if (participation > 0 && !o.participationPEE) {
    // Participation non placée : imposable (hors CSG déductible).
    netImposable += participation - participation * t.salarie.csg_deductible.valeur;
  }
  const lignesSalarie = [...sal.lignes];
  if (participation > 0)
    lignesSalarie.push({
      libelle: "CSG-CRDS sur participation / intéressement",
      base: participation,
      taux: t.salarie.csg_crds_epargne_salariale.valeur,
      montant: csgParticipation,
    });
  return {
    brutAnnuel: brut,
    lignesSalarie,
    cotisationsSalarie: sal.total + csgParticipation,
    netAvantImpot: netSalaire + participationNette,
    netImposable,
    lignesEmployeur: pat.lignes,
    cotisationsEmployeur: pat.total,
    coutEmployeur: brut + pat.total + participation,
    participationNette,
  };
}

/** Coût employeur total → brut (inversion par dichotomie ; le coût est croissant avec le brut). */
export function brutDepuisCoutEmployeur(cout: number, o: OptionsSalarie, t: Taux2026 = TAUX): number {
  if (cout <= 0) return 0;
  const sansParticipation = { ...o, participationAnnuelle: 0 };
  const coutDe = (b: number) => b + cotisationsPatronales(b, sansParticipation, t).total;
  // La mutuelle employeur est un coût fixe : si elle dépasse l'enveloppe, aucun salaire possible.
  if (coutDe(0) >= cout) return 0;
  let bas = 0;
  let haut = cout;
  for (let i = 0; i < 60; i++) {
    const milieu = (bas + haut) / 2;
    if (coutDe(milieu) > cout) haut = milieu;
    else bas = milieu;
  }
  return bas;
}
