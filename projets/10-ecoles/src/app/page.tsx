import { Accueil } from "@/components/Accueil";
import { Cadre } from "@/components/Cadre";

export default function PageAccueil() {
  return (
    <Cadre
      titre="Écoles, collèges et lycées autour de chez moi"
      sousTitre="Carte, collège de secteur et comparaison avec des indicateurs expliqués, à partir des données ouvertes de l'Éducation nationale."
    >
      <Accueil />
    </Cadre>
  );
}
