// Petits composants d'interface propres à ce projet (sobres, accessibles, inspirés du DSFR).
import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { StatutDonnee } from "../lib/donnees";
import { isoVersDate, dateLongue } from "../lib/dates";

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "principal" | "secondaire" | "lien" }) {
  const styles = {
    principal: "bg-blue-900 text-white hover:bg-blue-800 px-4 py-2",
    secondaire: "border border-blue-900 text-blue-900 bg-white hover:bg-blue-50 px-4 py-2",
    lien: "text-blue-900 underline hover:no-underline px-0 py-0",
  }[variante];
  return (
    <button
      type="button"
      className={`rounded font-medium focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 disabled:opacity-50 print:hidden ${styles} ${className}`}
      {...props}
    />
  );
}

/** Mention de la source, de la date de vérification et de l'éventuel statut « à vérifier ». */
export function Source({ source, verifieLe, statut }: { source: string; verifieLe: string; statut: StatutDonnee }) {
  const d = isoVersDate(verifieLe);
  return (
    <p className="mt-1 text-xs text-gray-600">
      Source :{" "}
      <a href={source} className="underline break-all" target="_blank" rel="noreferrer">
        {source.replace(/^https:\/\/(www\.)?/, "")}
      </a>{" "}
      — {statut === "conseil_outil" ? "repère proposé par l'outil, " : ""}
      {statut === "verifie" ? "vérifié" : "consulté"} le {d ? dateLongue(d) : verifieLe}
      {statut === "A_VERIFIER" && (
        <span className="ml-1 rounded bg-amber-100 px-1 font-medium text-amber-900">
          à confirmer sur le site officiel
        </span>
      )}
    </p>
  );
}

export function Encart({
  titre,
  children,
  ton = "info",
}: {
  titre?: string;
  children: ReactNode;
  ton?: "info" | "attention";
}) {
  const cls = ton === "info" ? "border-blue-900 bg-blue-50" : "border-amber-700 bg-amber-50";
  return (
    <div className={`my-4 border-l-4 p-4 ${cls} break-inside-avoid`}>
      {titre && <p className="font-bold">{titre}</p>}
      <div className="text-gray-900">{children}</div>
    </div>
  );
}

export function GroupeChoix<T extends string>({
  legende,
  aide,
  nom,
  valeur,
  options,
  onChange,
}: {
  legende: string;
  aide?: string;
  nom: string;
  valeur: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <fieldset className="mb-6" aria-describedby={aide ? `${id}-aide` : undefined}>
      <legend className="font-medium">{legende}</legend>
      {aide && (
        <p id={`${id}-aide`} className="text-sm text-gray-600">
          {aide}
        </p>
      )}
      <div className="mt-2 space-y-1">
        {options.map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-gray-100">
            <input
              type="radio"
              name={nom}
              value={v}
              checked={valeur === v}
              onChange={() => onChange(v)}
              className="mt-1 h-4 w-4 accent-blue-900"
            />
            <span>{l}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function OuiNon({
  legende,
  aide,
  nom,
  valeur,
  onChange,
}: {
  legende: string;
  aide?: string;
  nom: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <GroupeChoix
      legende={legende}
      aide={aide}
      nom={nom}
      valeur={valeur ? "oui" : "non"}
      options={[
        ["oui", "Oui"],
        ["non", "Non"],
      ]}
      onChange={(v) => onChange(v === "oui")}
    />
  );
}

export const classeChamp =
  "mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700";

export function ZoneTexte({
  label,
  valeur,
  onChange,
  lignes = 2,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  lignes?: number;
}) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={lignes}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className={classeChamp}
      />
    </div>
  );
}
