"use client";

import { useState } from "react";
import { encoderPartage, type EtatPartage } from "../lib/partage";

/** Lien à envoyer à un proche ou une association : adresse sans numéro, saisie et résultat dans le #fragment. */
export function Partage({ etat }: { etat: EtatPartage }) {
  const [lien, setLien] = useState("");
  const [copie, setCopie] = useState(false);

  function creer() {
    const l = `${window.location.origin}${window.location.pathname}#${encoderPartage(etat)}`;
    setLien(l);
    void navigator.clipboard?.writeText(l).then(() => setCopie(true));
  }

  return (
    <section aria-labelledby="titre-partage" className="mt-8 border-t pt-6 print:hidden">
      <h2 id="titre-partage" className="text-xl font-bold">
        Partager ce résultat
      </h2>
      <p className="mt-1 text-sm">
        Le lien contient l&apos;adresse <strong>sans le numéro</strong> (« {etat.a || "commune"} »), les caractéristiques du
        logement et le résultat. Il ne contient ni votre nom ni celui du bailleur, et n&apos;est stocké sur aucun serveur.
      </p>
      <button
        type="button"
        onClick={creer}
        className="mt-3 rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
      >
        {copie ? "Lien copié ✓" : "Créer et copier le lien"}
      </button>
      {lien && (
        <div className="mt-2">
          <label htmlFor="lien-partage" className="block text-sm font-medium">
            Lien de partage
          </label>
          <input id="lien-partage" readOnly value={lien} onFocus={(e) => e.target.select()} className="mt-1 w-full border bg-gray-50 px-2 py-1 text-sm" />
        </div>
      )}
    </section>
  );
}
