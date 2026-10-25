// Chargement à la demande des fichiers produits par l'import (public/donnees/), avec cache mémoire.
import type { Etablissement, FichierDepartement, FichierSecteurs, IndexDepartement, IndexDonnees } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const cache = new Map<string, Promise<unknown>>();

function charger<T>(chemin: string): Promise<T> {
  let p = cache.get(chemin) as Promise<T> | undefined;
  if (!p) {
    p = fetch(chemin).then((r) => {
      if (!r.ok) throw new Error(`Fichier de données introuvable : ${chemin} (${r.status})`);
      return r.json() as Promise<T>;
    });
    p.catch(() => cache.delete(chemin));
    cache.set(chemin, p);
  }
  return p;
}

export const chargerIndex = () => charger<IndexDonnees>(`${BASE}/donnees/index.json`);

export const chargerDepartement = (code3: string) =>
  charger<FichierDepartement>(`${BASE}/donnees/${code3}/etablissements.json`);

export async function chargerSecteurs(dep: IndexDepartement): Promise<FichierSecteurs | null> {
  return dep.carteScolaireColleges ? charger<FichierSecteurs>(`${BASE}/donnees/${dep.code3}/secteurs.json`) : null;
}

/** Département importé correspondant à un code département INSEE (« 54 », « 2A »…), ou null. */
export function departementParCode(index: IndexDonnees, code: string): IndexDepartement | null {
  return index.departements.find((d) => d.code === code) ?? null;
}

/** Département importé d'après le préfixe de l'UAI (3 premiers caractères). */
export function departementParUai(index: IndexDonnees, uai: string): IndexDepartement | null {
  return index.departements.find((d) => uai.toUpperCase().startsWith(d.prefixeUai)) ?? null;
}

export async function chargerEtablissement(uai: string): Promise<{ etab: Etablissement; fichier: FichierDepartement } | null> {
  const index = await chargerIndex();
  const dep = departementParUai(index, uai);
  if (!dep) return null;
  const fichier = await chargerDepartement(dep.code3);
  const etab = fichier.etablissements.find((e) => e.uai === uai.toUpperCase());
  return etab ? { etab, fichier } : null;
}
