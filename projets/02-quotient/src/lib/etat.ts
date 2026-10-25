// État de l'application : enregistré dans le navigateur (localStorage), exportable en JSON.
import { USAGE_PAR_DEFAUT, type Usage } from "./cout";
import type { Foyer } from "./quotient";

export type ParamsGarde = {
  heuresParSemaine: number;
  semainesParAn: number;
  /** Tarif horaire saisi pour l'assistante maternelle ; null = tarif de référence du département. */
  tarifAssmat: number | null;
  handicap: boolean;
};

export type Etat = {
  version: 1;
  foyer: Foyer;
  usage: Usage;
  communes: string[];
  garde: ParamsGarde;
};

export const ETAT_PAR_DEFAUT: Etat = {
  version: 1,
  foyer: {
    situation: "couple",
    enfants: 2,
    enfantsAlternes: 0,
    enfantsAeeh: 0,
    revenusAnnuels: 42000,
    prestationsMensuelles: 150,
  },
  usage: { ...USAGE_PAR_DEFAUT, enfantsConcernes: 2 },
  communes: ["54395", "57463"],
  garde: { heuresParSemaine: 40, semainesParAn: 47, tarifAssmat: null, handicap: false },
};

const CLE = "vie-fr:02-quotient:etat";

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

/** Fusionne un état lu (fichier ou stockage) avec les valeurs par défaut ; null s'il est inutilisable. */
export function lireEtat(brut: unknown): Etat | null {
  if (!estObjet(brut) || brut.version !== 1) return null;
  const d = ETAT_PAR_DEFAUT;
  const communes = Array.isArray(brut.communes) ? brut.communes.filter((c): c is string => typeof c === "string").slice(0, 3) : d.communes;
  return {
    version: 1,
    foyer: { ...d.foyer, ...(estObjet(brut.foyer) ? (brut.foyer as Partial<Foyer>) : {}) },
    usage: { ...d.usage, ...(estObjet(brut.usage) ? (brut.usage as Partial<Usage>) : {}) },
    communes,
    garde: { ...d.garde, ...(estObjet(brut.garde) ? (brut.garde as Partial<ParamsGarde>) : {}) },
  };
}

export function chargerEtat(): Etat | null {
  try {
    const s = window.localStorage.getItem(CLE);
    return s ? lireEtat(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function sauverEtat(e: Etat) {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(e));
  } catch {
    // stockage indisponible (navigation privée…) : l'application fonctionne sans.
  }
}

export function effacerEtat() {
  try {
    window.localStorage.removeItem(CLE);
  } catch {
    // rien à faire
  }
}

/** Propose le téléchargement d'un fichier texte, sans serveur. */
export function telecharger(nom: string, contenu: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}
