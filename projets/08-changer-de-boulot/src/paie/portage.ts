// Portage salarial : chiffre d'affaires → frais de gestion → frais professionnels remboursés →
// enveloppe = coût employeur → salaire brut → net (salarié cadre, avec assurance chômage).
import { TAUX, type Taux2026 } from "./taux";
import { brutDepuisCoutEmployeur, brutVersNet, type ResultatSalarie } from "./salarie";

export interface OptionsPortage {
  caHT: number;
  /** Part du CA prélevée par la société de portage (0 à 1). */
  fraisGestion: number;
  /** Frais professionnels remboursés sur justificatifs (non soumis à cotisations ni à l'impôt). */
  fraisRembourses: number;
  mutuelleMensuelle: number;
  mutuellePartEmployeur: number;
}

export interface ResultatPortage {
  caHT: number;
  fraisGestion: number;
  fraisRembourses: number;
  enveloppe: number;
  salaire: ResultatSalarie;
  alertes: string[];
}

export function calculerPortage(o: OptionsPortage, t: Taux2026 = TAUX): ResultatPortage {
  const ca = Math.max(o.caHT, 0);
  const fraisGestion = ca * Math.min(Math.max(o.fraisGestion, 0), 1);
  const fraisRembourses = Math.min(Math.max(o.fraisRembourses, 0), ca - fraisGestion);
  const enveloppe = Math.max(ca - fraisGestion - fraisRembourses, 0);
  const opts = { cadre: true, mutuelleMensuelle: o.mutuelleMensuelle, mutuellePartEmployeur: o.mutuellePartEmployeur };
  const brut = brutDepuisCoutEmployeur(enveloppe, opts, t);
  const salaire = brutVersNet(brut, opts, t);
  const alertes: string[] = [];
  const minimum = t.portage.salaire_minimum_part_pass.valeur * t.general.pass_annuel.valeur;
  if (brut < minimum)
    alertes.push(
      `Salaire brut inférieur au minimum du portage salarial à temps plein (environ ${Math.round(minimum).toLocaleString("fr-FR")} € par an) : le portage n'est probablement pas possible à ce niveau de chiffre d'affaires.`,
    );
  alertes.push(
    "Portage : la réserve financière, l'indemnité d'apport d'affaires et les éventuelles réductions de cotisations ne sont pas modélisées ; les frais de gestion varient selon les sociétés.",
  );
  return { caHT: ca, fraisGestion, fraisRembourses, enveloppe, salaire, alertes };
}
