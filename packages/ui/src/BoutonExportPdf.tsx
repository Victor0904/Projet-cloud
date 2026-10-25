"use client";

// Export PDF par l'impression du navigateur (« Enregistrer au format PDF ») : aucun service externe.
// Masquer ce qui ne doit pas être imprimé avec la classe Tailwind `print:hidden`.
export function BoutonExportPdf({ libelle = "Télécharger en PDF" }: { libelle?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 print:hidden"
    >
      {libelle}
    </button>
  );
}
