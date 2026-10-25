// Liste des grilles disponibles. Pour ajouter une commune : déposer `data/grilles/<code-insee>.json`
// puis l'importer ici (les tests vérifient que chaque fichier du dossier est bien listé).
import g13055 from "../../data/grilles/13055.json";
import g21231 from "../../data/grilles/21231.json";
import g31555 from "../../data/grilles/31555.json";
import g33063 from "../../data/grilles/33063.json";
import g34172 from "../../data/grilles/34172.json";
import g35238 from "../../data/grilles/35238.json";
import g38185 from "../../data/grilles/38185.json";
import g44109 from "../../data/grilles/44109.json";
import g51454 from "../../data/grilles/51454.json";
import g54395 from "../../data/grilles/54395.json";
import g57463 from "../../data/grilles/57463.json";
import g59350 from "../../data/grilles/59350.json";
import g67482 from "../../data/grilles/67482.json";
import g69123 from "../../data/grilles/69123.json";
import g75056 from "../../data/grilles/75056.json";
import type { Grille } from "./types";

export const GRILLES: Grille[] = (
  [
    g54395, g57463, g67482, g75056, g69123, g13055, g31555, g44109,
    g33063, g59350, g35238, g34172, g38185, g21231, g51454,
  ] as unknown as Grille[]
).sort((a, b) => a.commune.localeCompare(b.commune, "fr"));

export const grilleParCode = (code: string) => GRILLES.find((g) => g.code_insee === code);

/** Part des prestations périscolaires dont la grille est connue (0 à 5). */
export const nbPrestationsConnues = (g: Grille) =>
  Object.entries(g.prestations).filter(([cle, p]) => cle !== "creche" && p.statut !== "A_VERIFIER").length;
