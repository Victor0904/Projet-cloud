// Géocodage de la Géoplateforme IGN (successeur de api-adresse.data.gouv.fr), sans clé.
const BASE = "https://data.geopf.fr/geocodage";

export type Adresse = {
  label: string;
  codePostal: string;
  codeInsee: string;
  ville: string;
  lon: number;
  lat: number;
  score: number;
};

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { label: string; postcode: string; citycode: string; city: string; score: number };
};

export async function chercherAdresse(q: string, limit = 5): Promise<Adresse[]> {
  if (q.trim().length < 3) return [];
  const res = await fetch(`${BASE}/search?${new URLSearchParams({ q, limit: String(limit) })}`);
  if (!res.ok) throw new Error(`API Adresse : ${res.status}`);
  const { features } = (await res.json()) as { features: Feature[] };
  return features.map(({ geometry, properties: p }) => ({
    label: p.label,
    codePostal: p.postcode,
    codeInsee: p.citycode,
    ville: p.city,
    lon: geometry.coordinates[0],
    lat: geometry.coordinates[1],
    score: p.score,
  }));
}
