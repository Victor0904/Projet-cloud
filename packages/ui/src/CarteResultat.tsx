import type { ReactNode } from "react";

/** Résultat chiffré : toujours accompagné de sa source et de sa date de vérification (règle commune). */
export function CarteResultat({
  titre,
  valeur,
  source,
  verifieLe,
  children,
}: {
  titre: string;
  valeur: ReactNode;
  source: string;
  verifieLe: string;
  children?: ReactNode;
}) {
  return (
    <section aria-label={titre} className="my-4 border-l-4 border-blue-900 bg-blue-50 p-4 break-inside-avoid">
      <h2 className="font-medium">{titre}</h2>
      <p className="text-3xl font-bold text-blue-900">{valeur}</p>
      {children && <div className="mt-2">{children}</div>}
      <p className="mt-2 text-xs text-gray-600">
        Source :{" "}
        <a href={source} className="underline" target="_blank" rel="noreferrer">
          {source}
        </a>{" "}
        — vérifié le {verifieLe}. Estimation indicative.
      </p>
    </section>
  );
}
