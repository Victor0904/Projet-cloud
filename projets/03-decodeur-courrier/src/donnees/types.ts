// Types des données métier (fichiers de data/). Aucun chiffre ici : tout est dans data/*.json.

/** « verifie » : source officielle consultée ; « recoupe » : recoupé par plusieurs sources secondaires
 * (texte officiel inaccessible au moment de la vérification) ; « A_VERIFIER » : non vérifié. */
export type Statut = "verifie" | "recoupe" | "A_VERIFIER";

export type Organisme =
  | "caf"
  | "impots"
  | "urssaf"
  | "france-travail"
  | "antai"
  | "huissier"
  | "bailleur"
  | "banque"
  | "assurance";

/** Point de départ du délai. */
export type Depart =
  | "reception" // date à laquelle le courrier a été reçu (notification)
  | "date_courrier" // date figurant sur le courrier (date d'envoi)
  | "date_limite_courrier"; // le courrier fixe lui-même la date (on la reprend)

/** Mode de décompte. */
export type Mode = "calendaire" | "franc" | "ouvre";

export type Unite = "jours" | "semaines" | "mois" | "fin_annee";

export type Delai = {
  id: string;
  libelle: string;
  /** Absent pour depart = date_limite_courrier. Pour unite = fin_annee : nombre d'années après l'année de départ. */
  duree?: number;
  unite?: Unite;
  mode?: Mode;
  depart: Depart;
  reference_legale?: string;
  explication?: string;
  source: string;
  verifie_le: string;
  statut: Statut;
};

export type MotCle = { terme: string; poids: number };
export type Motif = { regex: string; poids: number };

/** Contrôle automatique d'un montant extrait (ex. frais de rejet plafonnés). */
export type Controle = {
  libelle: string;
  /** Mots qui doivent précéder le montant (dans les 60 caractères) pour qu'il soit contrôlé. */
  contexte: string[];
  plafond: number;
  message: string;
  reference_legale?: string;
  source: string;
  verifie_le: string;
  statut: Statut;
};

export type TypeCourrier = {
  id: string;
  organisme: Organisme;
  libelle: string;
  motsCles: MotCle[];
  motifs?: Motif[];
  /** Termes qui pénalisent ce type (score négatif). */
  exclusions?: MotCle[];
  cestQuoi: string;
  risques: string[];
  actions: string[];
  delais: Delai[];
  controles?: Controle[];
  lettres: string[];
  contacts: string[];
  source: string;
  verifie_le: string;
};

export type OrganismeFiche = {
  id: Organisme;
  nom: string;
  motsCles: MotCle[];
};

export type Contact = {
  id: string;
  nom: string;
  role: string;
  url: string;
  verifie_le: string;
  statut: Statut;
};

export type TermeGlossaire = {
  id: string;
  terme: string;
  /** Variantes recherchées dans le texte (sans accents, en minuscules). */
  variantes: string[];
  definition: string;
};

export type Envoi = "lrar" | "en_ligne" | "simple" | "remise_greffe";

export type ModeleLettre = {
  id: string;
  titre: string;
  envoi: Envoi[];
  conseil_envoi: string;
  corps: string;
};
