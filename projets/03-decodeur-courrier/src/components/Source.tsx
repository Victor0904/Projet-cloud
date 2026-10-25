import type { Statut } from "@/donnees/types";

const LIBELLES: Record<Statut, { texte: string; classe: string }> = {
  verifie: { texte: "Vérifié", classe: "bg-green-100 text-green-900" },
  recoupe: { texte: "Recoupé (texte officiel à confirmer)", classe: "bg-blue-100 text-blue-900" },
  A_VERIFIER: { texte: "À vérifier", classe: "bg-amber-100 text-amber-900" },
};

/** Source et date de vérification d'une valeur (règle commune : tout chiffre affiche sa source). */
export function Source({
  source,
  verifieLe,
  statut,
  reference,
}: {
  source: string;
  verifieLe: string;
  statut: Statut;
  reference?: string;
}) {
  const l = LIBELLES[statut];
  const estUrl = /^https?:\/\//.test(source);
  return (
    <p className="mt-1 text-xs text-gray-700">
      <span className={`mr-1 rounded px-1.5 py-0.5 font-medium ${l.classe}`}>{l.texte}</span>
      {reference && <span className="mr-1">{reference}.</span>}
      Source :{" "}
      {estUrl ? (
        <a href={source} target="_blank" rel="noreferrer" className="break-all underline">
          {new URL(source).hostname}
        </a>
      ) : (
        source
      )}
      {" — "}
      {verifieLe === "A_VERIFIER" ? "non vérifié (A_VERIFIER)" : `vérifié le ${verifieLe.split("-").reverse().join("/")}`}
    </p>
  );
}
