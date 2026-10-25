import type { ReactNode } from "react";
import { Gabarit } from "@vie-fr/ui";
import { Navigation } from "./ui";

const TITRE = "Mes délais : les échéances qu'on oublie";
const SOUS_TITRE = "Contrôle technique, papiers, impôts, logement, contrats : toutes vos dates limites au même endroit.";

export function Page({ actif, titre, children }: { actif: string; titre?: string; children: ReactNode }) {
  return (
    <Gabarit titre={TITRE} sousTitre={SOUS_TITRE}>
      <Navigation actif={actif} />
      {titre && <h2 className="mb-4 text-2xl font-bold">{titre}</h2>}
      {children}
    </Gabarit>
  );
}
