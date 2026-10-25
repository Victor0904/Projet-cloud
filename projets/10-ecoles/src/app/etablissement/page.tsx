import { Suspense } from "react";
import { Cadre } from "@/components/Cadre";
import { Fiche } from "@/components/Fiche";

export default function PageEtablissement() {
  return (
    <Cadre titre="Fiche établissement" sousTitre="Résultats sur 3 ans, valeur ajoutée, profil social, effectifs et options.">
      <Suspense fallback={<p>Chargement…</p>}>
        <Fiche />
      </Suspense>
    </Cadre>
  );
}
