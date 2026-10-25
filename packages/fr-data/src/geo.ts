// API Géo (geo.api.gouv.fr), sans clé.
const BASE = "https://geo.api.gouv.fr";

export type Commune = {
  nom: string;
  code: string;
  codesPostaux: string[];
  codeDepartement: string;
  codeRegion: string;
  population?: number;
};

const FIELDS = "nom,code,codesPostaux,codeDepartement,codeRegion,population";

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`API Géo : ${res.status}`);
  return res.json() as Promise<T>;
}

export const communesParCodePostal = (codePostal: string) =>
  get<Commune[]>("/communes", { codePostal, fields: FIELDS });

export const communesParNom = (nom: string, limit = 10) =>
  get<Commune[]>("/communes", { nom, fields: FIELDS, boost: "population", limit: String(limit) });

export const commune = (codeInsee: string) => get<Commune>(`/communes/${codeInsee}`, { fields: FIELDS });
