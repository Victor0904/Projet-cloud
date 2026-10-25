import { situationVide, type Situation } from "../src/moteur";

type Partiel = {
  demandeur?: Partial<Situation["demandeur"]>;
  conjoint?: Partial<Situation["demandeur"]> | null;
  enfants?: number[];
  logement?: Partial<Situation["logement"]>;
  autresRevenus?: number;
  particulier?: Partial<Situation["particulier"]>;
  complements?: Partial<Situation["complements"]>;
};

export const NANCY = { codeInsee: "54395", nom: "Nancy", codeDepartement: "54" };
export const PARIS = { codeInsee: "75056", nom: "Paris", codeDepartement: "75" };
export const LYON = { codeInsee: "69123", nom: "Lyon", codeDepartement: "69" };
export const GUERET = { codeInsee: "23096", nom: "Guéret", codeDepartement: "23" };

/** Construit une situation à partir d'un adulte de 35 ans salarié sans revenu, locataire à Lyon. */
export function situation(p: Partiel = {}): Situation {
  const s = situationVide();
  s.demandeur = { ...s.demandeur, age: 35, ...p.demandeur };
  s.conjoint = p.conjoint === undefined || p.conjoint === null ? null : { age: 35, activite: "salarie", revenusActivite: 0, ...p.conjoint };
  s.enfants = (p.enfants ?? []).map((age) => ({ age }));
  s.logement = { ...s.logement, loyer: 500, commune: LYON, ...p.logement };
  s.autresRevenus = p.autresRevenus ?? 0;
  s.particulier = { ...s.particulier, ...p.particulier };
  s.complements = { ...s.complements, ...p.complements };
  return s;
}
