import { CONTACTS } from "@/donnees";
import type { Contact, Controle, Delai, TypeCourrier } from "@/donnees/types";
import { calculerEcheance, type Calcul } from "@/delais/calcul";
import { extraire, type Extraction, type Montant } from "@/extraction/extraire";
import { classer, type Classification } from "@/classif/classifieur";

export type Decodage = {
  classification: Classification;
  extraction: Extraction;
};

/** Analyse complète d'un texte de courrier (classification + extraction). */
export function decoder(texte: string): Decodage {
  return { classification: classer(texte), extraction: extraire(texte) };
}

export type DelaiCalcule = {
  delai: Delai;
  calcul: Calcul | null;
  /** Explication quand le calcul est impossible (date manquante). */
  manque?: string;
};

export type DatesDepart = {
  reception: Date | null;
  dateCourrier: Date | null;
  dateLimite: Date | null;
};

export function calculerDelais(type: TypeCourrier, dates: DatesDepart, alsaceMoselle = false): DelaiCalcule[] {
  return type.delais.map((delai) => {
    if (delai.depart === "date_limite_courrier") {
      if (!dates.dateLimite) return { delai, calcul: null, manque: "Aucune date limite n'a été repérée dans le texte." };
      return {
        delai,
        calcul: {
          date: dates.dateLimite,
          dateReportee: dates.dateLimite,
          etapes: ["Date reprise telle qu'elle figure dans le courrier."],
        },
      };
    }
    const depart = delai.depart === "reception" ? dates.reception : dates.dateCourrier;
    if (!depart) {
      return {
        delai,
        calcul: null,
        manque:
          delai.depart === "reception"
            ? "Indiquez la date de réception du courrier pour calculer ce délai."
            : "Aucune date de courrier repérée : indiquez-la pour calculer ce délai.",
      };
    }
    if (delai.duree === undefined || !delai.unite) return { delai, calcul: null, manque: "Durée non renseignée." };
    return {
      delai,
      calcul: calculerEcheance({ depart, duree: delai.duree, unite: delai.unite, mode: delai.mode, alsaceMoselle }),
    };
  });
}

export type AlerteControle = { controle: Controle; montant: Montant };

/** Montants qui dépassent un plafond prévu par la fiche (ex. frais de rejet > 20 €). */
export function verifierControles(type: TypeCourrier, montants: Montant[]): AlerteControle[] {
  const alertes: AlerteControle[] = [];
  for (const controle of type.controles ?? []) {
    for (const montant of montants) {
      const ctx = montant.contexte.slice(-40);
      if (controle.contexte.some((c) => ctx.includes(c)) && montant.valeur > controle.plafond) {
        alertes.push({ controle, montant });
      }
    }
  }
  return alertes;
}

export const contactsDe = (type: TypeCourrier): Contact[] =>
  type.contacts.map((id) => CONTACTS.find((c) => c.id === id)).filter((c): c is Contact => !!c);
