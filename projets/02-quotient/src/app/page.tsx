import { Gabarit } from "@vie-fr/ui";
import { Application } from "@/components/Application";

export default function Accueil() {
  return (
    <Gabarit
      titre="Combien coûtent la cantine, la garderie et la crèche ?"
      sousTitre="Calculez votre quotient familial, estimez le coût annuel dans votre commune et comparez jusqu'à trois villes."
    >
      <Application />
    </Gabarit>
  );
}
