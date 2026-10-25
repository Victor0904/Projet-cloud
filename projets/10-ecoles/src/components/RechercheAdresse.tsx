"use client";

import { useId, useState, type FormEvent } from "react";
import { chercherAdresses, type AdresseDetaillee } from "@/lib/adresse";

/** Saisie d'adresse : on tape, on valide, on choisit parmi les propositions du géocodeur public. */
export function RechercheAdresse({
  onChoix,
  valeurInitiale = "",
}: {
  onChoix: (a: AdresseDetaillee) => void;
  valeurInitiale?: string;
}) {
  const id = useId();
  const [q, setQ] = useState(valeurInitiale);
  const [propositions, setPropositions] = useState<AdresseDetaillee[]>([]);
  const [etat, setEtat] = useState<"repos" | "recherche" | "vide" | "erreur">("repos");

  async function rechercher(ev: FormEvent) {
    ev.preventDefault();
    setEtat("recherche");
    try {
      const res = await chercherAdresses(q, 5);
      setPropositions(res);
      setEtat(res.length ? "repos" : "vide");
    } catch {
      setPropositions([]);
      setEtat("erreur");
    }
  }

  return (
    <div className="print:hidden">
      <form onSubmit={rechercher} className="flex flex-col gap-2 sm:flex-row sm:items-end" role="search">
        <div className="flex-1">
          <label htmlFor={id} className="block font-medium">
            Votre adresse
          </label>
          <p id={`${id}-aide`} className="text-sm text-gray-600">
            Numéro, rue et ville, par exemple « 1 place Stanislas, Nancy ». Le numéro sert à trouver le collège de secteur.
          </p>
          <input
            id={id}
            aria-describedby={`${id}-aide`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="street-address"
            className="mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700"
          />
        </div>
        <button
          type="submit"
          disabled={q.trim().length < 3 || etat === "recherche"}
          className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 disabled:opacity-50"
        >
          {etat === "recherche" ? "Recherche…" : "Rechercher"}
        </button>
      </form>
      <div aria-live="polite">
        {etat === "vide" && <p className="mt-2 text-sm">Aucune adresse trouvée. Vérifiez l&apos;orthographe ou ajoutez la ville.</p>}
        {etat === "erreur" && (
          <p className="mt-2 text-sm text-red-800">
            Le service d&apos;adresses public ne répond pas. Réessayez dans quelques instants.
          </p>
        )}
        {propositions.length > 0 && (
          <ul className="mt-2 divide-y rounded border" aria-label="Adresses proposées">
            {propositions.map((p) => (
              <li key={`${p.label}-${p.lat}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPropositions([]);
                    setQ(p.label);
                    onChoix(p);
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-2 focus:outline-blue-700"
                >
                  {p.label}
                  {p.type !== "housenumber" && (
                    <span className="ml-2 text-xs text-gray-600">(sans numéro : secteur moins précis)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
