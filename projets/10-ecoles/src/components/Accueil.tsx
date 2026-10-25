"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AdresseDetaillee } from "@/lib/adresse";
import { lireAdresse, memoriserAdresse } from "@/lib/adresseMemoire";
import { autour, FILTRES_PAR_DEFAUT, formaterDistance, languesRares, type FiltreOption, type Filtres } from "@/lib/geo";
import { dernier, indicateursPrincipaux, NIVEAU_LIBELLE, OPTION_LIBELLE } from "@/lib/interpretation";
import type { Niveau } from "@/lib/types";
import { BoutonComparer, useSelection } from "./BoutonComparer";
import { CarteEtablissements } from "./CarteEtablissements";
import { EncartSecteur } from "./EncartSecteur";
import { IndicateurVa } from "./Indicateurs";
import { RechercheAdresse } from "./RechercheAdresse";
import { Sources } from "./Sources";
import { useDonneesAdresse } from "./useDonneesAdresse";

const OPTIONS_FILTRE: [FiltreOption, string][] = [
  ["section_europeenne", "Section européenne"],
  ["section_internationale", "Section internationale"],
  ["section_sport", "Section sportive"],
  ["langue_rare", "Langue moins répandue (ni anglais, allemand, espagnol, italien)"],
  ["segpa", "SEGPA"],
  ["ulis", "ULIS"],
  ["internat", "Internat"],
];

const RAYONS = [1, 2, 3, 5, 10, 20];

