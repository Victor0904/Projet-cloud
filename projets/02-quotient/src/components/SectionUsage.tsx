"use client";

import { lireEntree } from "@/lib/affichage";
import { SEMAINES_SCOLAIRES, type Usage } from "@/lib/cout";
import { ChampNombre, Section } from "./commun";

export function SectionUsage({ usage, onChange }: { usage: Usage; onChange: (u: Usage) => void }) {
  const maj = (cle: keyof Usage, v: string, max?: number) => {
    const n = lireEntree(v);
    onChange({ ...usage, [cle]: max === undefined ? n : Math.min(max, n) });
  };
  return (
    <Section
      id="besoins"
      titre="2. Vos besoins"
      intro={`Indiquez ce que chaque enfant utilise. L'année scolaire compte ${SEMAINES_SCOLAIRES} semaines.`}
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        <ChampNombre label="Nombre d'enfants concernés" aide="Enfants scolarisés qui utilisent ces services." valeur={usage.enfantsConcernes} max={8} onChange={(v) => maj("enfantsConcernes", v, 8)} />
        <ChampNombre label="Cantine" suffixe="jours par semaine" valeur={usage.cantine} max={5} onChange={(v) => maj("cantine", v, 5)} />
        <ChampNombre label="Garderie du matin" suffixe="jours par semaine" valeur={usage.garderie_matin} max={5} onChange={(v) => maj("garderie_matin", v, 5)} />
        <ChampNombre label="Garderie / accueil du soir" suffixe="jours par semaine" valeur={usage.garderie_soir} max={5} onChange={(v) => maj("garderie_soir", v, 5)} />
        <ChampNombre
          label="Durée de l'accueil du soir"
          suffixe="heures"
          aide="Utilisé seulement là où le soir est facturé à l'heure (Nancy, Metz)."
          valeur={usage.heuresSoir}
          max={4}
          pas={0.5}
          onChange={(v) => maj("heuresSoir", v, 4)}
        />
        <ChampNombre
          label="Centre de loisirs : journées"
          suffixe="par an"
          aide="Mercredis et vacances confondus."
          valeur={usage.alsh_journee}
          max={200}
          onChange={(v) => maj("alsh_journee", v, 200)}
        />
        <ChampNombre label="Centre de loisirs : demi-journées" suffixe="par an" valeur={usage.alsh_demi_journee} max={200} onChange={(v) => maj("alsh_demi_journee", v, 200)} />
      </div>
    </Section>
  );
}
