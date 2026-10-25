// Coûts et avantages de la vie professionnelle : transport, titres-restaurant, télétravail, frais réels.
import { TAUX, type Taux2026 } from "./taux";

export type ModeTransport = "aucun" | "transports" | "voiture" | "velo";

export interface Transport {
  mode: ModeTransport;
  /** Abonnement de transports publics, €/mois. */
  abonnementMensuel: number;
  /** Distance domicile-travail aller, en km. */
  kmAller: number;
  chevauxFiscaux: number;
  electrique: boolean;
}

/** Barème kilométrique fiscal (voitures) appliqué à une distance annuelle. */
export function baremeKilometrique(distanceAnnuelle: number, cv: number, electrique: boolean, t: Taux2026 = TAUX) {
  const d = Math.max(distanceAnnuelle, 0);
  const lignes = t.bareme_kilometrique.voiture.valeur;
  const cible = Math.min(Math.max(Math.round(cv), lignes[0].cv), lignes[lignes.length - 1].cv);
  const l = lignes.find((x) => x.cv === cible) ?? lignes[lignes.length - 1];
  const [a, b] = d <= 5000 ? l.jusqua5000 : d <= 20000 ? l.jusqua20000 : l.audela;
  const montant = d * a + b;
  return electrique ? montant * (1 + t.bareme_kilometrique.majoration_electrique.valeur) : montant;
}

export function joursSurSite(joursTravailles: number, teletravailParSemaine: number): number {
  const tt = Math.min(Math.max(teletravailParSemaine, 0), 5);
  return Math.max(joursTravailles, 0) * ((5 - tt) / 5);
}

export interface CoutTransport {
  /** Coût réel annuel supporté avant remboursement. */
  cout: number;
  /** Remboursement de l'employeur (abonnement) — exonéré. */
  remboursement: number;
  /** Montant déductible au titre des frais réels (part restant à charge, distance plafonnée). */
  deductibleFraisReels: number;
  distanceAnnuelle: number;
}

export function coutTransport(
  tr: Transport,
  jours: number,
  partEmployeurAbonnement: number,
  t: Taux2026 = TAUX,
): CoutTransport {
  if (jours <= 0 || tr.mode === "aucun" || tr.mode === "velo")
    return { cout: 0, remboursement: 0, deductibleFraisReels: 0, distanceAnnuelle: 0 };
  if (tr.mode === "transports") {
    const cout = Math.max(tr.abonnementMensuel, 0) * 12;
    const remboursement = cout * Math.min(Math.max(partEmployeurAbonnement, 0), 1);
    return { cout, remboursement, deductibleFraisReels: cout - remboursement, distanceAnnuelle: 0 };
  }
  const distanceAnnuelle = 2 * Math.max(tr.kmAller, 0) * jours;
  const cout = baremeKilometrique(distanceAnnuelle, tr.chevauxFiscaux, tr.electrique, t);
  const kmMax = t.impot.frais_reels_distance_max_km.valeur;
  const distanceDeductible = 2 * Math.min(Math.max(tr.kmAller, 0), kmMax) * jours;
  return {
    cout,
    remboursement: 0,
    deductibleFraisReels: baremeKilometrique(distanceDeductible, tr.chevauxFiscaux, tr.electrique, t),
    distanceAnnuelle,
  };
}

export interface TitresRestaurant {
  actif: boolean;
  valeurFaciale: number;
  /** Part employeur, 0 à 1. */
  partEmployeur: number;
  nombreParMois: number;
}

export function avantageTitresRestaurant(tr: TitresRestaurant, t: Taux2026 = TAUX) {
  if (!tr.actif) return { partEmployeurAnnuelle: 0, partSalarieAnnuelle: 0, alertes: [] as string[] };
  const nombre = Math.max(tr.nombreParMois, 0) * 12;
  const part = Math.min(Math.max(tr.partEmployeur, 0), 1);
  const parTitre = Math.max(tr.valeurFaciale, 0) * part;
  const alertes: string[] = [];
  const a = t.avantages;
  if (parTitre > a.titre_restaurant_exoneration_max.valeur)
    alertes.push(
      `Part employeur des titres-restaurant supérieure à ${a.titre_restaurant_exoneration_max.valeur.toLocaleString("fr-FR")} € par titre : l'excédent est normalement soumis à cotisations et à l'impôt (non modélisé).`,
    );
  if (part < a.titre_restaurant_part_employeur_min.valeur || part > a.titre_restaurant_part_employeur_max.valeur)
    alertes.push("Part employeur des titres-restaurant hors de la fourchette 50-60 % ouvrant droit à l'exonération.");
  return {
    partEmployeurAnnuelle: nombre * parTitre,
    partSalarieAnnuelle: nombre * Math.max(tr.valeurFaciale, 0) * (1 - part),
    alertes,
  };
}

export type ChoixDeduction = "auto" | "forfait" | "reels";

/** Choisit entre l'abattement de 10 % et les frais réels (le plus favorable si « auto »). */
export function deductionSalaires(
  abattementForfaitaire: number,
  fraisReels: number,
  choix: ChoixDeduction,
): { montant: number; mode: "forfait" | "reels" } {
  if (choix === "reels") return { montant: fraisReels, mode: "reels" };
  if (choix === "forfait") return { montant: abattementForfaitaire, mode: "forfait" };
  return fraisReels > abattementForfaitaire
    ? { montant: fraisReels, mode: "reels" }
    : { montant: abattementForfaitaire, mode: "forfait" };
}
