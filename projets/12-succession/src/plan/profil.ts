// Réponses au questionnaire d'entrée.

export type Lien = "conjoint" | "enfant" | "parent" | "frere_soeur" | "autre_famille" | "sans_lien";
export type Union = "marie" | "pacse" | "concubin" | "seul";
export type Logement = "proprietaire" | "locataire" | "heberge" | "etablissement";
export type Activite = "salarie" | "fonctionnaire" | "independant" | "retraite" | "demandeur_emploi" | "sans_activite";
export type OuiNonInconnu = "oui" | "non" | "ne_sait_pas";

export type Profil = {
  /** Date du décès, AAAA-MM-JJ. */
  dateDeces: string;
  /** Votre lien avec la personne décédée. */
  lien: Lien;
  /** Situation de couple du défunt au moment du décès. */
  union: Union;
  /** Le défunt avait des enfants. */
  enfants: boolean;
  /** Au moins un enfant de moins de 20 ans (prestations CAF) ou à charge. */
  enfantsMineurs: boolean;
  /** Pour un enfant décédé (lien = parent) : il avait moins de 25 ans ou était lui-même parent. */
  defuntJeuneOuParent: boolean;
  logement: Logement;
  activite: Activite;
  testament: OuiNonInconnu;
  assuranceVie: OuiNonInconnu;
  vehicule: boolean;
  animaux: boolean;
  entreprise: boolean;
  /** Vous êtes vous-même salarié (droit à un congé pour décès). */
  procheSalarie: boolean;
  /** Décès survenu hors de France métropolitaine (délai de succession allongé). */
  decesEtranger: boolean;
  /** Âge du conjoint survivant, si connu (réversion, veuvage). */
  ageConjoint: number | null;
};

export const PROFIL_VIDE: Profil = {
  dateDeces: "",
  lien: "enfant",
  union: "seul",
  enfants: true,
  enfantsMineurs: false,
  defuntJeuneOuParent: false,
  logement: "proprietaire",
  activite: "retraite",
  testament: "ne_sait_pas",
  assuranceVie: "ne_sait_pas",
  vehicule: false,
  animaux: false,
  entreprise: false,
  procheSalarie: true,
  decesEtranger: false,
  ageConjoint: null,
};

export const LIBELLES_LIEN: Record<Lien, string> = {
  conjoint: "Son conjoint, partenaire de Pacs ou compagnon",
  enfant: "Son enfant",
  parent: "Son père ou sa mère",
  frere_soeur: "Son frère ou sa sœur",
  autre_famille: "Un autre membre de la famille",
  sans_lien: "Un proche sans lien familial (ami, voisin, aidant)",
};

export const LIBELLES_UNION: Record<Union, string> = {
  marie: "Marié(e)",
  pacse: "Pacsé(e)",
  concubin: "En couple, sans mariage ni Pacs",
  seul: "Seul(e) : célibataire, veuf(ve) ou divorcé(e)",
};

export const LIBELLES_LOGEMENT: Record<Logement, string> = {
  proprietaire: "Propriétaire de son logement",
  locataire: "Locataire",
  heberge: "Hébergé(e) chez un proche",
  etablissement: "En maison de retraite ou Ehpad",
};

export const LIBELLES_ACTIVITE: Record<Activite, string> = {
  salarie: "Salarié(e) du privé",
  fonctionnaire: "Fonctionnaire ou agent public",
  independant: "Travailleur indépendant (artisan, commerçant, profession libérale)",
  retraite: "Retraité(e)",
  demandeur_emploi: "Demandeur d'emploi",
  sans_activite: "Sans activité professionnelle",
};

/** Le survivant est-il le conjoint marié du défunt ? (seul le mariage ouvre droit à la réversion) */
export const estConjointMarie = (p: Profil) => p.lien === "conjoint" && p.union === "marie";

/** Héritier « réservataire » ou proche en ligne directe (pour les textes, pas pour un calcul de droits). */
export const estFamilleProche = (p: Profil) => p.lien === "conjoint" || p.lien === "enfant" || p.lien === "parent";
