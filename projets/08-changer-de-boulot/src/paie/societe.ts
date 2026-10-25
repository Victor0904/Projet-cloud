// Société à l'impôt sur les sociétés (modèle simplifié) : SASU (président assimilé salarié) ou EURL
// (gérant majoritaire, travailleur non salarié — approximation). Arbitrage rémunération / dividendes.
import { TAUX, type Taux2026 } from "./taux";
import { brutDepuisCoutEmployeur, brutVersNet, type Ligne } from "./salarie";

export type FormeSociete = "sasu" | "eurl";

export interface OptionsSociete {
  forme: FormeSociete;
  caHT: number;
  /** Charges de la société hors rémunération du dirigeant (logiciels, matériel, comptable, assurance…). */
  charges: number;
  capitalSocial: number;
  /** Part du bénéfice après IS distribuée en dividendes (0 à 1). */
  partDistribuee: number;
  mutuelleMensuelle: number;
  mutuellePartEmployeur: number;
}

export interface ResultatSociete {
  coutRemuneration: number;
  brut: number;
  cotisationsRemuneration: number;
  lignesRemuneration: Ligne[];
  netRemuneration: number;
  netImposableRemuneration: number;
  resultatAvantIS: number;
  impotSocietes: number;
  resultatApresIS: number;
  dividendesBruts: number;
  /** Prélèvements sociaux (SASU) ou cotisations TNS (EURL, part au-delà de 10 % du capital). */
  prelevementsDividendes: number;
  /** Part impôt du prélèvement forfaitaire unique (12,8 %). */
  pfuImpot: number;
  dividendesNets: number;
  reserves: number;
}

export function impotSocietes(resultat: number, t: Taux2026 = TAUX): number {
  if (resultat <= 0) return 0;
  const s = t.societe;
  const plafond = s.is_plafond_taux_reduit.valeur;
  return Math.min(resultat, plafond) * s.is_taux_reduit.valeur + Math.max(resultat - plafond, 0) * s.is_taux_normal.valeur;
}

export function calculerSociete(o: OptionsSociete, coutRemuneration: number, t: Taux2026 = TAUX): ResultatSociete {
  const s = t.societe;
  const disponible = Math.max(o.caHT - o.charges, 0);
  const cout = Math.min(Math.max(coutRemuneration, 0), disponible);

  let brut = 0;
  let cotisations = 0;
  let net = 0;
  let netImposable = 0;
  let lignes: Ligne[] = [];
  if (o.forme === "sasu") {
    const opts = {
      cadre: true,
      assimileSalarie: true,
      mutuelleMensuelle: o.mutuelleMensuelle,
      mutuellePartEmployeur: o.mutuellePartEmployeur,
      moinsDe11Salaries: true,
    };
    brut = cout > 0 ? brutDepuisCoutEmployeur(cout, opts, t) : 0;
    if (brut > 0) {
      const r = brutVersNet(brut, opts, t);
      net = r.netAvantImpot;
      netImposable = r.netImposable;
      cotisations = cout - net;
      lignes = [
        ...r.lignesSalarie,
        ...r.lignesEmployeur.map((l) => ({ ...l, libelle: `${l.libelle} (part société)` })),
      ];
    }
  } else {
    const taux = s.tns_taux_global_sur_remuneration.valeur;
    cotisations = cout * taux;
    net = cout - cotisations;
    netImposable = net * s.tns_ratio_imposable_sur_net.valeur;
    brut = cout;
    lignes = [{ libelle: "Cotisations TNS du gérant (approximation)", base: cout, taux, montant: cotisations }];
  }

  const resultatAvantIS = disponible - cout;
  const is = impotSocietes(resultatAvantIS, t);
  const resultatApresIS = Math.max(resultatAvantIS - is, 0);
  const part = Math.min(Math.max(o.partDistribuee, 0), 1);
  const dividendesBruts = resultatApresIS * part;
  const ps = t.impot.prelevements_sociaux_capital.valeur;
  let prelevements: number;
  if (o.forme === "sasu") prelevements = dividendesBruts * ps;
  else {
    const seuil = Math.max(o.capitalSocial, 0) * s.tns_seuil_dividendes_capital.valeur;
    const sousSeuil = Math.min(dividendesBruts, seuil);
    const auDela = Math.max(dividendesBruts - seuil, 0);
    prelevements = sousSeuil * ps + auDela * s.tns_taux_sur_dividendes_excedentaires.valeur;
  }
  const pfuImpot = dividendesBruts * t.impot.pfu_impot.valeur;
  return {
    coutRemuneration: cout,
    brut,
    cotisationsRemuneration: cotisations,
    lignesRemuneration: lignes,
    netRemuneration: net,
    netImposableRemuneration: netImposable,
    resultatAvantIS,
    impotSocietes: is,
    resultatApresIS,
    dividendesBruts,
    prelevementsDividendes: prelevements,
    pfuImpot,
    dividendesNets: dividendesBruts - prelevements - pfuImpot,
    reserves: resultatApresIS - dividendesBruts,
  };
}

/**
 * Arbitrage simple : on teste la rémunération de 0 à 100 % du disponible (pas de 1 %) et on garde
 * celle qui maximise le critère fourni (en pratique : revenu net après impôt du foyer).
 */
export function meilleurArbitrage(
  o: OptionsSociete,
  critere: (r: ResultatSociete) => number,
  t: Taux2026 = TAUX,
): { part: number; resultat: ResultatSociete } {
  const disponible = Math.max(o.caHT - o.charges, 0);
  let meilleur = { part: 0, resultat: calculerSociete(o, 0, t), valeur: -Infinity };
  for (let p = 0; p <= 100; p++) {
    const r = calculerSociete(o, (disponible * p) / 100, t);
    const v = critere(r);
    if (v > meilleur.valeur + 1e-6) meilleur = { part: p / 100, resultat: r, valeur: v };
  }
  return { part: meilleur.part, resultat: meilleur.resultat };
}
