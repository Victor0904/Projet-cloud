// Recherche du loyer de référence applicable à un logement dans un arrêté (millésime).
import type { EpoqueId, EpoqueSaisie, Ligne, Logement, Millesime, Pieces } from "./types";

export const LIBELLES_EPOQUE: Record<EpoqueId | "inconnue", string> = {
  "avant-1946": "avant 1946",
  "1946-1970": "1946 à 1970",
  "1971-1990": "1971 à 1990",
  "apres-1990": "après 1990",
  "1991-2005": "1991 à 2005",
  "apres-2005": "après 2005",
  inconnue: "inconnue",
};

export type Reference = {
  zone: string;
  pieces: Pieces;
  epoque: EpoqueId;
  meuble: boolean;
  maison?: boolean;
  /** €/m²/mois hors charges */
  ref: number;
  majore: number;
  minore: number;
  /** Explications quand la saisie a dû être adaptée aux catégories de l'arrêté. */
  remarques: string[];
};

export const piecesCategorie = (n: number): Pieces => (n <= 1 ? 1 : n >= 4 ? 4 : (Math.round(n) as Pieces));

/** Traduit l'époque saisie dans les tranches propres à la ville (4 ou 5 tranches selon l'arrêté). */
export function epoquesCandidates(saisie: EpoqueSaisie, disponibles: Set<EpoqueId>): EpoqueId[] {
  if (saisie === "inconnue") return [...disponibles];
  if (disponibles.has(saisie)) return [saisie];
  if ((saisie === "1991-2005" || saisie === "apres-2005") && disponibles.has("apres-1990")) return ["apres-1990"];
  return [];
}

export function trouverReference(m: Millesime, zone: string, logement: Logement): Reference | null {
  const remarques: string[] = [];
  const pieces = piecesCategorie(logement.pieces);
  if (logement.pieces > 4) remarques.push("Les logements de 4 pièces et plus partagent la même catégorie.");

  const dansZone = m.lignes.filter((l) => l.zone === zone);
  if (dansZone.length === 0) return null;
  const distingueMaison = dansZone.some((l) => l.maison !== undefined);
  if (logement.maison && !distingueMaison) {
    remarques.push("Cet arrêté ne distingue pas les maisons des appartements : les valeurs sont communes.");
  }
  const epoques = epoquesCandidates(logement.epoque, new Set(dansZone.map((l) => l.epoque)));
  const candidates: Ligne[] = dansZone.filter(
    (l) =>
      l.pieces === pieces &&
      l.meuble === logement.meuble &&
      epoques.includes(l.epoque) &&
      (!distingueMaison || l.maison === logement.maison),
  );
  if (candidates.length === 0) return null;
  // Époque inconnue : on retient la tranche la plus favorable au bailleur (plafond le plus haut),
  // pour ne jamais annoncer à tort un dépassement.
  const l = candidates.reduce((a, b) => (b.majore > a.majore ? b : a));
  if (logement.epoque === "inconnue") {
    remarques.push(
      `Époque de construction inconnue : nous retenons la plus favorable au bailleur (${LIBELLES_EPOQUE[l.epoque]}). ` +
        "Le plafond réel est peut-être plus bas : l'époque figure souvent dans le bail ou le diagnostic.",
    );
  } else if (l.epoque !== logement.epoque) {
    remarques.push(`Dans cette ville, la tranche d'époque est « ${LIBELLES_EPOQUE[l.epoque]} ».`);
  }
  return {
    zone,
    pieces,
    epoque: l.epoque,
    meuble: l.meuble,
    ...(l.maison !== undefined ? { maison: l.maison } : {}),
    ref: l.ref,
    majore: l.majore,
    minore: l.minore,
    remarques,
  };
}

/** Zone de loyers d'un secteur géographique (Paris : quartier → zone ; Lyon : IRIS → zone). */
export const zoneDuSecteur = (m: Millesime, secteur: string): string => m.secteurs?.[secteur] ?? secteur;

export type ChoixMillesime = { id: string; remarque?: string };

/**
 * Choisit l'arrêté applicable à la date de signature du bail (c'est celui en vigueur ce jour-là qui compte).
 * `periodes` : id → [début, fin] (dates ISO).
 */
export function choisirMillesime(periodes: Record<string, [string, string]>, dateSignature: string): ChoixMillesime {
  const ids = Object.keys(periodes).sort((a, b) => periodes[a][0].localeCompare(periodes[b][0]));
  const exact = ids.find((id) => periodes[id][0] <= dateSignature && dateSignature <= periodes[id][1]);
  if (exact) return { id: exact };
  const premier = ids[0];
  const dernier = ids[ids.length - 1];
  if (dateSignature > periodes[dernier][1]) {
    return {
      id: dernier,
      remarque:
        "Nous n'avons pas encore les valeurs de l'arrêté en vigueur à la signature de votre bail : " +
        "nous utilisons les plus récentes disponibles. Le plafond réel peut être un peu différent.",
    };
  }
  return {
    id: premier,
    remarque:
      "Votre bail a été signé avant le plus ancien arrêté de nos données : nous utilisons celui-ci, " +
      "le plafond réel peut être un peu différent.",
  };
}
