// Assemblage d'un scénario complet : rémunération → net → impôt du foyer → frais pro → temps.
import hypothesesJson from "../../data/hypotheses-par-defaut.json";
import { TAUX, type Taux2026, type Valeur } from "./taux";
import { brutVersNet, type Ligne } from "./salarie";
import { calculerMicro, type ResultatMicro } from "./micro";
import { calculerSociete, meilleurArbitrage, type FormeSociete, type ResultatSociete } from "./societe";
import { calculerPortage, type ResultatPortage } from "./portage";
import { abattement10, calculerIR, tauxNeutre, type Foyer, type ResultatIR } from "./impot";
import {
  avantageTitresRestaurant,
  coutTransport,
  deductionSalaires,
  joursSurSite,
  type ChoixDeduction,
  type TitresRestaurant,
  type Transport,
} from "./frais";

type Hyp = Record<string, Omit<Valeur, "statut"> & { statut: string }>;
/** Hypothèses par défaut des formulaires (data/hypotheses-par-defaut.json), sans le bloc meta. */
export const HYPOTHESES = Object.fromEntries(
  Object.entries(hypothesesJson).filter(([cle]) => cle !== "meta"),
) as unknown as Hyp;
const H = (cle: string): number => HYPOTHESES[cle].valeur;

export type TypeStatut = "salarie_non_cadre" | "salarie_cadre" | "micro_bnc" | "micro_bic" | "societe" | "portage";

export const LIBELLES_STATUT: Record<TypeStatut, string> = {
  salarie_non_cadre: "Salarié non-cadre",
  salarie_cadre: "Salarié cadre",
  micro_bnc: "Micro-entrepreneur (libéral, BNC)",
  micro_bic: "Micro-entrepreneur (prestations de services, BIC)",
  societe: "Société à l'IS (SASU ou EURL, simplifié)",
  portage: "Portage salarial",
};

export const estSalarie = (s: TypeStatut) => s === "salarie_cadre" || s === "salarie_non_cadre";
export const estIndependant = (s: TypeStatut) => !estSalarie(s);

export interface Scenario {
  nom: string;
  statut: TypeStatut;
  // Salarié
  brutAnnuel: number;
  surTreizeMois: boolean;
  variableAnnuel: number;
  participationAnnuelle: number;
  participationPEE: boolean;
  mutuelleMensuelle: number;
  mutuellePartEmployeur: number;
  partEmployeurTransport: number;
  primeTransportAnnuelle: number;
  ticketsResto: TitresRestaurant;
  indemniteTeletravailMensuelle: number;
  autresFraisAnnuels: number;
  deduction: ChoixDeduction;
  joursTravailles: number;
  // Indépendant
  tjm: number;
  joursFactures: number;
  joursNonFactures: number;
  acre: boolean;
  versementLiberatoire: boolean;
  clientsParticuliers: boolean;
  fraisActiviteAnnuels: number;
  mutuelleIndividuelleMensuelle: number;
  formeSociete: FormeSociete;
  arbitrageAuto: boolean;
  partRemuneration: number;
  partDistribuee: number;
  capitalSocial: number;
  fraisGestionPortage: number;
  // Commun
  heuresParJour: number;
  teletravailJoursSemaine: number;
  trajetMinutesAllerRetour: number;
  transport: Transport;
}

export interface Contexte {
  foyer: Foyer;
  /** Salaires nets imposables annuels du conjoint (avant abattement de 10 %). */
  revenusConjoint: number;
  /** Autres revenus nets imposables du foyer (déjà après abattements). */
  autresRevenus: number;
}

