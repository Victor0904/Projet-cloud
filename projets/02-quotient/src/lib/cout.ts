import parametres from "../../data/parametres.json";
import { nbEnfantsTotal, valeurPourBase, type Foyer } from "./quotient";
import { arrondiCentime, reductionFratrie, tarifUnitaire } from "./tarif";
import { CLES_PERISCOLAIRES, type ClePeriscolaire, type Grille, type Intervalle, type Unite } from "./types";

/** Ce que la famille utilise, pour chaque enfant concerné. */
export type Usage = {
  /** Nombre d'enfants scolarisés qui utilisent ces prestations. */
  enfantsConcernes: number;
  /** Jours par semaine (0 à 5). */
  cantine: number;
  garderie_matin: number;
  garderie_soir: number;
  /** Durée moyenne de l'accueil du soir, quand il est facturé à l'heure. */
  heuresSoir: number;
  /** Nombre de journées / demi-journées par an (mercredis + vacances). */
  alsh_journee: number;
  alsh_demi_journee: number;
};

export const USAGE_PAR_DEFAUT: Usage = {
  enfantsConcernes: 1,
  cantine: 4,
  garderie_matin: 0,
  garderie_soir: 2,
  heuresSoir: 1,
  alsh_journee: 10,
  alsh_demi_journee: 0,
};

export const SEMAINES_SCOLAIRES = parametres.semaines_scolaires;
export const MOIS_FACTURES = parametres.mois_factures;

export type LigneCout = {
  cle: ClePeriscolaire;
  libelle: string;
  unite: Unite;
  utilisee: boolean;
  /** false si la grille de cette prestation manque pour la commune. */
  disponible: boolean;
  /** Prestation couverte par un forfait d'une autre ligne. */
  inclusDans?: string;
  /** Tarif unitaire pour le premier enfant (avant réduction fratrie). */
  tarifUnitaire: Intervalle | null;
  /** Nombre d'unités facturées par enfant et par an. */
  quantiteParEnfant: number;
  annuel: Intervalle;
  explication: string;
  source?: string;
  verifie_le?: string;
  note?: string;
};

export type ResultatCommune = {
  grille: Grille;
  valeurBase: number;
  lignes: LigneCout[];
  annuel: Intervalle;
  mensuel: Intervalle;
  /** Prestations utilisées mais sans grille connue : le total est incomplet. */
  manquantes: string[];
  estFourchette: boolean;
};

const UNITE_LIBELLE: Record<Unite, string> = {
  repas: "repas",
  seance: "séance",
  heure: "heure",
  jour: "journée",
  demi_journee: "demi-journée",
  mois: "mois",
  an: "an",
  psu: "heure",
};

export const libelleUnite = (u: Unite) => UNITE_LIBELLE[u];

/** Pluriel des unités (« repas » est invariable). */
export const pluriel = (u: Unite, n: number) => {
  const l = libelleUnite(u);
  return n > 1 && l !== "repas" ? `${l}s` : l;
};

/** Nombre d'unités facturées par enfant et par an. */
export function quantiteAnnuelle(cle: ClePeriscolaire, unite: Unite, u: Usage): number {
  const valeur = u[cle];
  if (valeur <= 0) return 0;
  switch (unite) {
    case "repas":
    case "seance":
      return valeur * SEMAINES_SCOLAIRES;
    case "heure":
      return cle === "garderie_soir" ? valeur * SEMAINES_SCOLAIRES * Math.max(0, u.heuresSoir) : valeur * SEMAINES_SCOLAIRES;
    case "jour":
    case "demi_journee":
      return valeur;
    case "mois":
      return MOIS_FACTURES;
    case "an":
      return 1;
    case "psu":
      return 0;
  }
}

function explicationQuantite(cle: ClePeriscolaire, unite: Unite, u: Usage, q: number): string {
  switch (unite) {
    case "repas":
    case "seance":
      return `${u[cle]} j/semaine x ${SEMAINES_SCOLAIRES} semaines = ${q} ${pluriel(unite, q)}`;
    case "heure":
      return `${u[cle]} j/semaine x ${SEMAINES_SCOLAIRES} semaines x ${u.heuresSoir} h = ${q} h`;
    case "jour":
    case "demi_journee":
      return `${q} ${pluriel(unite, q)} dans l'année`;
    case "mois":
      return `forfait mensuel x ${MOIS_FACTURES} mois`;
    case "an":
      return "forfait annuel";
    default:
      return "";
  }
}

const zero: Intervalle = { min: 0, max: 0 };
const ajouter = (a: Intervalle, b: Intervalle): Intervalle => ({ min: a.min + b.min, max: a.max + b.max });
const arrondir = (a: Intervalle): Intervalle => ({ min: arrondiCentime(a.min), max: arrondiCentime(a.max) });

