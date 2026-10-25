// Accès typé aux fichiers de data/. Aucun chiffre n'est codé dans les composants : tout passe par ici.
import delaisJson from "../../data/delais.json";
import droitsJson from "../../data/droits.json";
import organismesJson from "../../data/organismes.json";
import envoisJson from "../../data/envois.json";

export type StatutDonnee = "verifie" | "A_VERIFIER" | "conseil_outil";

export type UniteDelai = "heures" | "jours" | "mois" | "ans" | "printemps_n1" | "aucun";
export type NatureDelai = "legal" | "recommande" | "conseil_outil";

export type Delai = {
  id: string;
  libelle: string;
  unite: UniteDelai;
  valeur: number | null;
  depart: "deces" | "debut_mois";
  report?: boolean;
  nature: NatureDelai;
  explication: string;
  source: string;
  verifie_le: string;
  statut: StatutDonnee;
  note?: string;
};

export type ValeurDroit = {
  id: string;
  libelle: string;
  valeur: number;
  unite: string;
  date_effet?: string;
  source: string;
  verifie_le: string;
  statut: StatutDonnee;
  note?: string;
};

export type Canal = "guichet" | "lrar" | "courrier" | "en_ligne" | "telephone" | "formulaire";

export type TypeLettre =
  | "information_deces"
  | "demande_cloture"
  | "demande_capital_deces"
  | "demande_reversion"
  | "resiliation"
  | "demande_inventaire_comptes"
  | "remboursement_obseques"
  | "demande_capital_assurance";

export type CategorieOrganisme =
  | "etat_civil"
  | "travail"
  | "social"
  | "retraite"
  | "impots"
  | "banque_assurance"
  | "logement"
  | "energie_telecom"
  | "numerique"
  | "vehicule_animaux"
  | "succession"
  | "entreprise";

export type Organisme = {
  id: string;
  nom: string;
  categorie: CategorieOrganisme;
  role: string;
  procedure?: string;
  canaux: Canal[];
  canal_conseille: Canal;
  delai: string;
  pieces: string[];
  lien: string;
  lettre: TypeLettre | null;
  source: string;
  statut: StatutDonnee;
};

export type ModeEnvoi = { id: Canal; nom: string; quand: string; conseil: string };

export const DELAIS = delaisJson.delais as Delai[];
export const VALEURS_DROITS = droitsJson.valeurs as ValeurDroit[];
export const ORGANISMES = organismesJson.organismes as Organisme[];
export const VERIFIE_LE_ORGANISMES = organismesJson.verifie_le;
export const ENVOIS = envoisJson as {
  source: string;
  verifie_le: string;
  statut: StatutDonnee;
  modes: ModeEnvoi[];
};

export const CATEGORIES: Record<CategorieOrganisme, string> = {
  etat_civil: "État civil et obsèques",
  travail: "Travail",
  social: "Santé et prestations sociales",
  retraite: "Retraite",
  impots: "Impôts",
  banque_assurance: "Banques et assurances",
  logement: "Logement",
  energie_telecom: "Énergie, téléphone, courrier",
  numerique: "Abonnements et comptes en ligne",
  vehicule_animaux: "Véhicule et animaux",
  succession: "Succession",
  entreprise: "Entreprise du défunt",
};

export function delai(id: string): Delai {
  const d = DELAIS.find((x) => x.id === id);
  if (!d) throw new Error(`Délai inconnu : ${id}`);
  return d;
}

export function valeurDroit(id: string): ValeurDroit {
  const v = VALEURS_DROITS.find((x) => x.id === id);
  if (!v) throw new Error(`Valeur inconnue : ${id}`);
  return v;
}

export function organisme(id: string): Organisme {
  const o = ORGANISMES.find((x) => x.id === id);
  if (!o) throw new Error(`Organisme inconnu : ${id}`);
  return o;
}

export function nomCanal(c: Canal): string {
  return ENVOIS.modes.find((m) => m.id === c)?.nom ?? c;
}
