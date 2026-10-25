import { normaliser } from "./normaliser";

// Extraction par expressions régulières des montants, dates et références d'un courrier.
// Tout est fait localement ; aucune donnée ne quitte le navigateur.

export type Montant = { valeur: number; brut: string; index: number; contexte: string };
export type DateTrouvee = { date: Date; brut: string; index: number; contexte: string; role: RoleDate };
export type RoleDate = "courrier" | "limite" | "autre";
export type Reference = { type: TypeReference; libelle: string; valeur: string };
export type TypeReference =
  | "allocataire"
  | "fiscal"
  | "avis"
  | "contravention"
  | "immatriculation"
  | "dossier"
  | "identifiant"
  | "contrat"
  | "siret"
  | "compte"
  | "reference";

export type Extraction = {
  montants: Montant[];
  montantPrincipal: Montant | null;
  dates: DateTrouvee[];
  dateCourrier: DateTrouvee | null;
  dateLimite: DateTrouvee | null;
  references: Reference[];
};

const MOIS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  janv: 1,
  fev: 2,
  fevr: 2,
  avr: 4,
  juil: 7,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const contexteAvant = (t: string, i: number, n = 60) => t.slice(Math.max(0, i - n), i);

/** « 1 234,56 », « 1.234,56 », « 1234.56 », « 1 234 » → nombre. */
export function lireNombreFr(s: string): number | null {
  let t = s.replace(/[\s  ]/g, "");
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(t) || /\.\d{3}\./.test(t)) t = t.replace(/\./g, "");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const NOMBRE = String.raw`\d{1,3}(?:[   .]\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?`;
const RE_MONTANT_APRES = new RegExp(String.raw`(${NOMBRE})\s?(?:€|euros?\b|eur\b)`, "gi");
const RE_MONTANT_AVANT = new RegExp(String.raw`(?:€|\beur\b)\s?(${NOMBRE})`, "gi");

export function extraireMontants(texte: string): Montant[] {
  const norm = normaliser(texte);
  const trouves = new Map<number, Montant>();
  for (const re of [RE_MONTANT_APRES, RE_MONTANT_AVANT]) {
    re.lastIndex = 0;
    for (const m of texte.matchAll(re)) {
      const valeur = lireNombreFr(m[1]);
      const index = m.index ?? 0;
      if (valeur === null) continue;
      // Écarte « 2026 euros » improbable : on garde tout, mais pas les doublons de position.
      if (![...trouves.values()].some((x) => Math.abs(x.index - index) < 3)) {
        trouves.set(index, { valeur, brut: m[0].trim(), index, contexte: contexteAvant(norm, index) });
      }
    }
  }
  return [...trouves.values()].sort((a, b) => a.index - b.index);
}

const PRINCIPAL = [
  "montant total",
  "total a payer",
  "reste a payer",
  "montant de l'indu",
  "montant du trop",
  "somme de",
  "montant restant",
  "montant de",
  "montant :",
  "montant",
  "total",
  "solde",
  "a payer",
  "a rembourser",
  "s'eleve a",
  "pour un montant",
];

/** Le montant « principal » : celui annoncé par un libellé fort, sinon le plus élevé. */
export function choisirMontantPrincipal(montants: Montant[]): Montant | null {
  if (montants.length === 0) return null;
  for (const cle of PRINCIPAL) {
    const candidats = montants.filter((m) => m.contexte.slice(-35).includes(cle));
    if (candidats.length) return candidats.reduce((a, b) => (b.valeur > a.valeur ? b : a));
  }
  return montants.reduce((a, b) => (b.valeur > a.valeur ? b : a));
}

function construireDate(j: number, m: number, a: number): Date | null {
  if (a < 100) a += 2000;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCDate() !== j || d.getUTCMonth() !== m - 1 || a < 1990 || a > 2100) return null;
  return d;
}

const RE_DATE_NUM = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g;
const RE_DATE_LETTRES =
  /\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|janv|fevr?|avr|juil|sept|oct|nov|dec)\.?\s+(\d{4})\b/g;

const INDICES_LIMITE = [
  "avant le",
  "au plus tard le",
  "au plus tard",
  "jusqu'au",
  "date limite",
  "date limite de paiement",
  "a regler avant",
  "d'ici le",
  "avant la date du",
  "le rendez-vous",
  "vous etes convoque",
  "date d'effet",
  "prendra effet le",
  "exigible le",
  "date d'exigibilite",
  "sera preleve le",
  "seront preleves le",
  "prelevement le",
];

const INDICES_COURRIER = [
  "date du courrier",
  "date d'envoi",
  "date d'emission",
  "edite le",
  "emis le",
  "date :",
  "date de l'avis",
  "date de la notification",
  "fait a",
  "notification du",
];

export function extraireDates(texte: string): DateTrouvee[] {
  const norm = normaliser(texte);
  const res: DateTrouvee[] = [];
  for (const m of norm.matchAll(RE_DATE_NUM)) {
    const d = construireDate(+m[1], +m[2], +m[3]);
    if (d) res.push({ date: d, brut: texte.substr(m.index ?? 0, m[0].length), index: m.index ?? 0, contexte: "", role: "autre" });
  }
  for (const m of norm.matchAll(RE_DATE_LETTRES)) {
    const d = construireDate(+m[1], MOIS[m[2]], +m[3]);
    if (d) res.push({ date: d, brut: texte.substr(m.index ?? 0, m[0].length), index: m.index ?? 0, contexte: "", role: "autre" });
  }
  res.sort((a, b) => a.index - b.index);
  for (const r of res) {
    r.contexte = contexteAvant(norm, r.index, 45);
    const proche = r.contexte.slice(-30);
    if (INDICES_LIMITE.some((k) => proche.includes(k))) r.role = "limite";
    else if (INDICES_COURRIER.some((k) => proche.includes(k))) r.role = "courrier";
  }
  return res;
}