export function scenarioParDefaut(statut: TypeStatut, nom = "Offre"): Scenario {
  const independant = estIndependant(statut);
  return {
    nom,
    statut,
    brutAnnuel: H("brut_annuel_salarie"),
    surTreizeMois: false,
    variableAnnuel: 0,
    participationAnnuelle: 0,
    participationPEE: true,
    mutuelleMensuelle: H("mutuelle_entreprise_mensuelle"),
    mutuellePartEmployeur: H("mutuelle_part_employeur"),
    partEmployeurTransport: TAUX.avantages.transport_prise_en_charge_obligatoire.valeur,
    primeTransportAnnuelle: 0,
    ticketsResto: {
      actif: false,
      valeurFaciale: H("titre_restaurant_valeur"),
      partEmployeur: TAUX.avantages.titre_restaurant_part_employeur_min.valeur,
      nombreParMois: H("titres_restaurant_par_mois"),
    },
    indemniteTeletravailMensuelle: 0,
    autresFraisAnnuels: 0,
    deduction: "auto",
    joursTravailles: H("jours_travailles_salarie"),
    tjm: H("tjm_independant"),
    joursFactures: H("jours_factures_independant"),
    joursNonFactures: H("jours_non_factures_independant"),
    acre: false,
    versementLiberatoire: false,
    clientsParticuliers: false,
    fraisActiviteAnnuels: statut === "societe" ? H("frais_activite_societe") : independant ? H("frais_activite_micro") : 0,
    mutuelleIndividuelleMensuelle: H("mutuelle_individuelle_mensuelle"),
    formeSociete: "sasu",
    arbitrageAuto: true,
    partRemuneration: 0.5,
    partDistribuee: 1,
    capitalSocial: H("capital_social"),
    fraisGestionPortage: TAUX.portage.frais_gestion_defaut.valeur,
    heuresParJour: H("heures_par_jour"),
    teletravailJoursSemaine: 0,
    trajetMinutesAllerRetour: 0,
    transport: { mode: "aucun", abonnementMensuel: 0, kmAller: 0, chevauxFiscaux: 5, electrique: false },
  };
}

/** Exemple du cahier des charges : CDI cadre 48 k€ à Paris contre freelance 450 €/jour × 200 jours. */
export function exempleParis(): Scenario[] {
  const navigo = H("abonnement_navigo_mensuel");
  const trajet = H("trajet_minutes_aller_retour");
  const cdi: Scenario = {
    ...scenarioParDefaut("salarie_cadre", "CDI cadre 48 k€ à Paris"),
    brutAnnuel: 48000,
    teletravailJoursSemaine: 2,
    trajetMinutesAllerRetour: trajet,
    transport: { mode: "transports", abonnementMensuel: navigo, kmAller: 0, chevauxFiscaux: 5, electrique: false },
    ticketsResto: { ...scenarioParDefaut("salarie_cadre").ticketsResto, actif: true },
  };
  const freelance: Scenario = {
    ...scenarioParDefaut("micro_bnc", "Freelance 450 €/j × 200 j (micro)"),
    tjm: 450,
    joursFactures: 200,
    teletravailJoursSemaine: 3,
    trajetMinutesAllerRetour: trajet,
    transport: { mode: "transports", abonnementMensuel: navigo, kmAller: 0, chevauxFiscaux: 5, electrique: false },
  };
  const portage: Scenario = {
    ...scenarioParDefaut("portage", "Même mission en portage salarial"),
    tjm: 450,
    joursFactures: 200,
    teletravailJoursSemaine: 3,
    trajetMinutesAllerRetour: trajet,
    transport: freelance.transport,
  };
  return [cdi, freelance, portage];
}

export interface Montant {
  libelle: string;
  montant: number;
}

