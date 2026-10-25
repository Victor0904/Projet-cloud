import { Cadre } from "@/components/Cadre";
import { Comparaison } from "@/components/Comparaison";

export default function PageComparer() {
  return (
    <Cadre titre="Comparer des établissements" sousTitre="Jusqu'à 4 établissements côte à côte, avec la valeur ajoutée à côté de chaque taux.">
      <Comparaison />
    </Cadre>
  );
}
