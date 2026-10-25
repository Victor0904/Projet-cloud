// Géocodage d'une adresse saisie, avec le nom de voie et le numéro (nécessaires pour la carte scolaire).
// Le client partagé @vie-fr/fr-data ne renvoie pas la voie ni le numéro : ce client local le complète.
// API publique sans clé : Géoplateforme IGN, et en secours l'ancienne API Adresse (même format de réponse).

export const URLS_GEOCODAGE = [
  "https://data.geopf.fr/geocodage/search",
  "https://api-adresse.data.gouv.fr/search/",
];

export type AdresseDetaillee = {
  label: string;
  numero: string | null;
  voie: string | null;
  codePostal: string;
  codeInsee: string;
  commune: string;
  codeDepartement: string;
  lat: number;
  lon: number;
  type: string;
  score: number;
};

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    housenumber?: string;
    street?: string;
    name?: string;
    postcode: string;
    citycode: string;
    city: string;
    context?: string;
    type: string;
    score: number;
  };
};

/** Code département à partir du code INSEE de la commune (« 54395 » → « 54 », « 97411 » → « 974 », « 2A004 » → « 2A »). */
export function departementDeCommune(codeInsee: string): string {
  return codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
}

export function lireFeature({ geometry, properties: p }: Feature): AdresseDetaillee {
  return {
    label: p.label,
    numero: p.housenumber ?? null,
    voie: p.street ?? (p.type === "street" ? (p.name ?? null) : null),
    codePostal: p.postcode,
    codeInsee: p.citycode,
    commune: p.city,
    codeDepartement: departementDeCommune(p.citycode),
    lon: geometry.coordinates[0],
    lat: geometry.coordinates[1],
    type: p.type,
    score: p.score,
  };
}

export async function chercherAdresses(q: string, limite = 5, f: typeof fetch = fetch): Promise<AdresseDetaillee[]> {
  if (q.trim().length < 3) return [];
  const params = new URLSearchParams({ q, limit: String(limite) });
  let erreur: unknown = null;
  for (const base of URLS_GEOCODAGE) {
    try {
      const res = await f(`${base}?${params}`);
      if (!res.ok) throw new Error(`Géocodage : ${res.status}`);
      const { features } = (await res.json()) as { features: Feature[] };
      return features.map(lireFeature);
    } catch (e) {
      erreur = e;
    }
  }
  throw erreur instanceof Error ? erreur : new Error("Service d'adresses indisponible");
}
