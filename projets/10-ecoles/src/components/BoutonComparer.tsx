"use client";

import { useEffect, useState } from "react";
import { basculer, lireSelection, MAX_COMPARAISON } from "@/lib/selection";

export function useSelection(): string[] {
  const [liste, setListe] = useState<string[]>([]);
  useEffect(() => {
    const maj = () => setListe(lireSelection());
    maj();
    window.addEventListener("selection-modifiee", maj);
    window.addEventListener("storage", maj);
    return () => {
      window.removeEventListener("selection-modifiee", maj);
      window.removeEventListener("storage", maj);
    };
  }, []);
  return liste;
}

export function BoutonComparer({ uai, nom }: { uai: string; nom: string }) {
  const liste = useSelection();
  const [refus, setRefus] = useState(false);
  const choisi = liste.includes(uai);
  return (
    <span className="print:hidden">
      <button
        type="button"
        aria-pressed={choisi}
        onClick={() => setRefus(basculer(uai).refuse)}
        className={`rounded border px-3 py-1 text-sm font-medium focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 ${
          choisi ? "border-blue-900 bg-blue-900 text-white" : "border-blue-900 text-blue-900 hover:bg-blue-50"
        }`}
      >
        {choisi ? "✓ Dans la comparaison" : "Comparer"}
        <span className="sr-only"> {nom}</span>
      </button>
      {refus && (
        <span role="alert" className="ml-2 text-sm text-red-800">
          {MAX_COMPARAISON} établissements au maximum : retirez-en un d&apos;abord.
        </span>
      )}
    </span>
  );
}
