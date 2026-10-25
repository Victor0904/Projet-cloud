import { LETTRES_BRUTES } from "@/donnees";
import type { Envoi, ModeleLettre } from "@/donnees/types";

// Lecture des modèles data/lettres/*.md : un en-tête « --- clé: valeur --- » puis le corps
// avec des variables {{nom_variable}}.

export function lireModele(id: string, brut: string): ModeleLettre {
  const m = brut.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Modèle de lettre ${id} : en-tête manquant`);
  const meta: Record<string, string> = {};
  for (const ligne of m[1].split("\n")) {
    const i = ligne.indexOf(":");
    if (i > 0) meta[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  if (!meta.titre) throw new Error(`Modèle de lettre ${id} : titre manquant`);
  return {
    id,
    titre: meta.titre,
    envoi: (meta.envoi ?? "lrar").split(",").map((s) => s.trim()) as Envoi[],
    conseil_envoi: meta.conseil_envoi ?? "",
    corps: m[2].trim() + "\n",
  };
}

export const MODELES: Record<string, ModeleLettre> = Object.fromEntries(
  Object.entries(LETTRES_BRUTES).map(([id, brut]) => [id, lireModele(id, brut)]),
);

export const LIBELLES_ENVOI: Record<Envoi, string> = {
  lrar: "Lettre recommandée avec accusé de réception",
  en_ligne: "Espace en ligne de l'organisme (messagerie, dépôt de document)",
  simple: "Courrier simple",
  remise_greffe: "Dépôt au greffe du tribunal",
};

export const VARIABLES = [
  "nom",
  "adresse",
  "ville",
  "date_jour",
  "destinataire",
  "reference",
  "reference_libelle",
  "montant",
  "date_courrier",
  "date_reception",
  "immatriculation",
  "motif",
  "mensualite",
  "conducteur",
] as const;
export type Variable = (typeof VARIABLES)[number];

const LIBELLES_MANQUANTS: Record<Variable, string> = {
  nom: "vos nom et prénom",
  adresse: "votre adresse",
  ville: "ville",
  date_jour: "date",
  destinataire: "nom et adresse de l'organisme",
  reference: "référence du dossier",
  reference_libelle: "Référence",
  montant: "montant",
  date_courrier: "date du courrier",
  date_reception: "date de réception",
  immatriculation: "immatriculation du véhicule",
  motif: "expliquez ici vos raisons, avec des faits précis et des dates",
  mensualite: "montant mensuel proposé",
  conducteur: "nom, prénom, adresse, date de naissance et n° de permis du conducteur",
};

/** Remplace les {{variables}} ; une valeur absente devient « [à compléter : …] ». */
export function remplir(corps: string, valeurs: Partial<Record<Variable, string>>): string {
  return corps.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, nom: string) => {
    const v = valeurs[nom as Variable]?.trim();
    if (v) return v;
    if (nom === "reference_libelle") return "Référence";
    const lib = LIBELLES_MANQUANTS[nom as Variable] ?? nom;
    return `[à compléter : ${lib}]`;
  });
}

/** Variables utilisées par un modèle (pour n'afficher que les champs utiles). */
export const variablesDe = (corps: string) =>
  [...new Set([...corps.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]))] as Variable[];
