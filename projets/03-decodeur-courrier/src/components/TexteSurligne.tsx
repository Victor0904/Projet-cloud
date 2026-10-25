"use client";

import { useMemo, useState } from "react";
import type { TermeGlossaire } from "@/donnees/types";
import { decouper } from "@/glossaire/reperer";

/** Mode « je ne comprends toujours pas » : le texte du courrier avec les termes difficiles surlignés.
 * Chaque terme est un bouton (accessible au clavier) qui affiche sa définition. */
export function TexteSurligne({ texte }: { texte: string }) {
  const segments = useMemo(() => decouper(texte), [texte]);
  const termes = useMemo(() => {
    const m = new Map<string, TermeGlossaire>();
    for (const s of segments) if (s.terme) m.set(s.terme.id, s.terme);
    return [...m.values()];
  }, [segments]);
  const [actif, setActif] = useState<string | null>(null);
  const terme = termes.find((t) => t.id === actif);

  if (termes.length === 0) {
    return <p>Aucun terme du glossaire n&apos;a été repéré dans ce courrier.</p>;
  }

  return (
    <div>
      <p className="text-sm text-gray-700">
        {termes.length} terme{termes.length > 1 ? "s" : ""} repéré{termes.length > 1 ? "s" : ""}. Cliquez sur un mot
        surligné pour l&apos;expliquer.
      </p>
      <div aria-live="polite" className="sticky top-0 z-10 my-2 min-h-12 border-l-4 border-amber-500 bg-amber-50 p-3">
        {terme ? (
          <p>
            <strong>{terme.terme}</strong> : {terme.definition}
          </p>
        ) : (
          <p className="text-gray-700">La définition s&apos;affichera ici.</p>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded border bg-white p-3 font-mono text-sm leading-relaxed">
        {segments.map((s, i) =>
          s.terme ? (
            <button
              key={i}
              type="button"
              onClick={() => setActif(s.terme!.id)}
              aria-pressed={actif === s.terme.id}
              className={`rounded px-0.5 underline decoration-dotted focus:outline-2 focus:outline-blue-700 ${
                actif === s.terme.id ? "bg-amber-400" : "bg-amber-200 hover:bg-amber-300"
              }`}
            >
              {s.texte}
            </button>
          ) : (
            <span key={i}>{s.texte}</span>
          ),
        )}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer underline">Voir toutes les définitions repérées</summary>
        <dl className="mt-2 space-y-2">
          {termes.map((t) => (
            <div key={t.id}>
              <dt className="font-bold">{t.terme}</dt>
              <dd>{t.definition}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
