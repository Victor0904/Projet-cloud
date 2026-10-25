import Link from "next/link";
import type { AdresseDetaillee } from "@/lib/adresse";
import type { ResultatSecteur } from "@/lib/secteur";
import type { Etablissement, FichierSecteurs } from "@/lib/types";

function NomCollege({ uai, etabs }: { uai: string; etabs: Etablissement[] }) {
  const e = etabs.find((x) => x.uai === uai);
  return (
    <Link href={`/etablissement?uai=${uai}`} className="font-bold text-blue-900 underline">
      {e ? `${e.nom} (${e.commune})` : `Collège ${uai}`}
    </Link>
  );
}

/** Résultat « Mon secteur » pour une adresse : collège de secteur, ou explication claire de ce qui manque. */
export function EncartSecteur({
  adresse,
  resultat,
  carte,
  etabs,
}: {
  adresse: AdresseDetaillee;
  resultat: ResultatSecteur;
  carte: FichierSecteurs | null;
  etabs: Etablissement[];
}) {
  return (
    <section aria-labelledby="titre-secteur" className="my-4 border-l-4 border-blue-900 bg-blue-50 p-4 break-inside-avoid">
      <h2 id="titre-secteur" className="text-lg font-bold">
        Collège public de secteur
      </h2>
      {resultat.statut === "trouve" && (
        <p className="mt-1">
          D&apos;après la carte scolaire publiée, le collège de secteur de cette adresse est{" "}
          <NomCollege uai={resultat.colleges[0]} etabs={etabs} />.
          {resultat.precision === "commune" && " Toute la commune dépend de ce collège."}
          {resultat.precision === "voie" && ` Toute la voie (${resultat.voie}) dépend de ce collège.`}
          {resultat.precision === "numero" && ` Repéré grâce au numéro dans la voie ${resultat.voie}.`}
        </p>
      )}
      {resultat.statut === "plusieurs" && (
        <>
          <p className="mt-1">{resultat.raison} Collèges possibles :</p>
          <ul className="ml-6 list-disc">
            {resultat.colleges.map((u) => (
              <li key={u}>
                <NomCollege uai={u} etabs={etabs} />
              </li>
            ))}
          </ul>
        </>
      )}
      {resultat.statut === "voie_inconnue" && (
        <>
          <p className="mt-1">
            Votre commune est découpée entre plusieurs collèges, mais la voie « {adresse.voie ?? "?"} » n&apos;a pas
            été reconnue dans la carte publiée (orthographe différente, voie récente…). Collèges de la commune :
          </p>
          <ul className="ml-6 list-disc">
            {resultat.colleges.map((u) => (
              <li key={u}>
                <NomCollege uai={u} etabs={etabs} />
              </li>
            ))}
          </ul>
          <p className="mt-1">Pour être sûr, contactez la mairie ou la DSDEN (services départementaux de l&apos;Éducation nationale).</p>
        </>
      )}
      {resultat.statut === "commune_absente" && (
        <p className="mt-1">
          La commune {adresse.commune} n&apos;apparaît pas dans la carte scolaire publiée pour ce département.
          Contactez la mairie ou la DSDEN pour connaître votre collège de secteur.
        </p>
      )}
      {resultat.statut === "non_publie" && (
        <p className="mt-1">
          <strong>Sectorisation non publiée par votre collectivité</strong> dans la carte scolaire nationale : contactez
          la mairie ou la DSDEN (services départementaux de l&apos;Éducation nationale) pour connaître votre collège de
          secteur.
        </p>
      )}
      <p className="mt-2 text-sm">
        Écoles maternelles et élémentaires : le secteur est fixé par la mairie et n&apos;est pas publié au niveau
        national. Lycées : l&apos;affectation en seconde passe par Affelnet (académie).{" "}
        <Link href="/secteur#derogations" className="underline">
          Demander une dérogation
        </Link>
      </p>
      {carte && (
        <p className="mt-2 text-xs text-gray-600">
          Source :{" "}
          <a href={carte.source.url} className="underline" target="_blank" rel="noreferrer">
            {carte.source.titre}
          </a>{" "}
          (téléchargée et vérifiée le {carte.source.telecharge_le.split("-").reverse().join("/")}). La carte peut
          changer à chaque rentrée : seule l&apos;affectation par la DSDEN fait foi.
        </p>
      )}
    </section>
  );
}
