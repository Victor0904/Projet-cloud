// Modèle de données produit par l'import (scripts/construire.ts) et lu par l'application.

export type Niveau = "ecole" | "college" | "lycee";
export type Statut = "public" | "prive";

/** Options et services repérés dans l'annuaire de l'éducation (et les jeux complémentaires). */
export type CodeOption =
  | "maternelle"
  | "elementaire"
  | "voie_generale"
  | "voie_technologique"
  | "voie_professionnelle"
  | "section_europeenne"
  | "section_internationale"
  | "section_sport"
  | "section_arts"
  | "section_cinema"
  | "section_theatre"
  | "segpa"
  | "ulis"
  | "restauration"
  | "internat"
  | "lycee_agricole"
  | "lycee_militaire"
  | "lycee_des_metiers"
  | "post_bac";

export type ReferenceIps = { departement: number | null; academie: number | null; national: number | null };

export type Ips = { rentree: string; valeur: number; ecartType: number | null; reference: ReferenceIps };

/** Diplôme national du brevet (série générale) et valeur ajoutée, par session. */
export type ResultatDnb = {
  session: number;
  candidats: number | null;
  tauxReussite: number | null;
  vaTauxReussite: number | null;
  noteEcrit: number | null;
  vaNoteEcrit: number | null;
  tauxAcces6e3e: number | null;
};

/** Baccalauréat (voie GT ou pro) et valeurs ajoutées, par session. */
export type ResultatBac = {
  session: number;
  voie: "gt" | "pro";
  presents: number | null;
  tauxReussite: number | null;
  vaTauxReussite: number | null;
  tauxAcces2nde: number | null;
  vaTauxAcces2nde: number | null;
  tauxMentions: number | null;
  vaTauxMentions: number | null;
};

export type Effectif = { rentree: number; eleves: number; classes: number | null };

export type Etablissement = {
  uai: string;
  nom: string;
  niveau: Niveau;
  nature: string;
  statut: Statut;
  contratPrive: string | null;
  adresse: string;
  codePostal: string;
  commune: string;
  codeCommune: string;
  lat: number;
  lon: number;
  telephone: string | null;
  mail: string | null;
  web: string | null;
  ficheOnisep: string | null;
  educationPrioritaire: string | null;
  options: CodeOption[];
  langues: string[];
  sectionsInternationales: string[];
  ips: Ips[];
  dnb: ResultatDnb[];
  bac: ResultatBac[];
  effectifs: Effectif[];
};

export type SourceImport = { cle: string; titre: string; url: string; telecharge_le: string; lignes: number };

export type RapportJointure = {
  jeu: string;
  uaiDansLeJeu: number;
  uaiRetrouvesDansAnnuaire: number;
  /** Part des UAI du jeu absents de l'annuaire (0,03 = 3 %). */
  perte: number;
  absents: string[];
};

export type FichierDepartement = {
  departement: { code: string; code3: string; nom: string };
  genere_le: string;
  sources: SourceImport[];
  jointures: RapportJointure[];
  etablissements: Etablissement[];
};

/** Tronçon de voie : [premier numéro, dernier numéro, parité P/I/T, index du collège]. */
export type Troncon = [number, number, "P" | "I" | "T", number];

export type CommuneSecteurs = {
  nom: string;
  /** Collèges de secteur pour toute la commune (secteur unique). */
  unique: number[];
  /** Voies découpées en tronçons, indexées par clé normalisée. */
  voies: Record<string, { libelle: string; troncons: Troncon[] }>;
};

export type FichierSecteurs = {
  departement: string;
  genere_le: string;
  source: { titre: string; url: string; telecharge_le: string };
  colleges: string[];
  communes: Record<string, CommuneSecteurs>;
};

export type IndexDepartement = {
  code: string;
  code3: string;
  nom: string;
  prefixeUai: string;
  etablissements: number;
  carteScolaireColleges: boolean;
  /** Centre approximatif (moyenne des établissements) pour choisir le fichier à charger. */
  centre: [number, number];
};

export type IndexDonnees = { genere_le: string; departements: IndexDepartement[] };
