// Jeux d'indicateurs (IVAC, IVAL, IPS, effectifs, langues) → valeurs regroupées par UAI.
import type { Effectif, Ips, ResultatBac, ResultatDnb } from "../types.ts";
import { annee, nombre } from "../texte.ts";

type Ligne = Record<string, unknown>;

/** Nombre de sessions / rentrées conservées par établissement (« résultats sur 3 ans »). */
export const NB_ANNEES = 3;

function grouper<T>(lignes: Ligne[], champUai: string, lire: (l: Ligne) => T | null): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const l of lignes) {
    const uai = String(l[champUai] ?? "").trim().toUpperCase();
    const v = uai ? lire(l) : null;
    if (!v) continue;
    const liste = m.get(uai);
    if (liste) liste.push(v);
    else m.set(uai, [v]);
  }
  return m;
}

/** Garde les n plus récentes, de la plus ancienne à la plus récente, sans doublon d'année. */
function dernieres<T>(m: Map<string, T[]>, cle: (v: T) => number | string, n = NB_ANNEES): Map<string, T[]> {
  for (const [uai, liste] of m) {
    const uniques = new Map<number | string, T>();
    for (const v of liste) uniques.set(cle(v), v);
    m.set(
      uai,
      [...uniques.values()].sort((a, b) => (cle(a) < cle(b) ? -1 : 1)).slice(-n),
    );
  }
  return m;
}

export function lireIvac(lignes: Ligne[]): Map<string, ResultatDnb[]> {
  return dernieres(
    grouper(lignes, "uai", (l): ResultatDnb | null => {
      const session = annee(l.session);
      if (session === null) return null;
      return {
        session,
        candidats: nombre(l.nb_candidats_g),
        tauxReussite: nombre(l.taux_de_reussite_g),
        vaTauxReussite: nombre(l.va_du_taux_de_reussite_g),
        noteEcrit: nombre(l.note_a_l_ecrit_g),
        vaNoteEcrit: nombre(l.va_de_la_note_g),
        tauxAcces6e3e: nombre(l.taux_d_acces_6eme_3eme),
      };
    }),
    (r) => r.session,
  );
}

export function lireIval(lignes: Ligne[], voie: "gt" | "pro"): Map<string, ResultatBac[]> {
  return dernieres(
    grouper(lignes, "uai", (l): ResultatBac | null => {
      const session = annee(l.annee);
      if (session === null) return null;
      return {
        session,
        voie,
        presents: nombre(l.presents_total),
        tauxReussite: nombre(l.taux_reu_total),
        vaTauxReussite: nombre(l.va_reu_total),
        tauxAcces2nde: nombre(l.taux_acces_2nde),
        vaTauxAcces2nde: nombre(l.va_acces_2nde),
        tauxMentions: nombre(l.taux_men_total),
        vaTauxMentions: nombre(l.va_men_total),
      };
    }),
    (r) => r.session,
  );
}

/** IPS des écoles et des collèges : un champ `ips`, références nationale / académique / départementale. */
export function lireIps(lignes: Ligne[]): Map<string, Ips[]> {
  return dernieres(
    grouper(lignes, "uai", (l): Ips | null => {
      const valeur = nombre(l.ips);
      if (valeur === null) return null;
      return {
        rentree: String(l.rentree_scolaire),
        valeur,
        ecartType: nombre(l.ecart_type_de_l_ips),
        reference: {
          departement: nombre(l.ips_departemental),
          academie: nombre(l.ips_academique),
          national: nombre(l.ips_national),
        },
      };
    }),
    (r) => r.rentree,
  );
}

/** IPS des lycées : valeur de l'établissement ; la référence dépend du type de lycée (LEGT, LPO, LP). */
export function lireIpsLycees(lignes: Ligne[]): Map<string, Ips[]> {
  return dernieres(
    grouper(lignes, "uai", (l): Ips | null => {
      const valeur = nombre(l.ips_etab);
      if (valeur === null) return null;
      const type = String(l.type_de_lycee ?? "").toLowerCase();
      const suffixe = ["legt", "lpo", "lp"].includes(type) ? type : "legt";
      return {
        rentree: String(l.rentree_scolaire),
        valeur,
        ecartType: null,
        reference: {
          departement: nombre(l[`ips_departemental_${suffixe}`]),
          academie: nombre(l[`ips_academique_${suffixe}`]),
          national: nombre(l[`ips_national_${suffixe}`]),
        },
      };
    }),
    (r) => r.rentree,
  );
}

export function lireEffectifs(lignes: Ligne[], champUai: string, champEleves: string, champClasses?: string) {
  return dernieres(
    grouper(lignes, champUai, (l): Effectif | null => {
      const rentree = annee(l.rentree_scolaire);
      const eleves = nombre(l[champEleves]);
      if (rentree === null || eleves === null) return null;
      return { rentree, eleves, classes: champClasses ? nombre(l[champClasses]) : null };
    }),
    (r) => r.rentree,
  );
}

/** Additionne deux séries d'effectifs (lycée GT + lycée pro d'un même lycée polyvalent). */
export function sommerEffectifs(a: Effectif[] = [], b: Effectif[] = []): Effectif[] {
  const m = new Map<number, Effectif>();
  for (const e of [...a, ...b]) {
    const x = m.get(e.rentree);
    m.set(e.rentree, x ? { rentree: e.rentree, eleves: x.eleves + e.eleves, classes: null } : { ...e });
  }
  return [...m.values()].sort((x, y) => x.rentree - y.rentree).slice(-NB_ANNEES);
}

/** Langues vivantes enseignées (LV1, LV2… ; les langues anciennes LCA sont gardées à part). */
export function lireLangues(lignes: Ligne[]): Map<string, string[]> {
  const m = new Map<string, Set<string>>();
  for (const l of lignes) {
    const uai = String(l.uai ?? "").toUpperCase();
    const langue = String(l.langues ?? "").trim();
    if (!uai || !langue) continue;
    const libelle = String(l.enseignements) === "LCA" ? `${langue} (langue ancienne)` : langue;
    if (!m.has(uai)) m.set(uai, new Set());
    m.get(uai)!.add(libelle);
  }
  return new Map([...m].map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b, "fr"))]));
}

export function lireSectionsInternationales(lignes: Ligne[]): Map<string, string[]> {
  const m = new Map<string, Set<string>>();
  for (const l of lignes) {
    const uai = String(l.uai ?? "").toUpperCase();
    const section = String(l.section ?? "").trim();
    if (!uai || !section) continue;
    const libelle = section.charAt(0) + section.slice(1).toLowerCase();
    if (!m.has(uai)) m.set(uai, new Set());
    m.get(uai)!.add(libelle);
  }
  return new Map([...m].map(([k, v]) => [k, [...v].sort()]));
}
