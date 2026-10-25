"use client";

import type { QuestionId, Situation } from "../moteur";
import { ChampCommune } from "./ChampCommune";
import { ChampChoix, ChampNombre } from "./champs";

type Maj = (f: (s: Situation) => void) => void;

const ouiNon = (v: boolean | null): "oui" | "non" | null => (v === null ? null : v ? "oui" : "non");

/** Question complémentaire affichée directement dans la carte d'une aide « à vérifier ». */
export function QuestionInline({ id, s, maj }: { id: QuestionId; s: Situation; maj: Maj }) {
  const c = s.complements;
  switch (id) {
    case "rfr":
      return (
        <ChampNombre
          label="Revenu fiscal de référence du foyer"
          aide="Première page de votre dernier avis d'impôt. Améliore la précision de l'estimation."
          valeur={c.rfr}
          suffixe="€ / an"
          onChange={(v) => maj((x) => void (x.complements.rfr = v))}
        />
      );
    case "rfrParents":
      return (
        <ChampNombre
          label="Revenu brut global de vos parents"
          aide="Ligne « revenu brut global » de l'avis d'impôt de vos parents (revenus de l'avant-dernière année)."
          valeur={c.rfrParents}
          suffixe="€ / an"
          onChange={(v) => maj((x) => void (x.complements.rfrParents = v))}
        />
      );
    case "nbFreresSoeurs":
      return (
        <ChampNombre
          label="Nombre d'autres enfants à la charge de vos parents"
          aide="Vos frères et sœurs à charge, sans vous compter."
          valeur={c.nbFreresSoeurs}
          max={20}
          onChange={(v) => maj((x) => void (x.complements.nbFreresSoeurs = v === null ? null : Math.round(v)))}
        />
      );
    case "distanceEtudesKm":
      return (
        <ChampNombre
          label="Distance entre le domicile de vos parents et votre lieu d'études"
          valeur={c.distanceEtudesKm}
          suffixe="km"
          onChange={(v) => maj((x) => void (x.complements.distanceEtudesKm = v))}
        />
      );
    case "boursier":
      return (
        <ChampChoix
          legende="Êtes-vous boursier(e) ?"
          options={[
            ["oui", "Oui"],
            ["non", "Non"],
          ]}
          valeur={ouiNon(c.boursier)}
          onChange={(v) => maj((x) => void (x.complements.boursier = v === "oui"))}
        />
      );
    case "tauxHandicap":
      return (
        <ChampChoix
          legende="Taux d'incapacité reconnu par la MDPH"
          options={[
            ["80", "80 % ou plus"],
            ["50_79", "Entre 50 et 79 %"],
            ["inconnu", "Je ne sais pas / en cours"],
          ]}
          valeur={c.tauxHandicap}
          onChange={(v) => maj((x) => void (x.complements.tauxHandicap = v))}
        />
      );
    case "incidentsBancaires":
      return (
        <ChampChoix
          legende="Avez-vous eu plusieurs incidents bancaires ces 3 derniers mois ?"
          aide="Rejets de prélèvement, chèques sans provision, dépassements de découvert répétés."
          options={[
            ["oui", "Oui"],
            ["non", "Non"],
          ]}
          valeur={ouiNon(c.incidentsBancaires)}
          onChange={(v) => maj((x) => void (x.complements.incidentsBancaires = v === "oui"))}
        />
      );
    case "loyer":
      return (
        <ChampNombre
          label="Loyer mensuel hors charges"
          valeur={s.logement.loyer}
          suffixe="€ / mois"
          onChange={(v) => maj((x) => void (x.logement.loyer = v))}
        />
      );
    case "commune":
      return <ChampCommune valeur={s.logement.commune} onChange={(cm) => maj((x) => void (x.logement.commune = cm))} />;
  }
}
