import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { chercherAdresses } from "../src/lib/adresse.ts";
import { autour, distanceKm, FILTRES_PAR_DEFAUT, formaterDistance } from "../src/lib/geo.ts";
import { assembler } from "../src/lib/import/assembler.ts";
import type { FichierDepartement } from "../src/lib/types.ts";
import { echantillon } from "./aide.ts";

const reponse = readFileSync(join(import.meta.dirname, "fixtures", "geocodage-place-stanislas.json"), "utf8");
const fetchSimule = vi.fn(async () => new Response(reponse, { status: 200 })) as unknown as typeof fetch;

describe("recherche par adresse à Nancy (rayon 3 km)", () => {
  it("géocode l'adresse avec la voie et le numéro", async () => {
    const [a] = await chercherAdresses("1 place Stanislas Nancy", 1, fetchSimule);
    expect(a).toMatchObject({ codeInsee: "54395", codeDepartement: "54", voie: "Place Stanislas", numero: "1" });
  });

  it("bascule sur le second service si le premier est en panne", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error("réseau"))
      .mockResolvedValueOnce(new Response(reponse, { status: 200 })) as unknown as typeof fetch;
    const r = await chercherAdresses("1 place Stanislas Nancy", 1, f);
    expect(r).toHaveLength(1);
  });

  it("renvoie les établissements à moins de 3 km, du plus proche au plus lointain", async () => {
    const [a] = await chercherAdresses("1 place Stanislas Nancy", 1, fetchSimule);
    const { etablissements } = assembler(echantillon);
    const r = autour(etablissements, a, { ...FILTRES_PAR_DEFAUT, niveaux: [], rayonKm: 3 });
    expect(r.length).toBeGreaterThan(10);
    expect(r.every((e) => e.distanceKm <= 3)).toBe(true);
    expect(r.map((e) => e.distanceKm)).toEqual([...r.map((e) => e.distanceKm)].sort((x, y) => x - y));
    // Le collège Niki de Saint Phalle est à 3,03 km : juste hors du rayon.
    expect(r.some((e) => e.nom === "Collège Niki de Saint Phalle")).toBe(false);
    expect(autour(etablissements, a, { ...FILTRES_PAR_DEFAUT, rayonKm: 3.1 }).some((e) => e.nom === "Collège Niki de Saint Phalle")).toBe(true);
    // Les établissements à plus de 20 km de l'échantillon sont exclus.
    expect(r.some((e) => e.nom.includes("Boutet-de-Monvel"))).toBe(false);
  });

  it("applique les filtres niveau et public/privé", async () => {
    const [a] = await chercherAdresses("1 place Stanislas Nancy", 1, fetchSimule);
    const { etablissements } = assembler(echantillon);
    const colleges = autour(etablissements, a, { ...FILTRES_PAR_DEFAUT, niveaux: ["college"], statut: "public" });
    expect(colleges.length).toBeGreaterThan(0);
    expect(colleges.every((e) => e.niveau === "college" && e.statut === "public")).toBe(true);
    const lycees = autour(etablissements, a, { ...FILTRES_PAR_DEFAUT, niveaux: ["lycee"] });
    expect(lycees.map((e) => e.nom)).toContain("Lycée Henri Poincaré");
  });

  it("calcule et formate les distances", () => {
    // Place Stanislas → gare de Nancy : environ 750 m.
    expect(distanceKm({ lat: 48.693118, lon: 6.18266 }, { lat: 48.6898, lon: 6.1740 })).toBeCloseTo(0.72, 1);
    expect(formaterDistance(0.456)).toBe("460 m");
    expect(formaterDistance(2.04)).toBe("2,0 km");
  });

  const fichier = join(import.meta.dirname, "..", "public", "donnees", "054", "etablissements.json");
  it.runIf(existsSync(fichier))("sur les données réelles du 54 : des collèges autour de la place Stanislas", async () => {
    const [a] = await chercherAdresses("1 place Stanislas Nancy", 1, fetchSimule);
    const f = JSON.parse(readFileSync(fichier, "utf8")) as FichierDepartement;
    const r = autour(f.etablissements, a, { ...FILTRES_PAR_DEFAUT, niveaux: ["college"], rayonKm: 3 });
    expect(r.length).toBeGreaterThanOrEqual(5);
    expect(r.every((e) => e.distanceKm <= 3 && e.niveau === "college")).toBe(true);
  });
});
