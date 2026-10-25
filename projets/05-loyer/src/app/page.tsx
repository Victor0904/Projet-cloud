import { Gabarit } from "@vie-fr/ui";
import { Application } from "../composants/Application";
import { REGLES } from "../lib/analyse";

export default function Accueil() {
  const fin = REGLES.fin_experimentation;
  return (
    <Gabarit titre="Mon loyer est-il trop cher ?" sousTitre="Vérifiez l'encadrement des loyers et réclamez le trop-perçu">
      <Application />
      <aside className="mt-8 border-l-4 border-gray-400 bg-gray-50 p-3 text-sm print:hidden" aria-label="Fin de l'expérimentation">
        <p>
          <strong>Bon à savoir :</strong> {fin.texte}{" "}
          <a href={fin.source} className="underline" target="_blank" rel="noreferrer">
            Source
          </a>{" "}
          (vérifié le {fin.verifie_le.split("-").reverse().join("/")}, à confirmer).
        </p>
      </aside>
    </Gabarit>
  );
}
