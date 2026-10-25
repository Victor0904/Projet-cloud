"use client";

import { useEffect, useState } from "react";
import type { AdresseDetaillee } from "@/lib/adresse";
import { chargerDepartement, chargerIndex, chargerSecteurs, departementParCode } from "@/lib/donnees";
import { trouverSecteur, type ResultatSecteur } from "@/lib/secteur";
import type { FichierDepartement, FichierSecteurs, IndexDonnees } from "@/lib/types";

export type EtatDonnees =
  | { etat: "attente" }
  | { etat: "chargement" }
  | { etat: "hors_couverture"; index: IndexDonnees }
  | { etat: "erreur"; message: string }
  | {
      etat: "pret";
      fichier: FichierDepartement;
      carte: FichierSecteurs | null;
      secteur: ResultatSecteur;
    };

/** Charge le fichier du département de l'adresse (à la demande) et calcule le secteur. */
export function useDonneesAdresse(adresse: AdresseDetaillee | null): EtatDonnees {
  const [etat, setEtat] = useState<EtatDonnees>({ etat: "attente" });
  useEffect(() => {
    if (!adresse) {
      setEtat({ etat: "attente" });
      return;
    }
    let annule = false;
    setEtat({ etat: "chargement" });
    (async () => {
      const index = await chargerIndex();
      const dep = departementParCode(index, adresse.codeDepartement);
      if (!dep) return { etat: "hors_couverture", index } as const;
      const [fichier, carte] = await Promise.all([chargerDepartement(dep.code3), chargerSecteurs(dep)]);
      return { etat: "pret", fichier, carte, secteur: trouverSecteur(carte, adresse) } as const;
    })()
      .then((r) => !annule && setEtat(r))
      .catch((e: unknown) => !annule && setEtat({ etat: "erreur", message: e instanceof Error ? e.message : String(e) }));
    return () => {
      annule = true;
    };
  }, [adresse]);
  return etat;
}
