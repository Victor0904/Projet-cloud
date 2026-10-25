import type { SourceImport } from "@/lib/types";

/** Ligne « Source : … — données téléchargées le … » pour chaque jeu utilisé. */
export function Sources({ sources, cles }: { sources: SourceImport[]; cles?: string[] }) {
  const liste = cles ? sources.filter((s) => cles.includes(s.cle)) : sources;
  if (!liste.length) return null;
  return (
    <p className="mt-2 text-xs text-gray-600">
      Source :{" "}
      {liste.map((s, i) => (
        <span key={s.cle}>
          {i > 0 && " ; "}
          <a href={s.url} className="underline" target="_blank" rel="noreferrer">
            {s.titre}
          </a>{" "}
          (données téléchargées et vérifiées le {s.telecharge_le.split("-").reverse().join("/")})
        </span>
      ))}
      . Données publiques du ministère de l&apos;Éducation nationale ; indicateurs indicatifs.
    </p>
  );
}
