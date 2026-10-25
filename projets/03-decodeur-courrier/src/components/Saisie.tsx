"use client";

import { useId, useState } from "react";
import exemplesJson from "../../data/exemples.json";
import { extraireTextePdf } from "@/lib/pdf";

const EXEMPLES = exemplesJson.exemples;
const bouton =
  "rounded border-2 border-blue-900 px-3 py-2 font-medium text-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700";

export function Saisie({
  texte,
  onTexte,
  onDecoder,
}: {
  texte: string;
  onTexte: (t: string) => void;
  onDecoder: (t: string) => void;
}) {
  const id = useId();
  const [etatPdf, setEtatPdf] = useState<string | null>(null);

  async function importerPdf(f: File | undefined) {
    if (!f) return;
    setEtatPdf("Lecture du PDF en cours…");
    try {
      const t = await extraireTextePdf(f);
      if (t.replace(/\s/g, "").length < 30) {
        setEtatPdf(
          "Ce PDF ne contient presque pas de texte : c'est probablement un scan ou une photo. La reconnaissance d'image n'est pas disponible ; recopiez le texte dans la zone ci-dessous.",
        );
        return;
      }
      onTexte(t);
      setEtatPdf(`Texte extrait du PDF « ${f.name} » : vérifiez-le puis cliquez sur « Décoder ».`);
    } catch {
      setEtatPdf("Impossible de lire ce PDF (fichier protégé ou abîmé). Copiez-collez le texte à la place.");
    }
  }

  return (
    <section aria-labelledby={`${id}-titre`} className="print:hidden">
      <h2 id={`${id}-titre`} className="text-xl font-bold">
        1. Votre courrier
      </h2>
      <label htmlFor={`${id}-texte`} className="mt-2 block font-medium">
        Collez le texte du courrier
      </label>
      <p id={`${id}-aide`} className="text-sm text-gray-700">
        Copiez tout le courrier, en-tête compris (dates, références, montants). Vous pouvez aussi utiliser la dictée de
        votre téléphone ou importer un PDF. Le texte reste sur votre appareil.
      </p>
      <textarea
        id={`${id}-texte`}
        aria-describedby={`${id}-aide`}
        value={texte}
        onChange={(e) => onTexte(e.target.value)}
        rows={10}
        className="mt-2 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 p-3 font-mono text-sm focus:outline-2 focus:outline-blue-700"
        placeholder="Ex. : « Caisse d'allocations familiales… Objet : notification d'indu… »"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onDecoder(texte)}
          disabled={texte.trim().length < 20}
          className="rounded bg-blue-900 px-5 py-2 font-bold text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Décoder ce courrier
        </button>
        <label className={`${bouton} cursor-pointer focus-within:outline-2 focus-within:outline-blue-700`}>
          Importer un PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => importerPdf(e.target.files?.[0])}
          />
        </label>
        {texte && (
          <button type="button" className="text-sm underline" onClick={() => onTexte("")}>
            Effacer le texte
          </button>
        )}
      </div>
      {etatPdf && (
        <p role="status" className="mt-2 text-sm text-gray-800">
          {etatPdf}
        </p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm underline">Pas de courrier sous la main ? Essayer avec un exemple fictif</summary>
        <ul className="mt-2 flex flex-wrap gap-2">
          {EXEMPLES.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className={`${bouton} text-sm`}
                onClick={() => {
                  onTexte(ex.texte);
                  onDecoder(ex.texte);
                }}
              >
                {ex.titre}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
