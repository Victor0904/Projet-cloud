"use client";

import { useEffect, useId, useState } from "react";
import type { Commune } from "../moteur";
import { departementDe, listeDepartements } from "../moteur/outils";

// Géocodage de la Géoplateforme IGN (successeur de l'API Adresse), sans clé, limité aux communes.
const API = "https://data.geopf.fr/geocodage/search";

type Feature = { properties: { city?: string; name: string; citycode: string; postcode?: string; context?: string } };

async function chercherCommunes(q: string, signal: AbortSignal): Promise<Commune[]> {
  const res = await fetch(`${API}?${new URLSearchParams({ q, type: "municipality", limit: "6" })}`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const { features } = (await res.json()) as { features: Feature[] };
  return features.map(({ properties: p }) => ({
    codeInsee: p.citycode,
    nom: p.city ?? p.name,
    codePostal: p.postcode,
    codeDepartement: p.context?.split(",")[0]?.trim() || departementDe(p.citycode),
  }));
}

/** Recherche de commune (seul le nom de commune est envoyé à l'API, aucune autre donnée). */
export function ChampCommune({ valeur, onChange }: { valeur: Commune | null; onChange: (c: Commune | null) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<Commune[]>([]);
  const [erreur, setErreur] = useState(false);
  const [manuel, setManuel] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultats([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      chercherCommunes(q, ctrl.signal)
        .then((r) => {
          setResultats(r);
          setErreur(false);
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setErreur(true);
        });
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (valeur && (valeur.codeInsee || valeur.codeDepartement)) {
    return (
      <div className="mb-4">
        <p className="font-medium">Commune du logement</p>
        <p className="flex flex-wrap items-center gap-3">
          <span>
            {valeur.nom || `Département ${valeur.codeDepartement}`}
            {valeur.codePostal ? ` (${valeur.codePostal})` : valeur.codeInsee ? "" : " — commune non précisée"}
          </span>
          <button type="button" className="text-blue-900 underline" onClick={() => onChange(null)}>
            Changer
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block font-medium">
        Commune du logement
      </label>
      <p id={`${id}-aide`} className="text-sm text-gray-700">
        Sert à connaître la zone de loyer (aides au logement) et l&apos;Île-de-France (MaPrimeRénov&apos;). Tapez le nom ou le code postal.
      </p>
      {!manuel && (
        <>
          <input
            id={id}
            type="search"
            autoComplete="off"
            aria-describedby={`${id}-aide`}
            aria-controls={`${id}-liste`}
            className="mt-1 block w-full max-w-md rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul id={`${id}-liste`} aria-live="polite" className="mt-1 max-w-md">
            {resultats.map((c) => (
              <li key={c.codeInsee + (c.codePostal ?? "")}>
                <button
                  type="button"
                  className="w-full border-b px-3 py-2 text-left hover:bg-blue-50 focus:outline-2 focus:outline-blue-700"
                  onClick={() => onChange(c)}
                >
                  {c.nom} {c.codePostal && <span className="text-gray-700">({c.codePostal})</span>}
                </button>
              </li>
            ))}
          </ul>
          {erreur && <p className="text-sm text-red-800">Recherche indisponible (pas de connexion ?). Choisissez plutôt votre département.</p>}
          <button type="button" className="mt-2 text-sm text-blue-900 underline" onClick={() => setManuel(true)}>
            Je préfère indiquer seulement mon département
          </button>
        </>
      )}
      {manuel && (
        <select
          id={id}
          className="mt-1 block w-full max-w-xs rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2"
          defaultValue=""
          onChange={(e) => e.target.value && onChange({ codeInsee: "", nom: `Département ${e.target.value}`, codeDepartement: e.target.value })}
        >
          <option value="">Choisir un département</option>
          {listeDepartements.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
