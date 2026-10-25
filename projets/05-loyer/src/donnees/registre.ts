// Chargement à la demande des données d'encadrement (un fichier par ville et par arrêté).
// Les imports sont explicites pour que Next.js en fasse des morceaux séparés.
import type { Millesime, Zones } from "../lib/types";

type Chargeur = () => Promise<{ default: unknown }>;

const ZONES: Record<string, Chargeur> = {
  paris: () => import("../../data/encadrement/paris/zones.json"),
  lyon: () => import("../../data/encadrement/lyon/zones.json"),
  montpellier: () => import("../../data/encadrement/montpellier/zones.json"),
  "est-ensemble": () => import("../../data/encadrement/est-ensemble/zones.json"),
  "plaine-commune": () => import("../../data/encadrement/plaine-commune/zones.json"),
};

const MILLESIMES: Record<string, Record<string, Chargeur>> = {
  paris: {
    "2023": () => import("../../data/encadrement/paris/loyers-2023.json"),
    "2024": () => import("../../data/encadrement/paris/loyers-2024.json"),
    "2025": () => import("../../data/encadrement/paris/loyers-2025.json"),
  },
  lyon: {
    "2023-2024": () => import("../../data/encadrement/lyon/loyers-2023-2024.json"),
    "2024-2025": () => import("../../data/encadrement/lyon/loyers-2024-2025.json"),
    "2025-2026": () => import("../../data/encadrement/lyon/loyers-2025-2026.json"),
  },
  montpellier: { "2023": () => import("../../data/encadrement/montpellier/loyers-2023.json") },
  lille: { "2023": () => import("../../data/encadrement/lille/loyers-2023.json") },
  bordeaux: { "2023": () => import("../../data/encadrement/bordeaux/loyers-2023.json") },
  "est-ensemble": { "2023": () => import("../../data/encadrement/est-ensemble/loyers-2023.json") },
  "plaine-commune": { "2023": () => import("../../data/encadrement/plaine-commune/loyers-2023.json") },
};

export async function chargerZones(ville: string): Promise<Zones | null> {
  const c = ZONES[ville];
  return c ? ((await c()).default as Zones) : null;
}

export async function chargerMillesime(ville: string, id: string): Promise<Millesime> {
  const c = MILLESIMES[ville]?.[id];
  if (!c) throw new Error(`Pas de données ${ville} ${id}`);
  return (await c()).default as Millesime;
}

export async function chargerMillesimes(ville: string): Promise<Millesime[]> {
  return Promise.all(Object.keys(MILLESIMES[ville] ?? {}).map((id) => chargerMillesime(ville, id)));
}
