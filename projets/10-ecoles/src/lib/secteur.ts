// « Mon secteur » : collège public de secteur pour une adresse, à partir de la carte scolaire publiée.
import type { FichierSecteurs, Troncon } from "./types.ts";
import { cleVoie, cleVoieSansType } from "./texte.ts";

export type ResultatSecteur =
  /** Un seul collège possible : c'est le collège de secteur d'après la carte publiée. */
  | { statut: "trouve"; colleges: string[]; precision: "commune" | "voie" | "numero"; voie?: string }
  /** Plusieurs collèges possibles (numéro absent, tronçons qui se chevauchent…). */
  | { statut: "plusieurs"; colleges: string[]; raison: string; voie?: string }
  /** Commune découpée en secteurs, mais la voie n'a pas été reconnue. */
  | { statut: "voie_inconnue"; colleges: string[] }
  /** Commune absente de la carte du département. */
  | { statut: "commune_absente" }
  /** Le département ne publie pas sa carte scolaire. */
  | { statut: "non_publie" };

const numeroEntier = (n: string | null | undefined): number | null => {
  const m = String(n ?? "").match(/^\d+/);
  return m ? Number(m[0]) : null;
};

const correspond = ([debut, fin, parite]: Troncon, n: number) =>
  n >= debut && n <= fin && (parite === "T" || (parite === "P") === (n % 2 === 0));

const uniques = (l: number[]) => [...new Set(l)];

export function trouverSecteur(
  carte: FichierSecteurs | null,
  adresse: { codeInsee: string; voie: string | null; numero: string | null },
): ResultatSecteur {
  if (!carte) return { statut: "non_publie" };
  const commune = carte.communes[adresse.codeInsee];
  if (!commune) return { statut: "commune_absente" };
  const uai = (idx: number[]) => uniques(idx).map((i) => carte.colleges[i]);
  const tousColleges = uai([...commune.unique, ...Object.values(commune.voies).flatMap((v) => v.troncons.map((t) => t[3]))]);

  if (Object.keys(commune.voies).length === 0) {
    return tousColleges.length === 1
      ? { statut: "trouve", colleges: tousColleges, precision: "commune" }
      : { statut: "plusieurs", colleges: tousColleges, raison: "La commune est rattachée à plusieurs collèges." };
  }

  if (!adresse.voie) return { statut: "voie_inconnue", colleges: tousColleges };
  let voie = commune.voies[cleVoie(adresse.voie)];
  if (!voie) {
    const cle = cleVoieSansType(adresse.voie);
    const candidates = Object.entries(commune.voies).filter(([, v]) => cleVoieSansType(v.libelle) === cle);
    if (candidates.length === 1) voie = candidates[0][1];
  }
  if (!voie) {
    // Voie absente du découpage : si la commune a aussi un secteur « par défaut », on le propose.
    if (commune.unique.length === 1) return { statut: "trouve", colleges: uai(commune.unique), precision: "commune" };
    return { statut: "voie_inconnue", colleges: tousColleges };
  }

  const n = numeroEntier(adresse.numero);
  const collegesVoie = uai(voie.troncons.map((t) => t[3]));
  if (collegesVoie.length === 1) {
    return { statut: "trouve", colleges: collegesVoie, precision: "voie", voie: voie.libelle };
  }
  if (n === null) {
    return {
      statut: "plusieurs",
      colleges: collegesVoie,
      raison: "Cette voie est partagée entre plusieurs collèges selon le numéro : précisez le numéro.",
      voie: voie.libelle,
    };
  }
  const retenus = uai(voie.troncons.filter((t) => correspond(t, n)).map((t) => t[3]));
  if (retenus.length === 1) return { statut: "trouve", colleges: retenus, precision: "numero", voie: voie.libelle };
  return {
    statut: "plusieurs",
    colleges: retenus.length ? retenus : collegesVoie,
    raison: retenus.length
      ? "Plusieurs tronçons de la carte couvrent ce numéro."
      : "Ce numéro n'apparaît dans aucun tronçon de la carte publiée.",
    voie: voie.libelle,
  };
}
