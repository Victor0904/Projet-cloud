import donnees from "../../data/echeances.json";
import type { Catalogue, TypeEcheance } from "./types";

export const catalogue = donnees as unknown as Catalogue;

const parId = new Map(catalogue.types.map((t) => [t.id, t]));

export const typeParId = (id: string): TypeEcheance | undefined => parId.get(id);

export const TYPE_LIBRE = "libre";

export function libelleCategorie(id: string): string {
  return catalogue.categories.find((c) => c.id === id)?.libelle ?? id;
}

/** Types regroupés par catégorie, dans l'ordre du fichier. */
export function typesParCategorie(): { id: string; libelle: string; types: TypeEcheance[] }[] {
  return catalogue.categories
    .map((c) => ({ ...c, types: catalogue.types.filter((t) => t.categorie === c.id) }))
    .filter((c) => c.types.length > 0);
}