export interface Resultat {
  nom: string;
  statut: TypeStatut;
  libelleStatut: string;
  chiffreAffaires: number | null;
  brutAnnuel: number | null;
  cotisations: number;
  lignes: Ligne[];
  netAvantImpotAnnuel: number;
  netMensuel: number;
  /** Versement mensuel habituel pour un salaire sur 13 mois (hors 13e mois), sinon null. */
  netMensuelHorsTreizieme: number | null;
  netImposableAvantDeduction: number;
  deduction: { montant: number; mode: "forfait" | "reels" } | null;
  revenuImposableScenario: number;
  impotFoyer: ResultatIR;
  impotRevenu: number;
  versementLiberatoire: number;
  pfu: number;
  impotTotal: number;
  tauxPAS: number;
  prelevementMensuel: number;
  tauxNeutre: number | null;
  netApresImpotAnnuel: number;
  netApresImpotMensuel: number;
  avantages: Montant[];
  totalAvantages: number;
  frais: Montant[];
  totalFrais: number;
  resteAnnuel: number;
  resteMensuel: number;
  jours: number;
  joursSurSite: number;
  heuresTravail: number;
  heuresTrajet: number;
  horaireReel: number;
  horaireReste: number;
  micro?: ResultatMicro;
  societe?: ResultatSociete & { partRemuneration: number };
  portage?: ResultatPortage;
  hypotheses: string[];
  alertes: string[];
}

interface Revenus {
  chiffreAffaires: number | null;
  brut: number | null;
  cotisations: number;
  lignes: Ligne[];
  netAvantImpot: number;
  /** Revenus « salaires » (salarié, porté, dirigeant) nets imposables, avant 10 %. */
  salairesImposables: number;
  microImposable: number;
  microAbattuVL: number;
  vl: number;
  dividendesBruts: number;
  pfu: number;
  participationNette: number;
}

function impotDuFoyer(rev: Revenus, deductionScenario: number, ctx: Contexte, t: Taux2026) {
  const salairesApres = Math.max(rev.salairesImposables - deductionScenario, 0);
  const revScenario = salairesApres + rev.microImposable;
  const conjoint = Math.max(ctx.revenusConjoint, 0);
  const revConjoint = conjoint - abattement10(conjoint, t);
  const autres = Math.max(ctx.autresRevenus, 0);
  const total = revScenario + revConjoint + autres;
  let ir: ResultatIR;
  let irDu: number;
  if (rev.microAbattuVL > 0) {
    // Versement libératoire : le revenu micro n'est pas taxé au barème mais sert au calcul du taux (taux effectif).
    const avecMicro = total + rev.microAbattuVL;
    ir = calculerIR(avecMicro, ctx.foyer, rev.dividendesBruts, t);
    irDu = avecMicro > 0 ? (ir.impot * total) / avecMicro : 0;
  } else {
    ir = calculerIR(total, ctx.foyer, rev.dividendesBruts, t);
    irDu = ir.impot;
  }
  const partScenario = total > 0 ? revScenario / total : 0;
  const assiettePAS = rev.salairesImposables + rev.microImposable + conjoint + autres;
  return { ir: { ...ir, impot: irDu }, irScenario: irDu * partScenario, revScenario, assiettePAS };
}

