// Dernière adresse choisie, gardée dans le navigateur pour passer d'une page à l'autre.
import type { AdresseDetaillee } from "./adresse";

const CLE = "10-ecoles:adresse";

export function lireAdresse(): AdresseDetaillee | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(CLE) ?? "null");
    return v && typeof v.lat === "number" && typeof v.codeInsee === "string" ? (v as AdresseDetaillee) : null;
  } catch {
    return null;
  }
}

export function memoriserAdresse(a: AdresseDetaillee | null) {
  try {
    if (a) window.localStorage.setItem(CLE, JSON.stringify(a));
    else window.localStorage.removeItem(CLE);
  } catch {
    /* navigation privée : pas de mémorisation */
  }
}
