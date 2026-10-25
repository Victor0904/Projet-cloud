"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BoutonExportPdf } from "@vie-fr/ui";
import { dateLongue } from "@vie-fr/fr-data";
import { catalogue } from "@/lib/catalogue";
import { versDate } from "@/lib/dates";
import { genererIcs } from "@/lib/ics";
import { verifierEtNotifier } from "@/lib/notifications";
import { evenementsAgenda, lignes as calculerLignes } from "@/lib/vue";
import { CarteEcheance } from "./CarteEcheance";
import { telecharger, useAujourdhui, useEtat } from "./etat";
import { Timeline } from "./Timeline";
import { Bouton, Chargement, classeBouton, Encadre } from "./ui";

const DEMARRAGE: [string, string][] = [
  ["ct-voiture", "Ma voiture (contrôle technique)"],
  ["cni", "Ma carte d'identité"],
  ["assurance-habitation", "Mon assurance habitation"],
  ["passeport", "Mon passeport"],
  ["declaration-revenus", "Ma déclaration de revenus"],
  ["chaudiere", "L'entretien de ma chaudière"],
];

export function TableauDeBord() {
  const etat = useEtat();
  const auj = useAujourdhui();
  const [filtre, setFiltre] = useState("tous");

  const toutes = useMemo(() => (etat && auj ? calculerLignes(etat, auj, { archivees: true }) : []), [etat, auj]);
  const actives = toutes.filter((l) => !l.echeance.archivee && l.res.statut !== "termine");
  const terminees = toutes.filter((l) => l.echeance.archivee || l.res.statut === "termine");
  const visibles = actives.filter((l) =>
    filtre === "tous" ? true : filtre === "aucun" ? !l.echeance.membreId : l.echeance.membreId === filtre,
  );

  // Vérification des notifications une seule fois, au chargement de la page.
  const verifie = useRef(false);
  useEffect(() => {
    if (verifie.current || !etat || !auj) return;
    verifie.current = true;
    verifierEtNotifier(actives, auj);
  });

  if (!etat || !auj) return <Chargement />;

  if (etat.echeances.length === 0) {
    return (
      <section aria-labelledby="titre-demarrage">
        <h2 id="titre-demarrage" className="text-xl font-bold">
          Commencez en 3 minutes
        </h2>
        <p className="mt-2">
          Choisissez ce que vous voulez suivre. Pour chaque élément, saisissez une ou deux dates (par exemple la date
          de délivrance de votre carte) : l&apos;outil calcule la prochaine échéance et les suivantes, puis vous les
          envoie dans votre agenda.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {DEMARRAGE.map(([id, libelle]) => (
            <li key={id}>
              <Link href={`/ajouter?type=${id}`} className={`${classeBouton.secondaire} w-full justify-start`}>
                + {libelle}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <Link href="/ajouter" className="text-blue-900 underline">
            Voir les {catalogue.types.length - 1} types d&apos;échéances ou créer une échéance libre
          </Link>
          {" · "}
          <Link href="/rappels#importer" className="text-blue-900 underline">
            J&apos;ai déjà une sauvegarde
          </Link>
        </p>
      </section>
    );
  }

  const compte = (u: string) => visibles.filter((l) => l.urgence === u).length;

  const exporterIcs = () =>
    telecharger("mes-delais.ics", genererIcs(evenementsAgenda(visibles)), "text/calendar;charset=utf-8");

  return (
    <>
      <p className="mb-4 text-gray-800">
        Aujourd&apos;hui : <strong>{dateLongue(versDate(auj))}</strong>. Les dates sont recalculées à chaque visite.
      </p>

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Link href="/ajouter" className={classeBouton.primaire}>
          + Ajouter une échéance
        </Link>
        <Bouton variante="secondaire" onClick={exporterIcs}>
          Télécharger le calendrier (.ics)
        </Bouton>
        <Link href="/rappels" className={classeBouton.secondaire}>
          Rappels, lien et sauvegarde
        </Link>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["depasse", "Dépassées", "bg-red-700 text-white"],
            ["moins30", "Moins de 30 j", "bg-orange-200 text-orange-950"],
            ["moins90", "Moins de 90 j", "bg-yellow-100 text-yellow-950"],
            ["plus_tard", "Plus tard", "bg-gray-100 text-gray-900"],
          ] as const
        ).map(([u, libelle, c]) => (
          <div key={u} className={`rounded p-3 ${c}`}>
            <dt className="text-sm">{libelle}</dt>
            <dd className="text-2xl font-bold">{compte(u)}</dd>
          </div>
        ))}
      </dl>

      {etat.membres.length > 0 && (
        <div className="mb-4 print:hidden">
          <label htmlFor="filtre-membre" className="mr-2 font-medium">
            Afficher :
          </label>
          <select
            id="filtre-membre"
            value={filtre}
            onChange={(ev) => setFiltre(ev.target.value)}
            className="rounded-t border-b-2 border-gray-800 bg-gray-100 px-2 py-1"
          >
            <option value="tous">Tout le foyer</option>
            {etat.membres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
            <option value="aucun">Sans étiquette</option>
          </select>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-1">
        <section aria-labelledby="titre-liste">
          <h2 id="titre-liste" className="mb-3 text-xl font-bold">
            Par ordre d&apos;urgence
          </h2>
          {visibles.length === 0 ? (
            <p>Aucune échéance pour ce filtre.</p>
          ) : (
            visibles.map((l) => <CarteEcheance key={l.echeance.id} ligne={l} auj={auj} />)
          )}
        </section>

        <section aria-labelledby="titre-frise">
          <h2 id="titre-frise" className="mb-3 text-xl font-bold">
            Les 12 prochains mois
          </h2>
          <Timeline lignes={visibles} auj={auj} />
        </section>
      </div>

      {terminees.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-medium text-blue-900 underline">
            Échéances terminées ({terminees.length})
          </summary>
          <div className="mt-2">
            {terminees.map((l) => (
              <CarteEcheance key={l.echeance.id} ligne={l} auj={auj} />
            ))}
          </div>
        </details>
      )}

      <Encadre titre="Limites">
        Les dates sont des estimations calculées à partir des règles générales et des dates que vous avez saisies.
        Elles ne remplacent pas les dates figurant sur vos documents ni la démarche officielle. Chaque règle indique
        sa source et sa date de vérification.
      </Encadre>
      <div className="mt-4">
        <BoutonExportPdf libelle="Imprimer ou enregistrer en PDF" />
      </div>
    </>
  );
}
