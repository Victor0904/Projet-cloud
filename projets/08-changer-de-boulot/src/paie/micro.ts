// Micro-entreprise (BNC ou BIC prestations de services) : cotisations URSSAF, ACRE, abattement forfaitaire,
// versement libératoire, seuils de chiffre d'affaires et de franchise de TVA.
import { TAUX, type Taux2026 } from "./taux";
import type { Ligne } from "./salarie";

export type ActiviteMicro = "bnc" | "bic_services";

export interface OptionsMicro {
  activite: ActiviteMicro;
  /** Chiffre d'affaires annuel facturé (hors TVA si les clients sont des entreprises). */
  caFacture: number;
  acre: boolean;
  versementLiberatoire: boolean;
  /** Clients particuliers : le prix payé est TTC, la TVA éventuelle est prise sur la marge. */
  clientsParticuliers: boolean;
}

export type EtatTVA = "franchise" | "tolerance" | "due";

export interface ResultatMicro {
  caHT: number;
  tauxCotisations: number;
  lignes: Ligne[];
  cotisations: number;
  revenuNet: number;
  abattement: number;
  /** Revenu à ajouter au revenu imposable du foyer (0 si versement libératoire). */
  revenuImposable: number;
  /** Revenu abattu, même avec versement libératoire (sert au taux effectif et au RFR). */
  revenuAbattu: number;
  versementLiberatoire: number;
  etatTVA: EtatTVA;
  tvaCollectee: number;
  depasseSeuilMicro: boolean;
  alertes: string[];
}

export function etatTVA(ca: number, t: Taux2026 = TAUX): EtatTVA {
  const m = t.micro;
  if (ca > m.tva_franchise_services_majore.valeur) return "due";
  if (ca > m.tva_franchise_services.valeur) return "tolerance";
  return "franchise";
}

export function calculerMicro(o: OptionsMicro, t: Taux2026 = TAUX): ResultatMicro {
  const m = t.micro;
  const alertes: string[] = [];
  const caFacture = Math.max(o.caFacture, 0);
  const tva = etatTVA(caFacture, t);
  const tauxTVA = m.tva_taux_normal.valeur;
  // En régime de croisière, dès que le seuil de base est dépassé, la TVA s'applique (l'année suivante au plus tard).
  const tvaApplicable = tva !== "franchise";
  const caHT = tvaApplicable && o.clientsParticuliers ? caFacture / (1 + tauxTVA) : caFacture;
  const tvaCollectee = tvaApplicable ? caHT * tauxTVA : 0;

  const bnc = o.activite === "bnc";
  const tauxBase = bnc ? m.taux_cotisations_bnc.valeur : m.taux_cotisations_bic_services.valeur;
  const coefAcre = o.acre ? m.acre_coefficient.valeur : 1;
  const taux = Math.round(tauxBase * coefAcre * 10000) / 10000;
  const tauxCfp = bnc ? m.cfp_bnc.valeur : m.cfp_bic.valeur;
  const lignes: Ligne[] = [
    {
      libelle: o.acre ? "Cotisations sociales (taux réduit ACRE)" : "Cotisations sociales",
      base: caHT,
      taux,
      montant: caHT * taux,
    },
    { libelle: "Contribution à la formation professionnelle", base: caHT, taux: tauxCfp, montant: caHT * tauxCfp },
  ];
  const cotisations = lignes.reduce((a, l) => a + l.montant, 0);

  const tauxAbattement = bnc ? m.abattement_bnc.valeur : m.abattement_bic_services.valeur;
  const abattement = Math.min(Math.max(caHT * tauxAbattement, m.abattement_minimum.valeur), caHT);
  const revenuAbattu = caHT - abattement;
  const tauxVL = bnc ? m.versement_liberatoire_bnc.valeur : m.versement_liberatoire_bic_services.valeur;
  const vl = o.versementLiberatoire ? caHT * tauxVL : 0;

  const seuil = m.seuil_ca_services.valeur;
  const depasseSeuilMicro = caHT > seuil;
  if (depasseSeuilMicro)
    alertes.push(
      `Chiffre d'affaires supérieur au plafond de la micro-entreprise (${Math.round(seuil).toLocaleString("fr-FR")} €) : possible une année, mais après deux années consécutives au-dessus, vous basculez au régime réel (comparer avec la société ou le portage).`,
    );
  if (tva === "due")
    alertes.push(
      `Chiffre d'affaires supérieur au seuil majoré de franchise de TVA (${m.tva_franchise_services_majore.valeur.toLocaleString("fr-FR")} €) : TVA à facturer dès le dépassement.`,
    );
  else if (tva === "tolerance")
    alertes.push(
      `Chiffre d'affaires entre ${m.tva_franchise_services.valeur.toLocaleString("fr-FR")} € et ${m.tva_franchise_services_majore.valeur.toLocaleString("fr-FR")} € : franchise de TVA conservée l'année du dépassement, perdue l'année suivante.`,
    );
  if (tvaApplicable)
    alertes.push(
      o.clientsParticuliers
        ? "TVA : avec des clients particuliers, le prix payé reste le même et la TVA (20 %) est prise sur votre chiffre d'affaires."
        : "TVA : avec des clients professionnels, vous ajoutez 20 % à vos factures et la reversez ; c'est neutre pour votre revenu.",
    );
  if (o.acre)
    alertes.push(
      "ACRE : taux réduit seulement jusqu'à la fin du 3e trimestre civil suivant le début d'activité, et réservé à certains publics (demandeurs d'emploi indemnisés, etc.). Ici appliqué à toute l'année.",
    );

  return {
    caHT,
    tauxCotisations: taux + tauxCfp,
    lignes,
    cotisations,
    revenuNet: caHT - cotisations,
    abattement,
    revenuImposable: o.versementLiberatoire ? 0 : revenuAbattu,
    revenuAbattu,
    versementLiberatoire: vl,
    etatTVA: tva,
    tvaCollectee,
    depasseSeuilMicro,
    alertes,
  };
}
