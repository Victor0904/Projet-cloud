import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

const classeChamp =
  "mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700";

type Commun = { label: string; aide?: string };

function Entete({ id, label, aide }: Commun & { id: string }) {
  return (
    <>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {aide && (
        <p id={`${id}-aide`} className="text-sm text-gray-600">
          {aide}
        </p>
      )}
    </>
  );
}

/** Champ de saisie avec label associé et texte d'aide optionnel. */
export function Champ({ label, aide, ...props }: Commun & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="mb-4">
      <Entete id={id} label={label} aide={aide} />
      <input id={id} aria-describedby={aide ? `${id}-aide` : undefined} className={classeChamp} {...props} />
    </div>
  );
}

/** Liste déroulante ; `options` = [valeur, libellé]. */
export function ChampSelect({
  label,
  aide,
  options,
  ...props
}: Commun & { options: [string, string][] } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="mb-4">
      <Entete id={id} label={label} aide={aide} />
      <select id={id} aria-describedby={aide ? `${id}-aide` : undefined} className={classeChamp} {...props}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
