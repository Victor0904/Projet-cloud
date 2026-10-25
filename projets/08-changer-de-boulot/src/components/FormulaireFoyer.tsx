"use client";

import { ChampSelect } from "@vie-fr/ui";
import type { Contexte } from "@/paie/scenario";
import { nombreDeParts } from "@/paie/impot";
import { CaseACocher, ChampNombre, Rubrique } from "./champs";

export function FormulaireFoyer({ c, onChange }: { c: Contexte; onChange: (c: Contexte) => void }) {
  const f = c.foyer;
  const majFoyer = (p: Partial<Contexte["foyer"]>) => onChange({ ...c, foyer: { ...f, ...p } });
  return (
    <Rubrique titre={`Votre foyer fiscal (${nombreDeParts(f).toLocaleString("fr-FR")} part${nombreDeParts(f) > 1 ? "s" : ""})`}>
      <ChampSelect
        label="Situation"
        options={[
          ["seul", "Personne seule (célibataire, divorcé, veuf)"],
          ["couple", "Couple marié ou pacsé (imposition commune)"],
        ]}
        value={f.situation}
        onChange={(e) => majFoyer({ situation: e.target.value as "seul" | "couple" })}
      />
      <ChampNombre label="Enfants à charge" max={15} valeur={f.enfants} onChange={(n) => majFoyer({ enfants: n })} />
      {f.situation === "seul" && f.enfants > 0 && (
        <CaseACocher
          label="J'élève seul(e) mes enfants (parent isolé)"
          coche={f.parentIsole}
          onChange={(b) => majFoyer({ parentIsole: b })}
        />
      )}
      {f.situation === "couple" && (
        <ChampNombre
          label="Salaires nets imposables du conjoint"
          suffixe="€/an"
          aide="Le « net imposable » de ses fiches de paie, sur l'année. L'abattement de 10 % est appliqué automatiquement."
          valeur={c.revenusConjoint}
          onChange={(n) => onChange({ ...c, revenusConjoint: n })}
        />
      )}
      <ChampNombre
        label="Autres revenus imposables du foyer"
        suffixe="€/an"
        aide="Revenus fonciers, pensions… déjà nets d'abattements. Laisser 0 si aucun."
        valeur={c.autresRevenus}
        onChange={(n) => onChange({ ...c, autresRevenus: n })}
      />
    </Rubrique>
  );
}
