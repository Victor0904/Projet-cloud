import { Champ } from "@vie-fr/ui";
import type { ReactNode } from "react";
import { dateFr } from "@/lib/affichage";

/** Champ numérique contrôlé ; `valeur` vide = champ vide. */
export function ChampNombre({
  label,
  aide,
  valeur,
  onChange,
  min = 0,
  max,
  pas = 1,
  suffixe,
}: {
  label: string;
  aide?: string;
  valeur: number | "";
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  pas?: number;
  suffixe?: string;
}) {
  return (
    <Champ
      label={suffixe ? `${label} (${suffixe})` : label}
      aide={aide}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={pas}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Section({ id, titre, intro, children }: { id: string; titre: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="mb-10 scroll-mt-4">
      <h2 id={`${id}-titre`} className="mb-2 border-b-2 border-blue-900 pb-1 text-xl font-bold">
        {titre}
      </h2>
      {intro && <div className="mb-4 text-gray-700">{intro}</div>}
      {children}
    </section>
  );
}

export function Source({ url, date, libelle = "Source" }: { url: string; date: string; libelle?: string }) {
  return (
    <p className="text-xs text-gray-600">
      {libelle} :{" "}
      <a href={url} className="break-all underline" target="_blank" rel="noreferrer">
        {url}
      </a>{" "}
      — vérifié le {dateFr(date)}.
    </p>
  );
}

export function Alerte({ children, ton = "info" }: { children: ReactNode; ton?: "info" | "attention" }) {
  const c = ton === "attention" ? "border-amber-600 bg-amber-50" : "border-blue-700 bg-blue-50";
  return <div className={`my-3 border-l-4 p-3 text-sm ${c}`}>{children}</div>;
}
