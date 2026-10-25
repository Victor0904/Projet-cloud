"use client";

import { useId, type ReactNode } from "react";

const classeChamp =
  "mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700";

/** Champ numérique en euros ou en années : vide = null. */
export function ChampNombre({
  label,
  aide,
  valeur,
  onChange,
  min = 0,
  max,
  suffixe,
  requis,
}: {
  label: string;
  aide?: string;
  valeur: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  suffixe?: string;
  requis?: boolean;
}) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block font-medium">
        {label}
        {requis && <span className="text-red-800"> *</span>}
      </label>
      {aide && (
        <p id={`${id}-aide`} className="text-sm text-gray-700">
          {aide}
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step="any"
          required={requis}
          aria-describedby={aide ? `${id}-aide` : undefined}
          className={classeChamp + " max-w-xs"}
          value={valeur ?? ""}
          onChange={(e) => {
            const t = e.target.value;
            if (t === "") return onChange(null);
            const v = Number(t);
            if (Number.isFinite(v)) onChange(v);
          }}
        />
        {suffixe && <span className="text-gray-700">{suffixe}</span>}
      </div>
    </div>
  );
}

export function ChampChoix<T extends string>({
  legende,
  aide,
  options,
  valeur,
  onChange,
}: {
  legende: string;
  aide?: string;
  options: [T, string][];
  valeur: T | null;
  onChange: (v: T) => void;
}) {
  const nom = useId();
  return (
    <fieldset className="mb-4">
      <legend className="font-medium">{legende}</legend>
      {aide && <p className="text-sm text-gray-700">{aide}</p>}
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <label
            key={v}
            className={`cursor-pointer rounded border-2 px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-700 ${
              valeur === v ? "border-blue-900 bg-blue-50 font-medium" : "border-gray-300"
            }`}
          >
            <input type="radio" className="sr-only" name={nom} value={v} checked={valeur === v} onChange={() => onChange(v)} />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CaseACocher({ label, aide, coche, onChange }: { label: string; aide?: string; coche: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="mb-3 flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-1 h-5 w-5 accent-blue-900" checked={coche} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        {label}
        {aide && <span className="block text-sm text-gray-700">{aide}</span>}
      </label>
    </div>
  );
}

export function Bouton({
  children,
  onClick,
  secondaire,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondaire?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded px-4 py-2 font-medium focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 print:hidden ${
        secondaire ? "border-2 border-blue-900 text-blue-900 hover:bg-blue-50" : "bg-blue-900 text-white hover:bg-blue-800"
      }`}
    >
      {children}
    </button>
  );
}
