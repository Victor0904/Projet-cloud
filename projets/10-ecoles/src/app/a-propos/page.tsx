import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Cadre } from "@/components/Cadre";
import indicateurs from "../../../data/indicateurs.json";
import sectorisation from "../../../data/sectorisation.json";
import type { FichierDepartement, IndexDonnees } from "@/lib/types";

const DONNEES = join(process.cwd(), "public", "donnees");

function lireDonnees(): { index: IndexDonnees; fichiers: FichierDepartement[] } {
  const index = JSON.parse(readFileSync(join(DONNEES, "index.json"), "utf8")) as IndexDonnees;
  const fichiers = index.departements.map(
    (d) => JSON.parse(readFileSync(join(DONNEES, d.code3, "etablissements.json"), "utf8")) as FichierDepartement,
  );
  return { index, fichiers };
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")} %`;

export default function PageAPropos() {
  const { index, fichiers } = lireDonnees();
  const sources = fichiers[0]?.sources ?? [];
  return (
    <Cadre titre="Sources et méthode" sousTitre="D'où viennent les chiffres, comment les lire, et ce que l'outil ne fait pas.">
      <section aria-labelledby="t-couv">
        <h2 id="t-couv" className="text-xl font-bold">Départements disponibles</h2>
        <p className="text-sm text-gray-700">Données construites le {index.genere_le.split("-").reverse().join("/")}.</p>
        <ul className="ml-6 list-disc">
          {index.departements.map((d) => (
            <li key={d.code}>
              {d.nom} ({d.code}) : {d.etablissements} établissements —{" "}
              {d.carteScolaireColleges ? "carte scolaire des collèges publiée" : "carte scolaire des collèges non publiée"}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="t-sources">
        <h2 id="t-sources" className="text-xl font-bold">Jeux de données utilisés</h2>
        <ul className="ml-6 list-disc text-sm">
          {sources.map((s) => (
            <li key={s.cle}>
              <a href={s.url} className="underline" target="_blank" rel="noreferrer">
                {s.titre}
              </a>{" "}
              — téléchargé le {s.telecharge_le.split("-").reverse().join("/")}
            </li>
          ))}
          <li>
            <a href={sectorisation.colleges.source} className="underline" target="_blank" rel="noreferrer">
              {sectorisation.colleges.jeu}
            </a>
          </li>
          <li>Adresses : Géoplateforme IGN (géocodage), sans compte ni clé. Fond de carte : OpenStreetMap.</li>
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="t-lire">
        <h2 id="t-lire" className="text-xl font-bold">Comment lire les indicateurs</h2>
        <h3 className="mt-2 font-bold">Valeur ajoutée</h3>
        <p>{indicateurs.valeur_ajoutee.definition}</p>
        <p className="mt-1">
          Nous parlons de résultat « conforme à l&apos;attendu » quand l&apos;écart est inférieur à{" "}
          {indicateurs.valeur_ajoutee.seuils.points_de_pourcentage} points (ou{" "}
          {String(indicateurs.valeur_ajoutee.seuils.points_de_note_sur_20).replace(".", ",")} point sur 20 pour la note
          du brevet). Ce seuil est un choix de présentation, pas une règle officielle.
        </p>
        <h3 className="mt-3 font-bold">Indice de position sociale (IPS)</h3>
        <p>{indicateurs.ips.definition}</p>
        <h3 className="mt-3 font-bold">Pas de palmarès</h3>
        <p>
          L&apos;outil ne classe jamais les établissements par résultat : la liste est triée par distance, et chaque
          taux est affiché avec sa valeur ajoutée. Un taux brut mesure surtout le public accueilli.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="t-secto">
        <h2 id="t-secto" className="text-xl font-bold">Sectorisation : ce qui est publié</h2>
        <dl className="space-y-2">
          <div>
            <dt className="font-bold">Collèges publics</dt>
            <dd>
              {sectorisation.colleges.couverture} {sectorisation.colleges.qui_decide}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Écoles</dt>
            <dd>
              {sectorisation.ecoles.couverture} {sectorisation.ecoles.qui_decide}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Lycées</dt>
            <dd>
              {sectorisation.lycees.couverture} {sectorisation.lycees.qui_decide}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-gray-700">
          Le rapprochement adresse ↔ carte scolaire se fait sur le nom de voie normalisé et le numéro (pair/impair).
          Les indices « bis », « ter » ne sont pas distingués ; une voie mal orthographiée dans l&apos;un des deux
          fichiers peut ne pas être reconnue : l&apos;outil le dit alors et propose les collèges de la commune.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="t-jointure">
        <h2 id="t-jointure" className="text-xl font-bold">Contrôle de qualité : jointure par UAI</h2>
        <p className="text-sm">
          Chaque jeu d&apos;indicateurs est rattaché à l&apos;annuaire par l&apos;identifiant d&apos;établissement (UAI).
          Part des établissements de la dernière session introuvables dans l&apos;annuaire (objectif : moins de 5 %) :
        </p>
        <div className="overflow-x-auto">
          <table className="mt-2 min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-1 pr-3">Département</th>
                {fichiers[0]?.jointures.map((j) => (
                  <th scope="col" key={j.jeu} className="pr-3">
                    {j.jeu}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fichiers.map((f) => (
                <tr key={f.departement.code} className="border-b">
                  <th scope="row" className="py-1 pr-3 text-left">
                    {f.departement.nom}
                  </th>
                  {f.jointures.map((j) => (
                    <td key={j.jeu} className="pr-3">
                      {pct(j.perte)} <span className="text-gray-600">({j.uaiRetrouvesDansAnnuaire}/{j.uaiDansLeJeu})</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Les écarts restants correspondent surtout à des écoles fermées ou fusionnées depuis la publication de l&apos;IPS.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="t-limites">
        <h2 id="t-limites" className="text-xl font-bold">Limites</h2>
        <ul className="ml-6 list-disc">
          <li>Les données ont un an ou deux de décalage (dernière session publiée).</li>
          <li>Les distances sont à vol d&apos;oiseau, pas en temps de trajet.</li>
          <li>Seuls les départements listés plus haut sont chargés.</li>
          <li>Les horaires des établissements ne sont pas publiés en données ouvertes.</li>
          <li>La carte scolaire peut changer à chaque rentrée : seule l&apos;affectation par la DSDEN fait foi.</li>
          <li>L&apos;outil informe et oriente ; il ne donne pas de conseil individualisé.</li>
        </ul>
      </section>
    </Cadre>
  );
}
