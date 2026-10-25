import { Cadre } from "@/components/Cadre";
import { MonSecteur } from "@/components/MonSecteur";

export default function PageSecteur() {
  return (
    <Cadre
      titre="Mon secteur et les dérogations"
      sousTitre="Le collège public de votre adresse, les règles pour en demander un autre et une lettre prête à imprimer."
    >
      <MonSecteur />
    </Cadre>
  );
}
