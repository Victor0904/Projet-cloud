// Carte scolaire des collèges publics (une ligne = un tronçon de voie ou une commune entière) → FichierSecteurs.
import type { CommuneSecteurs, FichierSecteurs, Troncon } from "../types.ts";
import { cleVoie, nombre } from "../texte.ts";

type Ligne = Record<string, unknown>;

/** Numéro de fin utilisé quand la voie n'est pas bornée. */
export const NUMERO_MAX = 99999;

function parite(v: unknown): Troncon[2] {
  return v === "P" ? "P" : v === "I" ? "I" : "T";
}

export function lireCarteScolaire(
  lignes: Ligne[],
  meta: { departement: string; source: FichierSecteurs["source"] },
): FichierSecteurs {
  const colleges: string[] = [];
  const indexCollege = new Map<string, number>();
  const idx = (uai: string) => {
    let i = indexCollege.get(uai);
    if (i === undefined) {
      i = colleges.push(uai) - 1;
      indexCollege.set(uai, i);
    }
    return i;
  };
  const communes: Record<string, CommuneSecteurs> = {};

  for (const l of lignes) {
    const insee = String(l.code_insee ?? "").trim();
    const uai = String(l.code_rne ?? "").trim().toUpperCase();
    if (!insee || !uai) continue;
    const c = (communes[insee] ??= { nom: String(l.libelle_commune ?? ""), unique: [], voies: {} });
    const i = idx(uai);
    const libelle = String(l.type_et_libelle ?? l.lieu_dit ?? "").trim();
    if (l.secteur_unique === "O" || !libelle) {
      if (!c.unique.includes(i)) c.unique.push(i);
      continue;
    }
    const cle = cleVoie(libelle);
    const voie = (c.voies[cle] ??= { libelle, troncons: [] });
    const debut = nombre(l.n_de_voie_debut) ?? 0;
    const fin = nombre(l.n_de_voie_fin);
    voie.troncons.push([debut, fin === null || fin >= 9999 ? NUMERO_MAX : fin, parite(l.parite), i]);
  }
  return { departement: meta.departement, genere_le: new Date().toISOString().slice(0, 10), source: meta.source, colleges, communes };
}
