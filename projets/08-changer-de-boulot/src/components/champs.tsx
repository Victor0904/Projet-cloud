"use client";

import { useId, useState } from "react";
import { Champ } from "@vie-fr/ui";

/** Champ numérique contrôlé qui tolère la saisie en cours (champ vide, virgule décimale). */
export function ChampNombre({
  label,
  aide,
  valeur,
  onChange,
  min = 0,
  max,
  pas = 1,
  pourcent = false,
  suffixe,
}: {
  label: string;
  aide?: string;
  valeur: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  pas?: number;
  /** Valeur stockée entre 0 et 1, affichée en %. */
  pourcent?: boolean;
  suffixe?: string;
}) {
  const affichee = pourcent ? Math.round(valeur * 10000) / 100 : valeur;
  const [texte, setTexte] = useState(String(affichee));
  const lu = parseFloat(texte.replace(",", "."));
  // Synchronisation si la valeur change de l'extérieur (exemple chargé, import…).
  if (!(Number.isFinite(lu) ? lu === affichee : affichee === 0)) setTexte(String(affichee));
  return (
    <Champ
      label={suffixe ? `${label} (${suffixe})` : label}
      aide={aide}
      type="text"
      inputMode="decimal"
      value={texte}
      onChange={(e) => {
        const t = e.target.value;
        setTexte(t);
        let n = parseFloat(t.replace(",", "."));
        if (!Number.isFinite(n)) n = 0;
        if (n < min) n = min;
        if (max !== undefined && n > max) n = max;
        if (pas >= 1) n = Math.round(n);
        onChange(pourcent ? n / 100 : n);
      }}
    />
  );
}

export function CaseACocher({
  label,
  aide,
  coche,
  onChange,
}: {
  label: string;
  aide?: string;
  coche: boolean;
  onChange: (b: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="mb-4 flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={aide ? `${id}-aide` : undefined}
        className="mt-1 h-5 w-5 accent-blue-900"
      />
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {aide && (
          <p id={`${id}-aide`} className="text-sm text-gray-600">
            {aide}
          </p>
        )}
      </div>
    </div>
  );
}

/** Bloc repliable de formulaire. */
export function Rubrique({ titre, ouvert = false, children }: { titre: string; ouvert?: boolean; children: React.ReactNode }) {
  return (
    <details open={ouvert} className="mb-4 rounded border border-gray-300 bg-white">
      <summary className="cursor-pointer px-4 py-3 font-bold text-blue-900 focus:outline-2 focus:outline-blue-700">
        {titre}
      </summary>
      <div className="grid gap-x-6 px-4 pb-2 sm:grid-cols-2">{children}</div>
    </details>
  );
}
