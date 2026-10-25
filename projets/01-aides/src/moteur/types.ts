// Types du moteur d'éligibilité. Aucune donnée nominative : seulement des âges, montants et codes géographiques.

export type Activite =
  | "salarie"
  | "independant"
  | "etudiant"
  | "demandeur_emploi"
  | "retraite"
  | "sans_activite";

export type StatutLogement = "locataire" | "locataire_hlm" | "proprietaire" | "heberge";

export interface Adulte {
  age: number | null;
  activite: Activite;
  /** Revenus d'activité nets mensuels (salaire, revenus d'indépendant), en euros. */
  revenusActivite: number;
}

export interface Commune {
  codeInsee: string;
  nom: string;
  codeDepartement: string;
  codePostal?: string;
}

export interface Situation {
  version: 1;
  demandeur: Adulte;
  /** null = personne seule. */
  conjoint: Adulte | null;
  enfants: { age: number }[];
  logement: {
    statut: StatutLogement;
    /** Loyer mensuel hors charges. */
    loyer: number | null;
    colocation: boolean;
    commune: Commune | null;
  };
  /** Autres revenus mensuels du foyer : chômage, retraite, pension alimentaire reçue, etc. */
  autresRevenus: number;
  particulier: {
    handicap: boolean;
    grossesse: boolean;
    apprentissage: boolean;
    alternance: boolean;
  };
  /** Informations facultatives, demandées seulement si une aide en a besoin. */
  complements: Complements;
}

export interface Complements {
  /** Revenu fiscal de référence du foyer (dernier avis d'impôt). */
  rfr: number | null;
  /** Revenu brut global des parents (étudiant), avis N-2. */
  rfrParents: number | null;
  nbFreresSoeurs: number | null;
  distanceEtudesKm: number | null;
  boursier: boolean | null;
  tauxHandicap: "80" | "50_79" | "inconnu" | null;
  incidentsBancaires: boolean | null;
}

export type QuestionId = keyof Complements | "loyer" | "commune";

export type Confiance = "probable" | "possible" | "a_verifier";

export type Periodicite = "mensuel" | "annuel";

export interface SourceRef {
  source: string;
  verifie_le: string;
  date_effet?: string;
  statut?: string;
}

export interface ResultatAide {
  id: string;
  nom: string;
  organisme: string;
  eligible: boolean;
  /** null = pas de montant (aide en nature, éligibilité seulement, ou montant selon travaux). */
  montantEstime: number | null;
  periodicite: Periodicite;
  confiance: Confiance;
  /** Explication en langage clair (2 phrases). */
  explication: string;
  lien: string;
  sources: SourceRef[];
  /** Questions qui permettraient de préciser le résultat. */
  questions: QuestionId[];
  /** Au moins une valeur utilisée est marquée A_VERIFIER dans les barèmes. */
  baremeAVerifier: boolean;
}

export type Regle = (s: Situation) => ResultatAide;