/** Coût annuel des prestations périscolaires et de loisirs dans une commune. */
export function coutCommune(grille: Grille, foyer: Foyer, usage: Usage): ResultatCommune {
  const valeurBase = valeurPourBase(grille.base_calcul, foyer);
  const nbFoyer = Math.max(1, nbEnfantsTotal(foyer));
  const nbConcernes = Math.max(0, Math.floor(usage.enfantsConcernes));

  // Prestations couvertes par le forfait d'une autre prestation utilisée.
  const couvertes = new Map<string, string>();
  for (const cle of CLES_PERISCOLAIRES) {
    const p = grille.prestations[cle];
    if (usage[cle] > 0 && p.statut !== "A_VERIFIER") for (const c of p.inclut ?? []) couvertes.set(c, p.libelle);
  }

  const lignes: LigneCout[] = CLES_PERISCOLAIRES.map((cle) => {
    const p = grille.prestations[cle];
    const utilisee = usage[cle] > 0 && nbConcernes > 0;
    const unitaire = tarifUnitaire(p, valeurBase, nbFoyer);
    const q = quantiteAnnuelle(cle, p.unite, usage);
    const base = {
      cle,
      libelle: p.libelle,
      unite: p.unite,
      utilisee,
      disponible: unitaire !== null,
      tarifUnitaire: unitaire,
      quantiteParEnfant: q,
      source: p.source ?? grille.source,
      verifie_le: p.verifie_le ?? grille.verifie_le,
      note: p.note,
    };
    if (!utilisee || unitaire === null) return { ...base, annuel: zero, explication: "" };
    const inclusDans = couvertes.get(cle);
    if (inclusDans) return { ...base, inclusDans, annuel: zero, explication: `inclus dans « ${inclusDans} »` };

    let annuel = zero;
    for (let rang = 1; rang <= nbConcernes; rang++) {
      const r = 1 - reductionFratrie(p, rang);
      annuel = ajouter(annuel, { min: unitaire.min * r * q, max: unitaire.max * r * q });
    }
    const enfants = nbConcernes > 1 ? ` x ${nbConcernes} enfants` : "";
    const fratrie = (p.reductions_fratrie ?? []).length && nbConcernes >= Math.min(...p.reductions_fratrie!.map((x) => x.a_partir_du_rang))
      ? " (réduction fratrie appliquée)"
      : "";
    return { ...base, annuel: arrondir(annuel), explication: `${explicationQuantite(cle, p.unite, usage, q)}${enfants}${fratrie}` };
  });

  const annuel = arrondir(lignes.reduce((s, l) => ajouter(s, l.annuel), zero));
  return {
    grille,
    valeurBase,
    lignes,
    annuel,
    mensuel: arrondir({ min: annuel.min / 12, max: annuel.max / 12 }),
    manquantes: lignes.filter((l) => l.utilisee && !l.disponible).map((l) => l.libelle),
    estFourchette: annuel.min !== annuel.max,
  };
}

export type Comparaison = {
  resultats: ResultatCommune[];
  /** Prestations utilisées dont la grille est connue dans toutes les communes comparées. */
  comparables: ClePeriscolaire[];
  /** Total annuel de chaque commune limité aux prestations comparables. */
  totauxComparables: Intervalle[];
  /** Indice de la commune la moins chère sur les prestations comparables (milieu de fourchette). */
  moinsChere: number;
  /** Écart annuel de chaque commune par rapport à la moins chère, sur les prestations comparables. */
  ecarts: Intervalle[];
};

const milieu = (i: Intervalle) => (i.min + i.max) / 2;

/** Compare jusqu'à 3 communes pour le même foyer et le même usage. */
export function comparer(grilles: Grille[], foyer: Foyer, usage: Usage): Comparaison {
  const resultats = grilles.slice(0, 3).map((g) => coutCommune(g, foyer, usage));
  const comparables = CLES_PERISCOLAIRES.filter((cle) =>
    resultats.every((r) => {
      const l = r.lignes.find((x) => x.cle === cle)!;
      return l.utilisee && l.disponible;
    }),
  );
  const totauxComparables = resultats.map((r) =>
    arrondir(r.lignes.filter((l) => comparables.includes(l.cle)).reduce((s, l) => ajouter(s, l.annuel), zero)),
  );
  let moinsChere = 0;
  totauxComparables.forEach((t, i) => {
    if (milieu(t) < milieu(totauxComparables[moinsChere])) moinsChere = i;
  });
  const ref = totauxComparables[moinsChere] ?? zero;
  // Écart prudent : de la plus petite à la plus grande différence possible entre les deux fourchettes.
  const ecarts = totauxComparables.map((t) => arrondir({ min: t.min - ref.max, max: t.max - ref.min }));
  ecarts[moinsChere] = zero;
  return { resultats, comparables, totauxComparables, moinsChere, ecarts };
}