export function Accueil() {
  const [adresse, setAdresse] = useState<AdresseDetaillee | null>(null);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_PAR_DEFAUT);
  const [focus, setFocus] = useState<string | null>(null);
  const donnees = useDonneesAdresse(adresse);
  const selection = useSelection();

  useEffect(() => setAdresse(lireAdresse()), []);

  const choisir = (a: AdresseDetaillee) => {
    memoriserAdresse(a);
    setAdresse(a);
  };

  const proches = useMemo(
    () => (donnees.etat === "pret" && adresse ? autour(donnees.fichier.etablissements, adresse, filtres) : []),
    [donnees, adresse, filtres],
  );
  const secteur = donnees.etat === "pret" && donnees.secteur.statut === "trouve" ? donnees.secteur.colleges : [];

  useEffect(() => {
    if (focus) document.getElementById(`etab-${focus}`)?.focus();
  }, [focus]);

  const basculerNiveau = (n: Niveau) =>
    setFiltres((f) => ({ ...f, niveaux: f.niveaux.includes(n) ? f.niveaux.filter((x) => x !== n) : [...f.niveaux, n] }));
  const basculerOption = (o: FiltreOption) =>
    setFiltres((f) => ({ ...f, options: f.options.includes(o) ? f.options.filter((x) => x !== o) : [...f.options, o] }));

  return (
    <div>
      <RechercheAdresse onChoix={choisir} valeurInitiale={adresse?.label ?? ""} key={adresse?.label ?? "vide"} />

      {adresse && (
        <p className="mt-4 text-sm">
          Adresse retenue : <strong>{adresse.label}</strong>{" "}
          <button
            type="button"
            className="ml-2 underline print:hidden"
            onClick={() => {
              memoriserAdresse(null);
              setAdresse(null);
            }}
          >
            Effacer
          </button>
        </p>
      )}

      {selection.length > 0 && (
        <p className="mt-2 rounded bg-gray-100 p-2 text-sm print:hidden">
          {selection.length} établissement{selection.length > 1 ? "s" : ""} dans votre comparaison.{" "}
          <Link href="/comparer" className="font-medium text-blue-900 underline">
            Voir la comparaison
          </Link>
        </p>
      )}

      {donnees.etat === "attente" && (
        <div className="mt-6 space-y-2">
          <p>
            Saisissez votre adresse pour voir les écoles, collèges et lycées autour, savoir quel collège public est votre
            collège de secteur et comparer jusqu&apos;à 4 établissements.
          </p>
          <p className="text-sm text-gray-700">
            Les établissements sont classés par distance, jamais par « palmarès » : un taux de réussite brut dépend
            surtout du public accueilli. Nous montrons toujours la <strong>valeur ajoutée</strong> à côté.
          </p>
        </div>
      )}
      {donnees.etat === "chargement" && <p className="mt-6" aria-live="polite">Chargement des données du département…</p>}
      {donnees.etat === "erreur" && (
        <p className="mt-6 text-red-800" role="alert">
          Impossible de charger les données : {donnees.message}
        </p>
      )}
      {donnees.etat === "hors_couverture" && adresse && (
        <div className="mt-6 rounded border border-orange-800 bg-orange-50 p-4" role="status">
          <p>
            Le département {adresse.codeDepartement} n&apos;est pas encore importé dans cet outil. Départements
            disponibles : {donnees.index.departements.map((d) => `${d.nom} (${d.code})`).join(", ")}.
          </p>
          <p className="mt-1 text-sm">
            Pour l&apos;ajouter, il suffit de compléter la liste dans <code>scripts/config.ts</code> et de relancer
            l&apos;import (voir la page Sources et méthode).
          </p>
        </div>
      )}

      {donnees.etat === "pret" && adresse && (
        <>
          <EncartSecteur adresse={adresse} resultat={donnees.secteur} carte={donnees.carte} etabs={donnees.fichier.etablissements} />

          <fieldset className="mt-4 rounded border p-3 print:hidden">
            <legend className="px-1 font-bold">Filtres</legend>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p className="font-medium">Niveau</p>
                {(["ecole", "college", "lycee"] as Niveau[]).map((n) => (
                  <label key={n} className="mr-4 inline-flex items-center gap-1">
                    <input type="checkbox" checked={filtres.niveaux.includes(n)} onChange={() => basculerNiveau(n)} />
                    {NIVEAU_LIBELLE[n]}
                  </label>
                ))}
              </div>
              <div>
                <label className="block font-medium" htmlFor="filtre-statut">
                  Public / privé
                </label>
                <select
                  id="filtre-statut"
                  value={filtres.statut}
                  onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value as Filtres["statut"] }))}
                  className="rounded border bg-gray-100 px-2 py-1"
                >
                  <option value="tous">Tous</option>
                  <option value="public">Public</option>
                  <option value="prive">Privé</option>
                </select>
              </div>
              <div>
                <label className="block font-medium" htmlFor="filtre-rayon">
                  Distance maximale
                </label>
                <select
                  id="filtre-rayon"
                  value={filtres.rayonKm}
                  onChange={(e) => setFiltres((f) => ({ ...f, rayonKm: Number(e.target.value) }))}
                  className="rounded border bg-gray-100 px-2 py-1"
                >
                  {RAYONS.map((r) => (
                    <option key={r} value={r}>
                      {r} km
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <p className="font-medium">Options (toutes celles cochées doivent être proposées)</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {OPTIONS_FILTRE.map(([o, l]) => (
                  <label key={o} className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={filtres.options.includes(o)} onChange={() => basculerOption(o)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="lg:sticky lg:top-2 lg:self-start">
              <CarteEtablissements
                centre={adresse}
                rayonKm={filtres.rayonKm}
                etablissements={proches}
                secteur={secteur}
                onChoix={setFocus}
              />
            </div>
            <section aria-labelledby="titre-liste">
              <h2 id="titre-liste" className="text-lg font-bold" aria-live="polite">
                {proches.length} établissement{proches.length > 1 ? "s" : ""} à moins de {filtres.rayonKm} km
              </h2>
              <p className="text-sm text-gray-700">Classés par distance à vol d&apos;oiseau.</p>
              {proches.length === 0 && (
                <p className="mt-2">Aucun établissement ne correspond : élargissez la distance ou retirez des filtres.</p>
              )}
              <ul className="mt-2 space-y-3">
                {proches.map((e) => {
                  const ind = indicateursPrincipaux(e)[0];
                  const ips = dernier(e.ips);
                  const rares = languesRares(e);
                  return (
                    <li
                      key={e.uai}
                      id={`etab-${e.uai}`}
                      tabIndex={-1}
                      className={`rounded border p-3 focus:outline-2 focus:outline-blue-700 ${secteur.includes(e.uai) ? "border-2 border-blue-900" : ""}`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-bold">
                          <Link href={`/etablissement?uai=${e.uai}`} className="text-blue-900 underline">
                            {e.nom}
                          </Link>
                        </h3>
                        <span className="text-sm">{formaterDistance(e.distanceKm)}</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {NIVEAU_LIBELLE[e.niveau]} {e.statut === "public" ? "public" : "privé"}
                        {e.contratPrive ? ` (${e.contratPrive})` : ""} · {e.commune}
                        {e.educationPrioritaire ? ` · ${e.educationPrioritaire}` : ""}
                        {secteur.includes(e.uai) && <strong className="text-blue-900"> · Collège de secteur</strong>}
                      </p>
                      {ind && (
                        <p className="mt-1 text-sm">
                          {ind.libelle} ({ind.session}) : <IndicateurVa ind={ind} compact />
                        </p>
                      )}
                      {ips && (
                        <p className="text-sm">
                          IPS {String(ips.valeur).replace(".", ",")}
                          {ips.reference.departement !== null &&
                            ` (moyenne du département : ${String(ips.reference.departement).replace(".", ",")})`}
                        </p>
                      )}
                      {(e.options.some((o) => o.startsWith("section_")) || rares.length > 0) && (
                        <p className="mt-1 flex flex-wrap gap-1 text-xs">
                          {e.options
                            .filter((o) => o.startsWith("section_"))
                            .map((o) => (
                              <span key={o} className="rounded bg-gray-100 px-2 py-0.5">
                                {OPTION_LIBELLE[o]}
                              </span>
                            ))}
                          {rares.map((l) => (
                            <span key={l} className="rounded bg-gray-100 px-2 py-0.5">
                              {l}
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="mt-2">
                        <BoutonComparer uai={e.uai} nom={e.nom} />
                      </p>
                    </li>
                  );
                })}
              </ul>
              <Sources sources={donnees.fichier.sources} cles={["annuaire", "ivac", "ival_gt", "ips_colleges"]} />
              <p className="mt-2 text-xs text-gray-600">
                Seuls les établissements du département {donnees.fichier.departement.nom} sont chargés : près d&apos;une
                limite de département, des établissements voisins peuvent manquer.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
