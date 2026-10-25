// Hors zone encadrée : estimation indicative à partir de la « Carte des loyers » (loyers d'annonce, charges comprises).
import meta from "../../data/carte-loyers/meta.json";

export const META_CARTE = meta as { millesime: string; source: string; verifie_le: string; statut: string; note: string };

/** [prédit, borne basse, borne haute, 1 = estimé à la commune / 0 = à la maille] en €/m² charges comprises */
export type Indicateur = [number, number, number, 0 | 1];
export type CommuneCarte = { n: string; app?: Indicateur; app12?: Indicateur; app3?: Indicateur; maison?: Indicateur };

export type EstimationHorsZone = {
  commune: string;
  typologie: "appartement 1-2 pièces" | "appartement 3 pièces et plus" | "appartement" | "maison";
  m2: number;
  m2Bas: number;
  m2Haut: number;
  mensuel: number;
  mensuelBas: number;
  mensuelHaut: number;
  precisionCommune: boolean;
};

export function estimerHorsZone(
  c: CommuneCarte,
  logement: { pieces: number; maison: boolean; surface: number },
): EstimationHorsZone | null {
  let ind: Indicateur | undefined;
  let typologie: EstimationHorsZone["typologie"];
  if (logement.maison) {
    ind = c.maison;
    typologie = "maison";
  } else if (logement.pieces <= 2 && c.app12) {
    ind = c.app12;
    typologie = "appartement 1-2 pièces";
  } else if (logement.pieces >= 3 && c.app3) {
    ind = c.app3;
    typologie = "appartement 3 pièces et plus";
  } else {
    ind = c.app;
    typologie = "appartement";
  }
  if (!ind) return null;
  const [m2, bas, haut, precision] = ind;
  const r = (n: number) => Math.round(n);
  return {
    commune: c.n,
    typologie,
    m2,
    m2Bas: bas,
    m2Haut: haut,
    mensuel: r(m2 * logement.surface),
    mensuelBas: r(bas * logement.surface),
    mensuelHaut: r(haut * logement.surface),
    precisionCommune: precision === 1,
  };
}
