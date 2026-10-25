import { Gabarit } from "@vie-fr/ui";
import { Decodeur } from "@/components/Decodeur";

export default function Accueil() {
  return (
    <Gabarit
      titre="Décodeur de courrier administratif"
      sousTitre="Collez votre courrier : on vous dit ce que c'est, ce que vous risquez, quoi faire et avant quand — puis on prépare la réponse."
    >
      <Decodeur />
    </Gabarit>
  );
}
