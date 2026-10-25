// Types partagés par la logique métier. Les fichiers data/ sont produits par scripts/import-*.ts.

export type EpoqueId = "avant-1946" | "1946-1970" | "1971-1990" | "apres-1990" | "1991-2005" | "apres-2005";
/** Ce que l'utilisateur peut saisir (5 tranches les plus fines + « je ne sais pas »). */
export type EpoqueSaisie = "avant-1946" | "1946-1970" | "1971-1990" | "1991-2005" | "apres-2005" | "inconnue";
export type Pieces = 1 | 2 | 3 | 4;
export type Statut = "OK" | "A_VERIFIER";

export type Ligne = {
  zone: string;
  pieces: Pieces;
  epoque: EpoqueId;
  meuble: boolean;
  maison?: boolean;
  ref: number;
  majore: number;
  minore: number;
};

export type Millesime = {
  ville: string;
  millesime: string;
  debut: string;
  fin: string;
  arrete: string;
  source: string;
  verifie_le: string;
  statut: Statut;
  note?: string;
  secteurs?: Record<string, string>;
  lignes: Ligne[];
};

type Anneau = [number, number][];
export type Geometrie = { type: "Polygon"; coordinates: Anneau[] } | { type: "MultiPolygon"; coordinates: Anneau[][] };
export type ProprietesSecteur = { secteur: string; nom?: string; insee?: string };
export type Zones = {
  type: "FeatureCollection";
  source: string;
  verifie_le: string;
  statut: Statut;
  note?: string;
  features: { type: "Feature"; properties: ProprietesSecteur; geometry: Geometrie }[];
};

export type Ville = {
  id: string;
  nom: string;
  communes: string[];
  entree_vigueur: string;
  geolocalisation: "polygones" | "manuelle";
  millesimes: string[];
  lien_officiel: string;
  statut: Statut;
  note?: string;
};

export type TerritoireNonCouvert = {
  nom: string;
  communes: string[];
  lien_officiel: string;
  raison: string;
  statut: Statut;
};

/** Caractéristiques du logement saisies par l'utilisateur. */
export type Logement = {
  pieces: number;
  epoque: EpoqueSaisie;
  meuble: boolean;
  maison: boolean;
  /** m² de surface habitable */
  surface: number;
};
