import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Brut } from "../src/lib/import/assembler.ts";

type Echantillon = Brut & { carte_scolaire: Record<string, unknown>[] };

/** Échantillon fixé (extrait réel des jeux du 25/10/2026, département 54, + une ligne IVAC orpheline 0549999Z). */
export const echantillon = JSON.parse(
  readFileSync(join(import.meta.dirname, "fixtures", "brut-54-echantillon.json"), "utf8"),
) as Echantillon;

/** Coordonnées renvoyées par le géocodeur pour « 1 place Stanislas, Nancy » (réponse réelle enregistrée). */
export const PLACE_STANISLAS = { lat: 48.693118, lon: 6.18266 };
