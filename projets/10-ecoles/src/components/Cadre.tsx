import Link from "next/link";
import type { ReactNode } from "react";

const LIENS: [string, string][] = [
  ["/", "Autour de chez moi"],
  ["/secteur", "Mon secteur et dérogations"],
  ["/comparer", "Comparer"],
  ["/a-propos", "Sources et méthode"],
];

/**
 * Mise en page de l'application. Reprend le gabarit commun de @vie-fr/ui (bandeau, pied de page avec la
 * mention de confidentialité) mais en plus large, pour la carte et les tableaux de comparaison.
 */
export function Cadre({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:bg-white focus:p-2">
        Aller au contenu
      </a>
      <header className="border-b-4 border-blue-900 print:border-b">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-900">Vie FR · Écoles</p>
          <h1 className="text-2xl font-bold">{titre}</h1>
          {sousTitre && <p className="text-gray-700">{sousTitre}</p>}
          <nav aria-label="Navigation principale" className="mt-3 print:hidden">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {LIENS.map(([href, libelle]) => (
                <li key={href}>
                  <Link href={href} className="text-blue-900 underline underline-offset-4 hover:no-underline">
                    {libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t bg-gray-50 text-sm text-gray-700 print:bg-white">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-4">
          <p>
            <strong>Vos données restent sur votre appareil.</strong> L&apos;adresse saisie est envoyée uniquement au
            service public de géocodage (Géoplateforme IGN) pour la situer ; votre sélection est gardée dans votre
            navigateur. Rien n&apos;est envoyé à un autre serveur.
          </p>
          <p>
            Données ouvertes du ministère de l&apos;Éducation nationale (data.education.gouv.fr). Outil
            d&apos;information : il ne remplace ni la démarche officielle d&apos;inscription ou de dérogation, ni
            l&apos;échange avec l&apos;établissement.
          </p>
        </div>
      </footer>
    </div>
  );
}
