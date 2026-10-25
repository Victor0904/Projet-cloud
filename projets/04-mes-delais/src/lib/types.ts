import type { Iso } from "./dates";

export type Regle =
  | { type: "periodique"; champ: string; premier_mois: number; intervalle_mois: number; champ_dernier?: string }
  | { type: "validite"; champ: string; duree_mois: number }
  | { type: "annuel"; mois: number; jour: number }
  | { type: "anniversaire"; champ: string; preavis_jours: number }
  | { type: "ponctuel"; champ: string; mois: number; jours: number; fin_de_mois?: boolean; rattrapable: boolean }
  | { type: "ages"; champ: string; ages: number[]; champ_dernier?: string }
  | { type: "fixe"; date: Iso }
  | { type: "libre" };

export type Champ = { id: string; libelle: string; aide?: string; obligatoire: boolean };
export type Parametre = { id: string; libelle: string; defaut: number; aide?: string };
export type Variante = {
  id: string;
  libelle: string;
  regle: Partial<Record<string, number>>;
  /** Variante qui s'applique après un renouvellement (ex. ancienne CNI → format carte). */
  apres_renouvellement?: string;
};

export type Statut = "recoupe" | "verifie" | "A_VERIFIER";

export type TypeEcheance = {
  id: string;
  categorie: string;
  cible: "personne" | "vehicule" | "logement" | "contrat" | "autre";
  libelle: string;
  description: string;
  regle: Regle;
  variantes?: Variante[];
  champs: Champ[];
  parametres?: Parametre[];
  anticiper_jours?: number;
  consequences: string;
  demarche: { libelle: string; url: string };
  source: string;
  verifie_le: Iso;
  statut: Statut;
  note?: string;
};

export type Catalogue = {
  version: number;
  verifie_le: Iso;
  avertissement: string;
  categories: { id: string; libelle: string }[];
  types: TypeEcheance[];
};

export type GenreMembre = "personne" | "vehicule" | "logement" | "autre";
export type Membre = { id: string; nom: string; genre: GenreMembre };

/** Une échéance suivie par l'utilisateur (ce qui est stocké dans le navigateur). */
export type Echeance = {
  id: string;
  typeId: string;
  varianteId?: string;
  membreId?: string;
  /** Libellé personnalisé (« Clio », « Box internet »…). */
  libelle?: string;
  /** Dates saisies, par identifiant de champ. */
  dates: Record<string, Iso>;
  parametres?: Record<string, number>;
  /** Dernière échéance marquée « c'est fait ». */
  derniere?: { echeance: Iso; faitLe: Iso };
  /** Échéance libre : date et récurrence en mois (0 = une seule fois). */
  libre?: { date: Iso; recurrenceMois: number };
  note?: string;
  creeLe: Iso;
  /** Échéance ponctuelle réglée : n'apparaît plus dans le tableau. */
  archivee?: boolean;
};

export type Etat = { version: 1; membres: Membre[]; echeances: Echeance[] };

export type StatutCalcul = "a_venir" | "en_retard" | "depasse" | "termine" | "incomplet";

export type Resultat = {
  statut: StatutCalcul;
  /** Date à retenir : la date théorique, ou aujourd'hui pour un retard rattrapable. */
  date: Iso | null;
  /** Date prévue par la règle (peut être passée). */
  dateTheorique: Iso | null;
  /** Échéances suivantes, en supposant que chacune est faite à temps. */
  suivantes: Iso[];
  explication: string;
};
