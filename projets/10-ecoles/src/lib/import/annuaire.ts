// Annuaire de l'éducation → Etablissement (sans les indicateurs, ajoutés par assembler.ts).
import type { CodeOption, Etablissement, Niveau } from "../types.ts";
import { drapeau, nombre, telephone } from "../texte.ts";

export type LigneAnnuaire = Record<string, unknown>;

/**
 * Natures exclues : ce sont des sous-structures rattachées à un collège ou un lycée (SEGPA, SEP),
 * qui ont leur propre UAI mais pas d'existence propre pour un parent.
 */
const NATURES_EXCLUES = ["SECTION ENSEIGNT GEN. ET PROF. ADAPTE", "SECTION D ENSEIGNEMENT PROFESSIONNEL"];

const NIVEAUX: Record<string, Niveau> = { Ecole: "ecole", "École": "ecole", "Collège": "college", "Lycée": "lycee" };

const DRAPEAUX: [string, CodeOption][] = [
  ["ecole_maternelle", "maternelle"],
  ["ecole_elementaire", "elementaire"],
  ["voie_generale", "voie_generale"],
  ["voie_technologique", "voie_technologique"],
  ["voie_professionnelle", "voie_professionnelle"],
  ["section_europeenne", "section_europeenne"],
  ["section_internationale", "section_internationale"],
  ["section_sport", "section_sport"],
  ["section_arts", "section_arts"],
  ["section_cinema", "section_cinema"],
  ["section_theatre", "section_theatre"],
  ["segpa", "segpa"],
  ["ulis", "ulis"],
  ["restauration", "restauration"],
  ["hebergement", "internat"],
  ["lycee_agricole", "lycee_agricole"],
  ["lycee_militaire", "lycee_militaire"],
  ["lycee_des_metiers", "lycee_des_metiers"],
  ["post_bac", "post_bac"],
];

const texteOuNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Transforme une ligne de l'annuaire ; renvoie null si la ligne est inutilisable (pas de position, sous-structure…). */
export function lireLigneAnnuaire(l: LigneAnnuaire): Etablissement | null {
  const niveau = NIVEAUX[String(l.type_etablissement)];
  const uai = texteOuNull(l.identifiant_de_l_etablissement);
  const lat = nombre(l.latitude);
  const lon = nombre(l.longitude);
  const nature = String(l.libelle_nature ?? "");
  if (!niveau || !uai || lat === null || lon === null || NATURES_EXCLUES.includes(nature)) return null;
  const contrat = texteOuNull(l.type_contrat_prive);
  return {
    uai: uai.toUpperCase(),
    nom: String(l.nom_etablissement ?? uai).trim(),
    niveau,
    nature,
    statut: String(l.statut_public_prive).toLowerCase().startsWith("priv") ? "prive" : "public",
    contratPrive: contrat && contrat !== "SANS OBJET" ? contrat.toLowerCase() : null,
    adresse: texteOuNull(l.adresse_1) ?? "",
    codePostal: String(l.code_postal ?? ""),
    commune: String(l.nom_commune ?? ""),
    codeCommune: String(l.code_commune ?? ""),
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
    telephone: telephone(l.telephone),
    mail: texteOuNull(l.mail),
    web: texteOuNull(l.web),
    ficheOnisep: texteOuNull(l.fiche_onisep),
    educationPrioritaire: texteOuNull(l.appartenance_education_prioritaire),
    options: DRAPEAUX.filter(([champ]) => drapeau(l[champ])).map(([, code]) => code),
    langues: [],
    sectionsInternationales: [],
    ips: [],
    dnb: [],
    bac: [],
    effectifs: [],
  };
}

/**
 * Sous-structures (SEGPA, section d'enseignement professionnel) → UAI de l'établissement de
 * rattachement : leurs indicateurs (bac pro d'un lycée polyvalent par exemple) sont reportés sur lui.
 */
export function lireRattachements(lignes: LigneAnnuaire[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of lignes) {
    const uai = String(l.identifiant_de_l_etablissement ?? "").toUpperCase();
    const mere = String(l.etablissement_mere ?? "").trim().toUpperCase();
    if (uai && mere && mere !== uai && NATURES_EXCLUES.includes(String(l.libelle_nature ?? ""))) m.set(uai, mere);
  }
  return m;
}

export function lireAnnuaire(lignes: LigneAnnuaire[]): Etablissement[] {
  const vus = new Map<string, Etablissement>();
  for (const l of lignes) {
    const e = lireLigneAnnuaire(l);
    if (e && !vus.has(e.uai)) vus.set(e.uai, e);
  }
  return [...vus.values()];
}
