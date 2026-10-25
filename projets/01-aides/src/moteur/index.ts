import { regleFraisBancaires, regleMaPrimeRenov } from "./aides/autres";
import { regleChequeEnergie, regleProtectionsEnergie } from "./aides/energie";
import { regleAllocationsFamiliales, regleARS, regleComplementFamilial } from "./aides/famille";
import { regleBourse, regleMobiliJeune } from "./aides/jeunes";
import { regleAideLogement } from "./aides/logement";
import { reglePrimeActivite, regleRSA } from "./aides/minima";
import { regleAAH, regleCSS } from "./aides/sante";
import type { Confiance, Regle, ResultatAide, Situation } from "./types";

export * from "./types";

/** Toutes les règles, une par aide. Chacune est une fonction pure (situation) → résultat. */
export const REGLES: Regle[] = [
  regleAideLogement,
  reglePrimeActivite,
  regleRSA,
  regleChequeEnergie,
  regleBourse,
  regleMobiliJeune,
  regleAllocationsFamiliales,
  regleComplementFamilial,
  regleARS,
  regleAAH,
  regleMaPrimeRenov,
  regleProtectionsEnergie,
  regleFraisBancaires,
  regleCSS,
];

/** Montant ramené à l'année (mensuel × 12). */
export const montantAnnuel = (r: ResultatAide) =>
  r.montantEstime === null ? 0 : r.periodicite === "mensuel" ? r.montantEstime * 12 : r.montantEstime;

const ORDRE_CONFIANCE: Record<Confiance, number> = { probable: 0, possible: 1, a_verifier: 2 };

export interface Bilan {
  eligibles: ResultatAide[];
  nonEligibles: ResultatAide[];
  /** Total annuel des aides « probables » et « possibles » ayant un montant. */
  totalAnnuel: number;
  /** Total annuel en ne comptant que les aides « probables ». */
  totalAnnuelProbable: number;
}

export function evaluer(s: Situation): Bilan {
  const tous = REGLES.map((r) => r(s));
  const eligibles = tous
    .filter((r) => r.eligible)
    .sort(
      (a, b) =>
        montantAnnuel(b) - montantAnnuel(a) ||
        ORDRE_CONFIANCE[a.confiance] - ORDRE_CONFIANCE[b.confiance] ||
        a.nom.localeCompare(b.nom, "fr"),
    );
  const nonEligibles = tous.filter((r) => !r.eligible);
  const compte = (filtre: (r: ResultatAide) => boolean) =>
    Math.round(eligibles.filter(filtre).reduce((t, r) => t + montantAnnuel(r), 0));
  return {
    eligibles,
    nonEligibles,
    totalAnnuel: compte((r) => r.confiance !== "a_verifier"),
    totalAnnuelProbable: compte((r) => r.confiance === "probable"),
  };
}

/** Situation vide, point de départ du formulaire. */
export function situationVide(): Situation {
  return {
    version: 1,
    demandeur: { age: null, activite: "salarie", revenusActivite: 0 },
    conjoint: null,
    enfants: [],
    logement: { statut: "locataire", loyer: null, colocation: false, commune: null },
    autresRevenus: 0,
    particulier: { handicap: false, grossesse: false, apprentissage: false, alternance: false },
    complements: {
      rfr: null,
      rfrParents: null,
      nbFreresSoeurs: null,
      distanceEtudesKm: null,
      boursier: null,
      tauxHandicap: null,
      incidentsBancaires: null,
    },
  };
}
