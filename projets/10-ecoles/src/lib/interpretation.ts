// Traduction des indicateurs en phrases simples. Les seuils viennent de data/indicateurs.json.
import type { Etablissement, Ips, ResultatBac, ResultatDnb } from "./types.ts";
import regles from "../../data/indicateurs.json";

export type Verdict = "mieux" | "conforme" | "moins_bien" | "inconnu";

export const SEUIL_POINTS = regles.valeur_ajoutee.seuils.points_de_pourcentage;
export const SEUIL_NOTE = regles.valeur_ajoutee.seuils.points_de_note_sur_20;
export const SEUIL_IPS = regles.ips.ecart_notable.valeur;

export function verdictVa(va: number | null, seuil = SEUIL_POINTS): Verdict {
  if (va === null) return "inconnu";
  if (va >= seuil) return "mieux";
  if (va <= -seuil) return "moins_bien";
  return "conforme";
}

export const LIBELLE_VERDICT: Record<Verdict, string> = {
  mieux: "fait mieux que ce que son public laisserait attendre",
  conforme: "obtient à peu près ce que son public laisserait attendre",
  moins_bien: "fait moins bien que ce que son public laisserait attendre",
  inconnu: "n'a pas de valeur ajoutée publiée pour cette session",
};

/** « +3 », « −2 », « 0 » (avec le vrai signe moins). */
export function signe(n: number, unite = ""): string {
  const v = Number.isInteger(n) ? String(Math.abs(n)) : Math.abs(n).toFixed(1).replace(".", ",");
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${v}${unite}`;
}

export const pourcent = (n: number | null) => (n === null ? "—" : `${String(n).replace(".", ",")} %`);

/** Taux attendu = taux réel − valeur ajoutée (définition de la DEPP). */
export const attendu = (taux: number | null, va: number | null) => (taux === null || va === null ? null : taux - va);

export function phraseVa(taux: number | null, va: number | null, quoi: string, unite = " %", seuil = SEUIL_POINTS): string {
  if (taux === null) return `${quoi} : non publié.`;
  const att = attendu(taux, va);
  if (att === null || va === null) {
    return `${quoi} : ${String(taux).replace(".", ",")}${unite}. Valeur ajoutée non publiée : ce chiffre seul ne dit rien de l'efficacité de l'établissement.`;
  }
  const fmt = (x: number) => `${(Math.round(x * 10) / 10).toString().replace(".", ",")}${unite}`;
  return `${quoi} : ${fmt(taux)}, pour ${fmt(att)} attendus vu le profil des élèves (${signe(va, unite === " %" ? " pt" : "")}) : l'établissement ${LIBELLE_VERDICT[verdictVa(va, seuil)]}.`;
}

export function dernier<T>(l: T[]): T | null {
  return l.length ? l[l.length - 1] : null;
}

export function phraseIps(ips: Ips | null): string {
  if (!ips) return "Indice de position sociale non publié pour cet établissement.";
  const ref = ips.reference.departement;
  if (ref === null) return `IPS ${String(ips.valeur).replace(".", ",")} (rentrée ${ips.rentree}).`;
  const ecart = ips.valeur - ref;
  const comparaison =
    ecart >= SEUIL_IPS
      ? "un public nettement plus favorisé que la moyenne du département"
      : ecart <= -SEUIL_IPS
        ? "un public nettement moins favorisé que la moyenne du département"
        : "un public proche de la moyenne du département";
  return `IPS ${String(ips.valeur).replace(".", ",")} pour une moyenne départementale de ${String(ref).replace(".", ",")} (rentrée ${ips.rentree}) : ${comparaison}.`;
}

export type IndicateurPrincipal = {
  libelle: string;
  taux: number | null;
  va: number | null;
  unite: string;
  seuil: number;
  session: number;
};

/** Indicateurs principaux de la dernière session, toujours accompagnés de leur valeur ajoutée. */
export function indicateursPrincipaux(e: Etablissement): IndicateurPrincipal[] {
  if (e.niveau === "college") {
    const d: ResultatDnb | null = dernier(e.dnb);
    if (!d) return [];
    return [
      { libelle: "Réussite au brevet", taux: d.tauxReussite, va: d.vaTauxReussite, unite: " %", seuil: SEUIL_POINTS, session: d.session },
      { libelle: "Note moyenne à l'écrit du brevet", taux: d.noteEcrit, va: d.vaNoteEcrit, unite: "/20", seuil: SEUIL_NOTE, session: d.session },
    ];
  }
  if (e.niveau === "lycee") {
    const sessions = e.bac.map((b) => b.session);
    const max = Math.max(...sessions);
    return e.bac
      .filter((b) => b.session === max)
      .flatMap((b: ResultatBac) => {
        const voie = b.voie === "gt" ? "bac général et techno." : "bac pro";
        return [
          { libelle: `Réussite au ${voie}`, taux: b.tauxReussite, va: b.vaTauxReussite, unite: " %", seuil: SEUIL_POINTS, session: b.session },
          { libelle: `Accès de la 2de au bac (${voie})`, taux: b.tauxAcces2nde, va: b.vaTauxAcces2nde, unite: " %", seuil: SEUIL_POINTS, session: b.session },
          { libelle: `Mentions (${voie})`, taux: b.tauxMentions, va: b.vaTauxMentions, unite: " %", seuil: SEUIL_POINTS, session: b.session },
        ];
      });
  }
  return [];
}

export const NIVEAU_LIBELLE = { ecole: "École", college: "Collège", lycee: "Lycée" } as const;

export const OPTION_LIBELLE: Record<string, string> = {
  maternelle: "Maternelle",
  elementaire: "Élémentaire",
  voie_generale: "Voie générale",
  voie_technologique: "Voie technologique",
  voie_professionnelle: "Voie professionnelle",
  section_europeenne: "Section européenne",
  section_internationale: "Section internationale",
  section_sport: "Section sportive",
  section_arts: "Section arts",
  section_cinema: "Section cinéma",
  section_theatre: "Section théâtre",
  segpa: "SEGPA",
  ulis: "ULIS",
  restauration: "Cantine",
  internat: "Internat",
  lycee_agricole: "Lycée agricole",
  lycee_militaire: "Lycée militaire",
  lycee_des_metiers: "Lycée des métiers",
  post_bac: "Formations post-bac",
};
