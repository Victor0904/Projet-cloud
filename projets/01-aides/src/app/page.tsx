import { Gabarit } from "@vie-fr/ui";
import { Simulateur } from "../composants/Simulateur";
import { REGLES } from "../moteur";

export default function Accueil() {
  return (
    <Gabarit
      titre="Simulateur d'aides unifié"
      sousTitre={`Un seul formulaire pour estimer ${REGLES.length} aides : logement, prime d'activité, RSA, famille, énergie, santé, études…`}
    >
      <p className="mb-6 rounded bg-gray-50 p-3 text-sm print:hidden">
        <strong>Vos réponses ne quittent pas votre appareil.</strong> Le calcul se fait dans votre navigateur ; seul le nom de commune que vous
        tapez est envoyé au service public de géocodage (IGN) pour trouver votre commune.
      </p>
      <Simulateur />
    </Gabarit>
  );
}
