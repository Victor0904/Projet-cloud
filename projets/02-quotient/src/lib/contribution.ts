// Formulaire de contribution : transforme la saisie en fichier JSON prêt pour `data/grilles/`
// et en texte d'issue GitHub. Aucun envoi : tout reste dans le navigateur.
import { CLES_PRESTATIONS, type BaseCalcul, type ClePrestation, type Grille, type Prestation, type Unite } from "./types";
import { validerGrille } from "./validation";

export type LigneSaisie = { jusqua: string; tarif: string };

export type PrestationSaisie = {
  libelle: string;
  unite: Unite;
  lignes: LigneSaisie[];
};

export type SaisieContribution = {
  commune: string;
  codeInsee: string;
  departement: string;
  periode: string;
  source: string;
  baseCalcul: BaseCalcul;
  prestations: Record<Exclude<ClePrestation, "creche">, PrestationSaisie>;
};

export const LIBELLES_PRESTATIONS: Record<ClePrestation, string> = {
  cantine: "Cantine",
  garderie_matin: "Garderie du matin",
  garderie_soir: "Garderie / accueil du soir",
  alsh_journee: "Centre de loisirs — journée",
  alsh_demi_journee: "Centre de loisirs — demi-journée",
  creche: "Crèche municipale",
};

const UNITE_DEFAUT: Record<Exclude<ClePrestation, "creche">, Unite> = {
  cantine: "repas",
  garderie_matin: "seance",
  garderie_soir: "seance",
  alsh_journee: "jour",
  alsh_demi_journee: "demi_journee",
};

export function saisieVide(): SaisieContribution {
  const prestations = {} as SaisieContribution["prestations"];
  for (const cle of CLES_PRESTATIONS) {
    if (cle === "creche") continue;
    prestations[cle] = { libelle: LIBELLES_PRESTATIONS[cle], unite: UNITE_DEFAUT[cle], lignes: [] };
  }
  return { commune: "", codeInsee: "", departement: "", periode: "", source: "", baseCalcul: "qf_caf", prestations };
}

/** « 3,50 € » → 3.5 ; vide → NaN. */
export const lireNombre = (s: string) => {
  const t = s.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  return t === "" ? NaN : Number(t);
};

function versPrestation(p: PrestationSaisie, aujourdhui: string, source: string): Prestation {
  if (p.lignes.length === 0) {
    return { libelle: p.libelle, unite: p.unite, statut: "A_VERIFIER", tranches: [], note: "Non renseigné." };
  }
  let de = 0;
  const tranches = p.lignes.map((l, i) => {
    const derniere = i === p.lignes.length - 1;
    const a = derniere && l.jusqua.trim() === "" ? null : lireNombre(l.jusqua);
    const t = { de, a, tarif: lireNombre(l.tarif) };
    if (a !== null) de = a;
    return t;
  });
  return { libelle: p.libelle, unite: p.unite, statut: "ok", source, verifie_le: aujourdhui, tranches };
}

export function construireGrille(s: SaisieContribution, aujourdhui: string): Grille {
  const prestations = {} as Grille["prestations"];
  for (const cle of CLES_PRESTATIONS) {
    if (cle === "creche") {
      prestations.creche = {
        libelle: "Crèche municipale (barème national PSU)",
        unite: "psu",
        statut: "ok",
        tranches: [],
        note: "Barème national PSU supposé (crèche conventionnée CAF).",
      };
    } else prestations[cle] = versPrestation(s.prestations[cle], aujourdhui, s.source.trim());
  }
  return {
    code_insee: s.codeInsee.trim().toUpperCase(),
    commune: s.commune.trim(),
    departement: s.departement.trim() || s.codeInsee.trim().slice(0, 2),
    periode: s.periode.trim(),
    source: s.source.trim(),
    verifie_le: aujourdhui,
    base_calcul: s.baseCalcul,
    base_calcul_note: "Proposé par un contributeur.",
    notes: [],
    a_verifier: ["Grille proposée par un contributeur : à relire avant intégration."],
    prestations,
  };
}

export const nomFichier = (g: Grille) => `${g.code_insee || "commune"}.json`;

export function texteIssue(g: Grille): string {
  const erreurs = validerGrille(g);
  return [
    `Titre : [02-quotient] Grille tarifaire de ${g.commune || "(commune)"} (${g.code_insee || "code INSEE"})`,
    "",
    `Commune : ${g.commune} — code INSEE ${g.code_insee}`,
    `Période : ${g.periode || "non précisée"}`,
    `Source officielle : ${g.source}`,
    `Relevé le : ${g.verifie_le}`,
    "",
    `Fichier à ajouter : projets/02-quotient/data/grilles/${nomFichier(g)} (joint ci-dessous), puis l'importer dans src/lib/catalogue.ts.`,
    erreurs.length ? `\nPoints à corriger avant intégration :\n${erreurs.map((e) => `- ${e}`).join("\n")}` : "\nLa grille passe la validation automatique.",
    "",
    "```json",
    JSON.stringify(g, null, 2),
    "```",
  ].join("\n");
}
