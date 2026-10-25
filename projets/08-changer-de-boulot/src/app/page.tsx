import { Gabarit } from "@vie-fr/ui";
import { Comparateur } from "@/components/Comparateur";

export default function Accueil() {
  return (
    <Gabarit
      titre="Et si je change de boulot ?"
      sousTitre="Comparez deux ou trois offres — CDI, freelance, portage, société — sur ce qui vous reste vraiment."
    >
      <Comparateur />
    </Gabarit>
  );
}
