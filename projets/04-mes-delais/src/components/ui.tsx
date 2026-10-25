// Petits éléments d'interface propres à ce projet (boutons, badges, navigation).
// Candidats au partage dans packages/ui : voir JOURNAL.md.
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LIBELLE_URGENCE, type Urgence } from "@/lib/calcul";

const base =
  "inline-flex items-center justify-center gap-1 rounded px-4 py-2 font-medium focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 disabled:opacity-50";

export const classeBouton = {
  primaire: `${base} bg-blue-900 text-white hover:bg-blue-800`,
  secondaire: `${base} border border-blue-900 bg-white text-blue-900 hover:bg-blue-50`,
  discret: `${base} px-2 py-1 text-blue-900 underline hover:bg-blue-50`,
  danger: `${base} border border-red-800 bg-white text-red-800 hover:bg-red-50`,
};

export function Bouton({
  variante = "primaire",
  className = "",
  ...props
}: { variante?: keyof typeof classeBouton } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${classeBouton[variante]} ${className}`} {...props} />;
}

const STYLE_BADGE: Record<Urgence, string> = {
  depasse: "bg-red-700 text-white",
  moins30: "bg-orange-200 text-orange-950",
  moins90: "bg-yellow-100 text-yellow-950 border border-yellow-700",
  plus_tard: "bg-gray-100 text-gray-800 border border-gray-400",
  aucune: "bg-gray-100 text-gray-700",
};

export function BadgeUrgence({ urgence }: { urgence: Urgence }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-bold uppercase ${STYLE_BADGE[urgence]}`}>
      {LIBELLE_URGENCE[urgence]}
    </span>
  );
}

export function BadgeStatut({ statut }: { statut: string }) {
  if (statut !== "A_VERIFIER") return null;
  return (
    <span className="ml-1 inline-block rounded border border-purple-800 px-1.5 text-xs font-bold text-purple-900">
      À VÉRIFIER
    </span>
  );
}

const LIENS: [string, string][] = [
  ["/", "Tableau de bord"],
  ["/ajouter", "Ajouter"],
  ["/foyer", "Mon foyer"],
  ["/rappels", "Rappels et sauvegarde"],
  ["/catalogue", "Catalogue des règles"],
];

export function Navigation({ actif }: { actif: string }) {
  return (
    <nav aria-label="Menu principal" className="mb-6 border-b border-gray-300 print:hidden">
      <ul className="-mb-px flex flex-wrap gap-x-1 text-sm">
        {LIENS.map(([href, libelle]) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={actif === href ? "page" : undefined}
              className={`inline-block border-b-4 px-2 py-2 hover:bg-blue-50 focus:outline-2 focus:outline-blue-700 ${
                actif === href ? "border-blue-900 font-bold text-blue-900" : "border-transparent text-gray-800"
              }`}
            >
              {libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Encadre({ titre, children, ton = "info" }: { titre?: string; children: ReactNode; ton?: "info" | "alerte" }) {
  const c = ton === "alerte" ? "border-orange-700 bg-orange-50" : "border-blue-900 bg-blue-50";
  return (
    <div className={`my-4 border-l-4 p-4 ${c}`}>
      {titre && <p className="font-bold">{titre}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function Chargement() {
  return <p className="text-gray-700">Chargement de vos échéances…</p>;
}
