import type { ReactNode } from "react";

/** Mise en page commune : bandeau, contenu centré, pied de page avec la mention de confidentialité. */
export function Gabarit({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white">
        Aller au contenu
      </a>
      <header className="border-b-4 border-blue-900 print:border-b">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-900">Vie FR</p>
          <h1 className="text-2xl font-bold">{titre}</h1>
          {sousTitre && <p className="text-gray-700">{sousTitre}</p>}
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t bg-gray-50 text-sm text-gray-700 print:bg-white">
        <div className="mx-auto max-w-3xl space-y-1 px-4 py-4">
          <p>
            <strong>Vos données restent sur votre appareil.</strong> Rien n&apos;est envoyé à un serveur : tout est
            calculé et enregistré dans votre navigateur.
          </p>
          <p>Outil d&apos;estimation : il ne remplace pas la démarche officielle ni l&apos;avis d&apos;un professionnel.</p>
        </div>
      </footer>
    </div>
  );
}
