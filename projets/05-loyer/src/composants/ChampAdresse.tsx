"use client";

import { chercherAdresse, type Adresse } from "@vie-fr/fr-data";
import { useEffect, useId, useState } from "react";

/** Saisie d'adresse avec suggestions de la Base Adresse Nationale (Géoplateforme IGN). */
export function ChampAdresse({
  valeur,
  choisie,
  onTexte,
  onChoix,
}: {
  valeur: string;
  choisie: Adresse | null;
  onTexte: (t: string) => void;
  onChoix: (a: Adresse) => void;
}) {
  const id = useId();
  const [suggestions, setSuggestions] = useState<Adresse[]>([]);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (choisie && choisie.label === valeur) {
      setSuggestions([]);
      return;
    }
    if (valeur.trim().length < 5) {
      setSuggestions([]);
      return;
    }
    let annule = false;
    const t = setTimeout(() => {
      chercherAdresse(valeur, 5)
        .then((r) => {
          if (!annule) {
            setSuggestions(r);
            setErreur(false);
          }
        })
        .catch(() => !annule && setErreur(true));
    }, 300);
    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, [valeur, choisie]);

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block font-medium">
        Adresse du logement
      </label>
      <p id={`${id}-aide`} className="text-sm text-gray-600">
        Tapez l&apos;adresse puis choisissez-la dans la liste. Elle sert seulement à trouver le secteur de loyers.
      </p>
      <input
        id={id}
        type="text"
        autoComplete="street-address"
        aria-describedby={`${id}-aide`}
        value={valeur}
        onChange={(e) => onTexte(e.target.value)}
        className="mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700"
      />
      {erreur && (
        <p role="alert" className="mt-1 text-sm text-red-800">
          Le service d&apos;adresses ne répond pas. Réessayez, ou choisissez votre ville plus bas.
        </p>
      )}
      {suggestions.length > 0 && (
        <ul aria-label="Adresses proposées" className="mt-1 divide-y border border-gray-300 bg-white">
          {suggestions.map((s) => (
            <li key={`${s.label}-${s.lon}`}>
              <button
                type="button"
                onClick={() => {
                  onChoix(s);
                  setSuggestions([]);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-2 focus:outline-blue-700"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {choisie && choisie.label === valeur && (
        <p className="mt-1 text-sm text-green-800">✓ Adresse reconnue : {choisie.ville}</p>
      )}
    </div>
  );
}
