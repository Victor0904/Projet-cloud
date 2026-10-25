import type { TypeCourrier } from "@/donnees/types";
import { contactsDe } from "@/decodeur";
import { Source } from "./Source";

export function Orientation({ type }: { type: TypeCourrier }) {
  const contacts = contactsDe(type);
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {contacts.map((c) => (
        <li key={c.id} className="rounded border p-3">
          <p className="font-bold">
            <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-900 underline">
              {c.nom}
            </a>
          </p>
          <p className="text-sm">{c.role}</p>
          <Source source={c.url} verifieLe={c.verifie_le} statut={c.statut} />
        </li>
      ))}
    </ul>
  );
}
