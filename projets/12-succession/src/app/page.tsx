import { Gabarit } from "@vie-fr/ui";
import { Assistant } from "../components/Assistant";

export default function Accueil() {
  return (
    <Gabarit
      titre="Après un décès : l'assistant des démarches"
      sousTitre="Ce qu'il faut faire, avant quand, auprès de qui — avec les courriers prêts."
    >
      <Assistant />
    </Gabarit>
  );
}