export function calculerScenario(s: Scenario, ctx: Contexte, t: Taux2026 = TAUX): Resultat {
  const hypotheses: string[] = [];
  const alertes: string[] = [];
  const independant = estIndependant(s.statut);
  const jours = independant ? Math.max(s.joursFactures, 0) + Math.max(s.joursNonFactures, 0) : Math.max(s.joursTravailles, 0);
  const surSite = joursSurSite(jours, s.teletravailJoursSemaine);
  const partTransport = estSalarie(s.statut) ? s.partEmployeurTransport : 0;
  const transport = coutTransport(s.transport, surSite, partTransport, t);
  const ca = independant ? Math.max(s.tjm, 0) * Math.max(s.joursFactures, 0) : null;

  const rev: Revenus = {
    chiffreAffaires: ca,
    brut: null,
    cotisations: 0,
    lignes: [],
    netAvantImpot: 0,
    salairesImposables: 0,
    microImposable: 0,
    microAbattuVL: 0,
    vl: 0,
    dividendesBruts: 0,
    pfu: 0,
    participationNette: 0,
  };
  let micro: ResultatMicro | undefined;
  let societe: (ResultatSociete & { partRemuneration: number }) | undefined;
  let portage: ResultatPortage | undefined;

  if (estSalarie(s.statut)) {
    const brut = Math.max(s.brutAnnuel, 0) + Math.max(s.variableAnnuel, 0);
    const r = brutVersNet(
      brut,
      {
        cadre: s.statut === "salarie_cadre",
        mutuelleMensuelle: s.mutuelleMensuelle,
        mutuellePartEmployeur: s.mutuellePartEmployeur,
        participationAnnuelle: s.participationAnnuelle,
        participationPEE: s.participationPEE,
      },
      t,
    );
    Object.assign(rev, {
      brut,
      cotisations: r.cotisationsSalarie,
      lignes: r.lignesSalarie,
      netAvantImpot: r.netAvantImpot,
      salairesImposables: r.netImposable,
      participationNette: r.participationNette,
    });
    hypotheses.push(
      "Cotisations salariales 2026 du secteur privé (taux de droit commun, hors Alsace-Moselle, sans heures supplémentaires).",
      `Mutuelle d'entreprise : ${s.mutuelleMensuelle} €/mois dont ${Math.round(s.mutuellePartEmployeur * 100)} % payés par l'employeur.`,
    );
    if (s.variableAnnuel > 0) hypotheses.push("Le variable est supposé versé en totalité (objectifs atteints).");
    if (s.participationAnnuelle > 0)
      hypotheses.push(
        s.participationPEE
          ? "Participation / intéressement placés sur un plan d'épargne salariale : seulement la CSG-CRDS, pas d'impôt, mais argent bloqué plusieurs années (sauf cas de déblocage anticipé)."
          : "Participation / intéressement perçus immédiatement : soumis à l'impôt sur le revenu.",
      );
  } else if (s.statut === "micro_bnc" || s.statut === "micro_bic") {
    micro = calculerMicro(
      {
        activite: s.statut === "micro_bnc" ? "bnc" : "bic_services",
        caFacture: ca ?? 0,
        acre: s.acre,
        versementLiberatoire: s.versementLiberatoire,
        clientsParticuliers: s.clientsParticuliers,
      },
      t,
    );
    Object.assign(rev, {
      chiffreAffaires: micro.caHT,
      cotisations: micro.cotisations,
      lignes: micro.lignes,
      netAvantImpot: micro.revenuNet,
      microImposable: micro.revenuImposable,
      microAbattuVL: s.versementLiberatoire ? micro.revenuAbattu : 0,
      vl: micro.versementLiberatoire,
    });
    alertes.push(...micro.alertes);
    hypotheses.push(
      `Cotisations micro-entrepreneur 2026 : ${(micro.tauxCotisations * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} % du chiffre d'affaires (formation professionnelle comprise).`,
      "Pas de congés payés ni d'assurance chômage : les jours non facturés ne rapportent rien.",
      "Les frais d'activité ne sont pas déductibles en micro : l'abattement forfaitaire les couvre pour l'impôt seulement.",
    );
    if (s.versementLiberatoire) {
      const plafond = t.micro.versement_liberatoire_plafond_rfr_par_part.valeur;
      hypotheses.push(
        `Versement libératoire : possible seulement si le revenu fiscal de référence de l'avant-dernière année ne dépasse pas ${plafond.toLocaleString("fr-FR")} € par part.`,
      );
    }
  } else if (s.statut === "portage") {
    portage = calculerPortage(
      {
        caHT: ca ?? 0,
        fraisGestion: s.fraisGestionPortage,
        fraisRembourses: s.fraisActiviteAnnuels,
        mutuelleMensuelle: s.mutuelleMensuelle,
        mutuellePartEmployeur: s.mutuellePartEmployeur,
      },
      t,
    );
    Object.assign(rev, {
      brut: portage.salaire.brutAnnuel,
      cotisations: portage.salaire.cotisationsSalarie + portage.salaire.cotisationsEmployeur + portage.fraisGestion,
      lignes: [
        { libelle: "Frais de gestion de la société de portage", base: portage.caHT, taux: s.fraisGestionPortage, montant: portage.fraisGestion },
        ...portage.salaire.lignesEmployeur.map((l) => ({ ...l, libelle: `${l.libelle} (part employeur)` })),
        ...portage.salaire.lignesSalarie,
      ],
      netAvantImpot: portage.salaire.netAvantImpot,
      salairesImposables: portage.salaire.netImposable,
    });
    alertes.push(...portage.alertes);
    hypotheses.push(
      `Frais de gestion du portage : ${Math.round(s.fraisGestionPortage * 1000) / 10} % du chiffre d'affaires (à négocier, souvent 5 à 10 %).`,
      "Salarié porté cadre : cotisations patronales et salariales prélevées sur le chiffre d'affaires, assurance chômage comprise.",
      "Les frais d'activité sont remboursés sur l'enveloppe, sans cotisations ni impôt.",
    );
  } else {
    const opts = {
      forme: s.formeSociete,
      caHT: ca ?? 0,
      charges: Math.max(s.fraisActiviteAnnuels, 0),
      capitalSocial: s.capitalSocial,
      partDistribuee: s.partDistribuee,
      mutuelleMensuelle: 0,
      mutuellePartEmployeur: 0,
    };
    const versRevenus = (r: ResultatSociete): Revenus => ({
      ...rev,
      brut: r.brut,
      cotisations: r.cotisationsRemuneration,
      lignes: r.lignesRemuneration,
      netAvantImpot: r.netRemuneration + r.dividendesBruts - r.prelevementsDividendes,
      salairesImposables: r.netImposableRemuneration,
      dividendesBruts: r.dividendesBruts,
      pfu: r.pfuImpot,
    });
    const netApres = (r: ResultatSociete) => {
      const rv = versRevenus(r);
      const imp = impotDuFoyer(rv, abattement10(rv.salairesImposables, t), ctx, t);
      return rv.netAvantImpot - imp.irScenario - rv.pfu;
    };
    const disponible = Math.max(opts.caHT - opts.charges, 0);
    const choix = s.arbitrageAuto
      ? meilleurArbitrage(opts, netApres, t)
      : { part: s.partRemuneration, resultat: calculerSociete(opts, disponible * s.partRemuneration, t) };
    societe = { ...choix.resultat, partRemuneration: choix.part };
    Object.assign(rev, versRevenus(choix.resultat));
    rev.cotisations = choix.resultat.cotisationsRemuneration + choix.resultat.impotSocietes + choix.resultat.prelevementsDividendes;
    rev.lignes = [
      ...choix.resultat.lignesRemuneration,
      { libelle: "Impôt sur les sociétés", base: choix.resultat.resultatAvantIS, taux: null, montant: choix.resultat.impotSocietes },
      {
        libelle: s.formeSociete === "sasu" ? "Prélèvements sociaux sur dividendes" : "Prélèvements et cotisations sur dividendes",
        base: choix.resultat.dividendesBruts,
        taux: null,
        montant: choix.resultat.prelevementsDividendes,
      },
    ];
    hypotheses.push(
      s.arbitrageAuto
        ? `Arbitrage automatique : ${Math.round(choix.part * 100)} % du disponible en rémunération, le reste en dividendes (au prélèvement forfaitaire unique de ${Math.round((t.impot.pfu_impot.valeur + t.impot.prelevements_sociaux_capital.valeur) * 1000) / 10} %).`
        : `Arbitrage choisi : ${Math.round(s.partRemuneration * 100)} % du disponible en rémunération.`,
      "Modèle simplifié : une seule année, pas de report de déficit, pas d'option pour le barème sur les dividendes, pas de frais de création.",
    );
    if (s.formeSociete === "sasu")
      hypotheses.push("SASU : président assimilé salarié, sans assurance chômage ; les dividendes ne supportent pas de cotisations sociales.");
    else
      alertes.push(
        "EURL : les cotisations du gérant (travailleur non salarié) sont approchées par un taux global calibré sur le simulateur Urssaf. Utilisez le simulateur officiel pour un chiffre précis.",
      );
    const seuilTrimestres = 4 * t.general.heures_smic_par_trimestre_retraite.valeur * t.general.smic_horaire.valeur;
    if (choix.resultat.brut < seuilTrimestres)
      alertes.push(
        `Rémunération inférieure à environ ${Math.round(seuilTrimestres).toLocaleString("fr-FR")} € brut par an : moins de 4 trimestres de retraite validés, et une protection sociale réduite.`,
      );
    if (choix.resultat.reserves > 0)
      hypotheses.push("Le bénéfice non distribué reste dans la société : il n'est pas compté dans votre revenu.");
  }

  // Impôt sur le revenu.
  const fraisReelsDeductibles = transport.deductibleFraisReels + (estSalarie(s.statut) ? Math.max(s.autresFraisAnnuels, 0) : 0);
  const forfait = abattement10(rev.salairesImposables, t);
  const deduction =
    rev.salairesImposables > 0
      ? estSalarie(s.statut) || s.statut === "portage"
        ? deductionSalaires(forfait, Math.min(fraisReelsDeductibles, rev.salairesImposables), s.deduction)
        : { montant: forfait, mode: "forfait" as const }
      : null;
  const imp = impotDuFoyer(rev, deduction?.montant ?? 0, ctx, t);
  const impotTotal = imp.irScenario + rev.vl + rev.pfu;
  const tauxPAS = imp.assiettePAS > 0 ? imp.ir.impot / imp.assiettePAS : 0;
  const basePASScenario = rev.salairesImposables + rev.microImposable;
  const netApresImpot = rev.netAvantImpot - impotTotal;

  // Avantages et frais.
  const avantages: Montant[] = [];
  const frais: Montant[] = [];
  if (estSalarie(s.statut)) {
    const tr = avantageTitresRestaurant(s.ticketsResto, t);
    if (tr.partEmployeurAnnuelle > 0) avantages.push({ libelle: "Titres-restaurant (part employeur)", montant: tr.partEmployeurAnnuelle });
    alertes.push(...tr.alertes);
    if (transport.remboursement > 0) avantages.push({ libelle: "Remboursement de l'abonnement de transport", montant: transport.remboursement });
    if (s.primeTransportAnnuelle > 0) avantages.push({ libelle: "Prime de transport / forfait mobilités", montant: s.primeTransportAnnuelle });
    if (s.indemniteTeletravailMensuelle > 0) {
      avantages.push({ libelle: "Indemnité de télétravail", montant: s.indemniteTeletravailMensuelle * 12 });
      const plafondTT = t.avantages.teletravail_allocation_exoneree_mois.valeur;
      if (s.indemniteTeletravailMensuelle > plafondTT)
        alertes.push(`Indemnité de télétravail au-dessus de ${plafondTT.toLocaleString("fr-FR")} €/mois : l'excédent doit être justifié pour rester exonéré.`);
    }
    if (s.autresFraisAnnuels > 0) frais.push({ libelle: "Autres frais professionnels non remboursés", montant: s.autresFraisAnnuels });
  } else {
    if (s.statut !== "portage" && s.statut !== "societe" && s.fraisActiviteAnnuels > 0)
      frais.push({ libelle: "Frais d'activité (matériel, logiciels, assurance…)", montant: s.fraisActiviteAnnuels });
    if (s.statut !== "portage" && s.mutuelleIndividuelleMensuelle > 0)
      frais.push({ libelle: "Mutuelle individuelle", montant: s.mutuelleIndividuelleMensuelle * 12 });
  }
  if (transport.cout > 0)
    frais.push({
      libelle:
        s.transport.mode === "voiture"
          ? `Voiture (${Math.round(transport.distanceAnnuelle).toLocaleString("fr-FR")} km/an au barème kilométrique)`
          : "Abonnement de transports publics",
      montant: transport.cout,
    });
  if (s.transport.mode === "voiture")
    hypotheses.push("Coût de la voiture estimé au barème kilométrique fiscal (carburant, entretien, assurance, dépréciation).");
  const totalAvantages = avantages.reduce((a, m) => a + m.montant, 0);
  const totalFrais = frais.reduce((a, m) => a + m.montant, 0);
  const reste = netApresImpot + totalAvantages - totalFrais;

  // Temps.
  const heuresTravail = jours * Math.max(s.heuresParJour, 0);
  const heuresTrajet = (surSite * Math.max(s.trajetMinutesAllerRetour, 0)) / 60;
  const heures = heuresTravail + heuresTrajet;

  if (ctx.revenusConjoint > 0 || ctx.foyer.enfants > 0 || ctx.foyer.situation === "couple")
    hypotheses.push("Impôt calculé pour tout le foyer, puis réparti au prorata des revenus (comme le taux du prélèvement à la source).");
  hypotheses.push("Barème de l'impôt sur le revenu de la loi de finances pour 2026, appliqué aux revenus 2026.");

  const netMensuelHorsTreizieme =
    estSalarie(s.statut) && s.surTreizeMois ? (rev.netAvantImpot - rev.participationNette) / 13 : null;

  return {
    nom: s.nom,
    statut: s.statut,
    libelleStatut:
      s.statut === "societe" ? (s.formeSociete === "sasu" ? "SASU à l'IS (simplifié)" : "EURL à l'IS (approximation)") : LIBELLES_STATUT[s.statut],
    chiffreAffaires: rev.chiffreAffaires,
    brutAnnuel: rev.brut,
    cotisations: rev.cotisations,
    lignes: rev.lignes,
    netAvantImpotAnnuel: rev.netAvantImpot,
    netMensuel: rev.netAvantImpot / 12,
    netMensuelHorsTreizieme,
    netImposableAvantDeduction: rev.salairesImposables + rev.microImposable,
    deduction,
    revenuImposableScenario: imp.revScenario,
    impotFoyer: imp.ir,
    impotRevenu: imp.irScenario,
    versementLiberatoire: rev.vl,
    pfu: rev.pfu,
    impotTotal,
    tauxPAS,
    prelevementMensuel: (tauxPAS * basePASScenario) / 12,
    tauxNeutre: rev.salairesImposables > 0 ? tauxNeutre(rev.salairesImposables / 12, t) : null,
    netApresImpotAnnuel: netApresImpot,
    netApresImpotMensuel: netApresImpot / 12,
    avantages,
    totalAvantages,
    frais,
    totalFrais,
    resteAnnuel: reste,
    resteMensuel: reste / 12,
    jours,
    joursSurSite: surSite,
    heuresTravail,
    heuresTrajet,
    horaireReel: heures > 0 ? netApresImpot / heures : 0,
    horaireReste: heures > 0 ? reste / heures : 0,
    micro,
    societe,
    portage,
    hypotheses,
    alertes,
  };
}

/** Montant principal d'un scénario : brut annuel (salarié) ou TJM (indépendant). */
export function montantPrincipal(s: Scenario): { valeur: number; unite: "brut" | "tjm" } {
  return estSalarie(s.statut) ? { valeur: s.brutAnnuel, unite: "brut" } : { valeur: s.tjm, unite: "tjm" };
}

export function avecMontant(s: Scenario, x: number): Scenario {
  return estSalarie(s.statut) ? { ...s, brutAnnuel: x } : { ...s, tjm: x };
}
