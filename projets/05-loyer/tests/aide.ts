// Chargement synchrone des données pour les tests.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Millesime, Zones } from "../src/lib/types";

const lire = <T>(chemin: string): T => JSON.parse(readFileSync(join(__dirname, "..", chemin), "utf-8")) as T;
export const zones = (ville: string) => lire<Zones>(`data/encadrement/${ville}/zones.json`);
export const millesime = (ville: string, id: string) => lire<Millesime>(`data/encadrement/${ville}/loyers-${id}.json`);