/** Date du courrier : libellée comme telle, sinon « <Ville>, le <date> » dans les 400 premiers caractères,
 * sinon la première date du texte qui n'est pas une date limite ni une date de naissance. */
export function choisirDateCourrier(dates: DateTrouvee[], texte: string): DateTrouvee | null {
  const libellee = dates.find((d) => d.role === "courrier");
  if (libellee) return libellee;
  const norm = normaliser(texte);
  const enTete = dates.find((d) => d.index < 400 && /(,|\ble)\s*$/.test(norm.slice(Math.max(0, d.index - 6), d.index)));
  if (enTete) return enTete;
  return dates.find((d) => d.role === "autre" && !/naissance|ne\(e\) le|nee? le/.test(d.contexte)) ?? null;
}

/** Première date limite qui n'est pas antérieure à la date du courrier. */
export function choisirDateLimite(dates: DateTrouvee[], dateCourrier: DateTrouvee | null = null): DateTrouvee | null {
  const plancher = dateCourrier?.date.getTime() ?? -Infinity;
  return dates.find((d) => d.role === "limite" && d.date.getTime() >= plancher) ?? null;
}

type RegleRef = { type: TypeReference; libelle: string; re: RegExp };

// Les motifs s'appliquent au texte normalisé (sans accents, minuscules) ; la valeur est reprise du texte d'origine.
const N = String.raw`\b(?:n°|n o|numero|no\.?|num\.?)\s*(?:d'|de\s+l'|de\s+|du\s+)?`;
const r = (s: string) => new RegExp(s);
const REGLES_REF: RegleRef[] = [
  { type: "allocataire", libelle: "N° allocataire", re: r(String.raw`${N}allocataire\s*:?\s*([a-z0-9]{5,12})\b`) },
  { type: "fiscal", libelle: "N° fiscal", re: r(String.raw`${N}fiscal\s*:?\s*(\d[\d ]{11,16}\d)`) },
  { type: "avis", libelle: "Référence de l'avis", re: /reference\s+de\s+l'avis\s*:?\s*([a-z0-9][a-z0-9 ]{6,20}[a-z0-9])/ },
  { type: "contravention", libelle: "N° d'avis", re: r(String.raw`${N}(?:avis|amende|fps)(?:\s+de\s+(?:contravention|paiement))?\s*:?\s*(\d[\d ]{8,24}\d)`) },
  { type: "immatriculation", libelle: "Immatriculation", re: /\b([a-z]{2}-?\d{3}-?[a-z]{2})\b/ },
  { type: "identifiant", libelle: "Identifiant", re: /identifiant\s*(?:france travail|pole emploi)?\s*:?\s*([0-9]{6,8}[a-z]?)\b/ },
  { type: "siret", libelle: "SIRET", re: /siret\s*:?\s*(\d{3} ?\d{3} ?\d{3} ?\d{5})/ },
  { type: "contrat", libelle: "N° de contrat", re: r(String.raw`(?:${N}(?:contrat|police|adherent)|(?:contrat|police|adherent)\s*(?:n°|no)\.?)\s*:?\s*([a-z0-9][a-z0-9-]{4,20})`) },
  { type: "compte", libelle: "N° de compte", re: r(String.raw`(?:${N}compte(?:\s+cotisant)?|compte\s*(?:n°|no)\.?)\s*:?\s*([a-z0-9][a-z0-9 ]{4,22}[a-z0-9])`) },
  { type: "dossier", libelle: "N° de dossier", re: r(String.raw`(?:${N}(?:dossier|affaire|acte)|(?:rg|dossier)\s*(?:n°|no)\.?)\s*:?\s*([a-z0-9][a-z0-9/-]{3,20})`) },
  { type: "reference", libelle: "Référence", re: /(?:nos?\s+ref(?:erence)?s?|v\/ref|n\/ref|reference)\s*\.?\s*:\s*([a-z0-9][a-z0-9/ -]{2,24}[a-z0-9])/ },
];

export function extraireReferences(texte: string): Reference[] {
  const norm = normaliser(texte);
  const res: Reference[] = [];
  for (const r of REGLES_REF) {
    const m = r.re.exec(norm);
    if (!m) continue;
    const debut = (m.index ?? 0) + m[0].lastIndexOf(m[1]);
    const valeur = texte.substr(debut, m[1].length).trim();
    if (r.type === "immatriculation") {
      res.push({ type: r.type, libelle: r.libelle, valeur: valeur.toUpperCase() });
    } else if (!res.some((x) => x.valeur === valeur)) {
      res.push({ type: r.type, libelle: r.libelle, valeur });
    }
  }
  return res;
}

export function extraire(texte: string): Extraction {
  const montants = extraireMontants(texte);
  const dates = extraireDates(texte);
  const dateCourrier = choisirDateCourrier(dates, texte);
  if (dateCourrier && dateCourrier.role === "autre") dateCourrier.role = "courrier";
  return {
    montants,
    montantPrincipal: choisirMontantPrincipal(montants),
    dates,
    dateCourrier,
    dateLimite: choisirDateLimite(dates, dateCourrier),
    references: extraireReferences(texte),
  };
}

/** Référence la plus pertinente pour une lettre (ordre de préférence). */
export function referencePrincipale(refs: Reference[]): Reference | null {
  const ordre: TypeReference[] = [
    "contravention",
    "allocataire",
    "avis",
    "fiscal",
    "identifiant",
    "compte",
    "dossier",
    "contrat",
    "reference",
    "siret",
  ];
  for (const t of ordre) {
    const r = refs.find((x) => x.type === t);
    if (r) return r;
  }
  return null;
}
