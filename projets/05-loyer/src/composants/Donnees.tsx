"use client";

import { useRef, useState } from "react";
import { SAISIE_VIDE, type Saisie } from "../lib/saisie";

/** Export / import JSON de la saisie, et effacement des données stockées dans le navigateur. */
export function Donnees({ saisie, setSaisie, cle }: { saisie: Saisie; setSaisie: (s: Saisie) => void; cle: string }) {
  const fichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  function exporter() {
    const blob = new Blob([JSON.stringify({ application: "05-loyer", version: 1, saisie }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mon-loyer.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importer(f: File) {
    try {
      const d = JSON.parse(await f.text()) as { application?: string; saisie?: Partial<Saisie> };
      if (d.application !== "05-loyer" || !d.saisie) throw new Error();
      setSaisie({ ...SAISIE_VIDE, ...d.saisie });
      setMessage("Données importées. Cliquez sur « Vérifier mon loyer ».");
    } catch {
      setMessage("Ce fichier n'est pas un export de cet outil.");
    }
  }

  function effacer() {
    try {
      localStorage.removeItem(cle);
      localStorage.removeItem("vie-fr/05-loyer/lettre");
    } catch {
      /* stockage indisponible */
    }
    setSaisie(SAISIE_VIDE);
    setMessage("Données effacées de ce navigateur.");
  }

  const bouton = "rounded border border-gray-500 px-3 py-1 text-sm hover:bg-gray-100 focus:outline-2 focus:outline-blue-700";
  return (
    <section aria-label="Mes données" className="mt-10 border-t pt-4 print:hidden">
      <p className="text-sm text-gray-700">Votre saisie est enregistrée dans ce navigateur uniquement.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={exporter} className={bouton}>
          Exporter (JSON)
        </button>
        <button type="button" onClick={() => fichier.current?.click()} className={bouton}>
          Importer
        </button>
        <button type="button" onClick={effacer} className={bouton}>
          Effacer mes données
        </button>
        <input
          ref={fichier}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Fichier à importer"
          onChange={(e) => e.target.files?.[0] && void importer(e.target.files[0])}
        />
      </div>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
