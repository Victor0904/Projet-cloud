// Saisie du formulaire (chaînes, telle que tapée) et sa validation en valeurs numériques.
import type { Adresse } from "@vie-fr/fr-data";
import type { EpoqueSaisie } from "./types";

export type Saisie = {
  adresseTexte: string;
  adresse: Adresse | null;
  /** Ville choisie à la main quand l'adresse n'est pas trouvée. */
  villeManuelle: string;
  surface: string;
  pieces: string;
  type: "appartement" | "maison";
  epoque: EpoqueSaisie;
  meuble: "oui" | "non";
  loyer: string;
  charges: string;
  complement: string;
  dateSignature: string;
};

export const SAISIE_VIDE: Saisie = {
  adresseTexte: "",
  adresse: null,
  villeManuelle: "",
  surface: "",
  pieces: "1",
  type: "appartement",
  epoque: "inconnue",
  meuble: "non",
  loyer: "",
  charges: "",
  complement: "",
  dateSignature: "",
};

export type SaisieValide = {
  surface: number;
  pieces: number;
  maison: boolean;
  epoque: EpoqueSaisie;
  meuble: boolean;
  loyer: number;
  charges: number;
  complement: number;
  dateSignature: string;
};

const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

/** Renvoie les valeurs numériques ou la liste des erreurs, formulées pour l'utilisateur. */
export function validerSaisie(s: Saisie, aujourdhui: string): { ok: true; valeurs: SaisieValide } | { ok: false; erreurs: string[] } {
  const erreurs: string[] = [];
  const surface = nombre(s.surface);
  const loyer = nombre(s.loyer);
  const charges = s.charges.trim() ? nombre(s.charges) : 0;
  const complement = s.complement.trim() ? nombre(s.complement) : 0;
  const pieces = parseInt(s.pieces, 10);
  if (!s.adresse && !s.villeManuelle) erreurs.push("Choisissez une adresse dans la liste proposée (ou votre ville).");
  if (!Number.isFinite(surface) || surface < 5 || surface > 500) erreurs.push("Indiquez une surface habitable entre 5 et 500 m².");
  if (!Number.isFinite(loyer) || loyer <= 0 || loyer > 20000) erreurs.push("Indiquez le loyer mensuel hors charges (en euros).");
  if (!Number.isFinite(charges) || charges < 0) erreurs.push("Les charges doivent être un montant positif.");
  if (!Number.isFinite(complement) || complement < 0) erreurs.push("Le complément de loyer doit être un montant positif.");
  else if (complement >= loyer) erreurs.push("Le complément de loyer doit être inférieur au loyer total hors charges.");
  if (!(pieces >= 1)) erreurs.push("Indiquez le nombre de pièces principales.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.dateSignature)) erreurs.push("Indiquez la date de signature du bail.");
  else if (s.dateSignature > aujourdhui) erreurs.push("La date de signature ne peut pas être dans le futur.");
  if (erreurs.length) return { ok: false, erreurs };
  return {
    ok: true,
    valeurs: {
      surface,
      pieces,
      maison: s.type === "maison",
      epoque: s.epoque,
      meuble: s.meuble === "oui",
      loyer,
      charges,
      complement,
      dateSignature: s.dateSignature,
    },
  };
}
