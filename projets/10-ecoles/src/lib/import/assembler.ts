// Jointure annuaire ↔ indicateurs par UAI, et contrôle de la perte à la jointure.
import type { Etablissement, RapportJointure } from "../types.ts";
import { lireAnnuaire, lireRattachements } from "./annuaire.ts";
import {
  lireEffectifs,
  lireIps,
  lireIpsLycees,
  lireIval,
  lireIvac,
  lireLangues,
  lireSectionsInternationales,
  sommerEffectifs,
} from "./indicateurs.ts";

type Lignes = Record<string, unknown>[];

export type Brut = {
  annuaire: Lignes;
  ivac?: Lignes;
  ival_gt?: Lignes;
  ival_pro?: Lignes;
  ips_ecoles?: Lignes;
  ips_colleges?: Lignes;
  ips_lycees?: Lignes;
  eff_ecoles?: Lignes;
  eff_colleges?: Lignes;
  eff_lycees?: Lignes;
  eff_lp?: Lignes;
  langues?: Lignes;
  sections_internationales?: Lignes;
};

/** Seuil de perte acceptée à la jointure (exigence du cahier des charges : ≤ 5 %). */
export const SEUIL_PERTE = 0.05;

/**
 * Mesure, pour un jeu d'indicateurs, la part de ses UAI (sur la dernière année disponible) qui ne se
 * retrouvent pas dans l'annuaire. On ne compte que la dernière année : un établissement fermé depuis
 * a normalement disparu de l'annuaire, ce qui n'est pas une erreur de jointure.
 */
export function mesurerJointure(jeu: string, uaiJeu: Iterable<string>, uaiAnnuaire: Set<string>): RapportJointure {
  const uniques = [...new Set(uaiJeu)];
  const absents = uniques.filter((u) => !uaiAnnuaire.has(u));
  return {
    jeu,
    uaiDansLeJeu: uniques.length,
    uaiRetrouvesDansAnnuaire: uniques.length - absents.length,
    perte: uniques.length ? Math.round((absents.length / uniques.length) * 1000) / 1000 : 0,
    absents: absents.sort(),
  };
}

function uaiDerniereAnnee(lignes: Lignes, champAnnee: string, champUai = "uai"): string[] {
  const derniere = lignes.reduce((max, l) => (String(l[champAnnee]) > max ? String(l[champAnnee]) : max), "");
  return lignes.filter((l) => String(l[champAnnee]) === derniere).map((l) => String(l[champUai]).toUpperCase());
}

export function assembler(
  brut: Brut,
  filtreUai: (uai: string) => boolean = () => true,
): { etablissements: Etablissement[]; jointures: RapportJointure[] } {
  const etablissements = lireAnnuaire(brut.annuaire);
  const rattachements = lireRattachements(brut.annuaire);
  /** Indicateurs de l'établissement + ceux de ses sous-structures (SEP, SEGPA). */
  const filles = new Map<string, string[]>();
  for (const [fille, mere] of rattachements) filles.set(mere, [...(filles.get(mere) ?? []), fille]);
  const avecFilles = <T,>(m: Map<string, T[]>, uai: string): T[] =>
    [uai, ...(filles.get(uai) ?? [])].flatMap((u) => m.get(u) ?? []);
  const ivac = lireIvac(brut.ivac ?? []);
  const ivalGt = lireIval(brut.ival_gt ?? [], "gt");
  const ivalPro = lireIval(brut.ival_pro ?? [], "pro");
  const ipsEcoles = lireIps(brut.ips_ecoles ?? []);
  const ipsColleges = lireIps(brut.ips_colleges ?? []);
  const ipsLycees = lireIpsLycees(brut.ips_lycees ?? []);
  const effEcoles = lireEffectifs(brut.eff_ecoles ?? [], "numero_ecole", "nombre_total_eleves", "nombre_total_classes");
  const effColleges = lireEffectifs(brut.eff_colleges ?? [], "numero_college", "nombre_eleves_total");
  const effLycees = lireEffectifs(brut.eff_lycees ?? [], "numero_lycee", "nombre_d_eleves");
  const effLp = lireEffectifs(brut.eff_lp ?? [], "numero_lycee", "nombre_d_eleves");
  const langues = lireLangues(brut.langues ?? []);
  const sections = lireSectionsInternationales(brut.sections_internationales ?? []);

  for (const e of etablissements) {
    const u = e.uai;
    e.langues = langues.get(u) ?? [];
    e.sectionsInternationales = sections.get(u) ?? [];
    if (e.sectionsInternationales.length && !e.options.includes("section_internationale")) {
      e.options.push("section_internationale");
    }
    if (e.niveau === "ecole") {
      e.ips = ipsEcoles.get(u) ?? [];
      e.effectifs = effEcoles.get(u) ?? [];
    } else if (e.niveau === "college") {
      e.ips = ipsColleges.get(u) ?? [];
      e.dnb = ivac.get(u) ?? [];
      e.effectifs = effColleges.get(u) ?? [];
    } else {
      e.ips = ipsLycees.get(u) ?? [];
      e.bac = [...avecFilles(ivalGt, u), ...avecFilles(ivalPro, u)];
      e.effectifs = sommerEffectifs(avecFilles(effLycees, u), avecFilles(effLp, u));
    }
  }

  const uaiAnnuaire = new Set([...etablissements.map((e) => e.uai), ...rattachements.keys()]);
  const f = (l: string[]) => l.filter(filtreUai);
  const jointures = [
    mesurerJointure("IVAC (collèges)", f(uaiDerniereAnnee(brut.ivac ?? [], "session")), uaiAnnuaire),
    mesurerJointure("IVAL lycées GT", f(uaiDerniereAnnee(brut.ival_gt ?? [], "annee")), uaiAnnuaire),
    mesurerJointure("IVAL lycées pro", f(uaiDerniereAnnee(brut.ival_pro ?? [], "annee")), uaiAnnuaire),
    mesurerJointure("IPS écoles", f(uaiDerniereAnnee(brut.ips_ecoles ?? [], "rentree_scolaire")), uaiAnnuaire),
    mesurerJointure("IPS collèges", f(uaiDerniereAnnee(brut.ips_colleges ?? [], "rentree_scolaire")), uaiAnnuaire),
    mesurerJointure("IPS lycées", f(uaiDerniereAnnee(brut.ips_lycees ?? [], "rentree_scolaire")), uaiAnnuaire),
  ];
  return { etablissements, jointures };
}
