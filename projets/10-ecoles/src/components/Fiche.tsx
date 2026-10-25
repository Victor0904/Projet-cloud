"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BoutonExportPdf } from "@vie-fr/ui";
import { chargerEtablissement } from "@/lib/donnees";
import { languesRares } from "@/lib/geo";
import {
  dernier,
  indicateursPrincipaux,
  NIVEAU_LIBELLE,
  OPTION_LIBELLE,
  phraseIps,
  phraseVa,
  pourcent,
  SEUIL_NOTE,
  SEUIL_POINTS,
  signe,
} from "@/lib/interpretation";
import type { Etablissement, FichierDepartement } from "@/lib/types";
import { BoutonComparer } from "./BoutonComparer";
import { BadgeVerdict, IndicateurVa } from "./Indicateurs";
import { Sources } from "./Sources";

export const lienAnnuaire = (uai: string) =>
  `https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/table/?q=${encodeURIComponent(uai)}`;

const va = (n: number | null, unite = " pt") => (n === null ? "—" : signe(n, unite));
const num = (n: number | null, unite = "") => (n === null ? "—" : `${String(n).replace(".", ",")}${unite}`);

function AvertissementTaux() {
  return (
    <p className="rounded border-l-4 border-orange-700 bg-orange-50 p-3 text-sm">
      <strong>À lire avant les chiffres.</strong> Un taux de réussite brut dépend d&apos;abord du public accueilli :
      un établissement qui recrute des élèves favorisés et déjà bons a mécaniquement de bons résultats. La{" "}
      <strong>valeur ajoutée</strong> compare le résultat réel au résultat « attendu » pour des élèves comparables
      (âge, origine sociale, niveau de départ) : c&apos;est elle qui dit si l&apos;établissement fait mieux ou moins
      bien que ce que son public laisserait attendre. Elle reste une estimation, qui varie d&apos;une année à
      l&apos;autre.
    </p>
  );
}

function Resultats({ e }: { e: Etablissement }) {
  if (e.niveau === "ecole") {
    return <p>Il n&apos;existe pas d&apos;examen national à l&apos;école primaire : aucun résultat n&apos;est publié par école.</p>;
  }
  const principaux = indicateursPrincipaux(e);
  if (!principaux.length) {
    return <p>Aucun résultat publié pour cet établissement (établissement récent, privé hors contrat ou trop peu de candidats).</p>;
  }
  return (
    <>
      <AvertissementTaux />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {principaux.map((i) => (
          <IndicateurVa key={i.libelle} ind={i} />
        ))}
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
        {principaux.map((i) => (
          <li key={i.libelle}>{phraseVa(i.taux, i.va, i.libelle, i.unite, i.seuil)}</li>
        ))}
      </ul>
      <h3 className="mt-4 font-bold">Évolution sur les dernières sessions</h3>
      <div className="overflow-x-auto">
        {e.niveau === "college" ? (
          <table className="mt-1 min-w-full text-sm">
            <caption className="sr-only">Résultats au brevet par session</caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-1 pr-3">Session</th>
                <th scope="col" className="pr-3">Candidats</th>
                <th scope="col" className="pr-3">Réussite</th>
                <th scope="col" className="pr-3">VA réussite</th>
                <th scope="col" className="pr-3">Note écrit</th>
                <th scope="col" className="pr-3">VA note</th>
                <th scope="col" className="pr-3">Élèves de 6e allant jusqu&apos;en 3e ici</th>
              </tr>
            </thead>
            <tbody>
              {e.dnb.map((d) => (
                <tr key={d.session} className="border-b">
                  <th scope="row" className="py-1 pr-3 text-left">{d.session}</th>
                  <td className="pr-3">{num(d.candidats)}</td>
                  <td className="pr-3">{pourcent(d.tauxReussite)}</td>
                  <td className="pr-3">{va(d.vaTauxReussite)} <BadgeVerdict va={d.vaTauxReussite} seuil={SEUIL_POINTS} /></td>
                  <td className="pr-3">{num(d.noteEcrit, "/20")}</td>
                  <td className="pr-3">{va(d.vaNoteEcrit, "")} <BadgeVerdict va={d.vaNoteEcrit} seuil={SEUIL_NOTE} /></td>
                  <td className="pr-3">{pourcent(d.tauxAcces6e3e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="mt-1 min-w-full text-sm">
            <caption className="sr-only">Résultats au baccalauréat par session</caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-1 pr-3">Session</th>
                <th scope="col" className="pr-3">Voie</th>
                <th scope="col" className="pr-3">Présents</th>
                <th scope="col" className="pr-3">Réussite</th>
                <th scope="col" className="pr-3">VA réussite</th>
                <th scope="col" className="pr-3">Accès 2de → bac</th>
                <th scope="col" className="pr-3">VA accès</th>
                <th scope="col" className="pr-3">Mentions</th>
                <th scope="col" className="pr-3">VA mentions</th>
              </tr>
            </thead>
            <tbody>
              {e.bac.map((b) => (
                <tr key={`${b.session}-${b.voie}`} className="border-b">
                  <th scope="row" className="py-1 pr-3 text-left">{b.session}</th>
                  <td className="pr-3">{b.voie === "gt" ? "Générale et techno." : "Professionnelle"}</td>
                  <td className="pr-3">{num(b.presents)}</td>
                  <td className="pr-3">{pourcent(b.tauxReussite)}</td>
                  <td className="pr-3">{va(b.vaTauxReussite)}</td>
                  <td className="pr-3">{pourcent(b.tauxAcces2nde)}</td>
                  <td className="pr-3">{va(b.vaTauxAcces2nde)}</td>
                  <td className="pr-3">{pourcent(b.tauxMentions)}</td>
                  <td className="pr-3">{va(b.vaTauxMentions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-700">
        {e.niveau === "lycee"
          ? "Le taux d'accès de la 2de au bac mesure la part des élèves de seconde qui obtiennent le bac en restant dans ce lycée : un lycée qui « réussit » en poussant ses élèves fragiles vers la sortie a un taux d'accès faible."
          : "La part des élèves de 6e qui vont jusqu'en 3e dans ce collège complète la réussite au brevet : un collège dont beaucoup d'élèves partent en cours de route a un taux faible."}
      </p>
    </>
  );
}

export function Fiche() {
  const uai = useSearchParams().get("uai") ?? "";
  const [etat, setEtat] = useState<
    { etat: "chargement" } | { etat: "absent" } | { etat: "pret"; etab: Etablissement; fichier: FichierDepartement }
  >({ etat: "chargement" });

  useEffect(() => {
    let annule = false;
    chargerEtablissement(uai)
      .then((r) => !annule && setEtat(r ? { etat: "pret", ...r } : { etat: "absent" }))
      .catch(() => !annule && setEtat({ etat: "absent" }));
    return () => {
      annule = true;
    };
  }, [uai]);

  if (etat.etat === "chargement") return <p aria-live="polite">Chargement de la fiche…</p>;
  if (etat.etat === "absent") {
    return (
      <p role="alert">
        Établissement « {uai} » introuvable dans les départements importés.{" "}
        <Link href="/" className="underline">
          Revenir à la recherche
        </Link>
      </p>
    );
  }
  const { etab: e, fichier } = etat;
  const ips = dernier(e.ips);
  const rares = languesRares(e);
  const cleIps = e.niveau === "ecole" ? "ips_ecoles" : e.niveau === "college" ? "ips_colleges" : "ips_lycees";
  const cleEff = e.niveau === "ecole" ? "eff_ecoles" : e.niveau === "college" ? "eff_colleges" : "eff_lycees";

  return (
    <article>
      <h2 className="text-2xl font-bold">{e.nom}</h2>
      <p className="text-gray-700">
        {NIVEAU_LIBELLE[e.niveau]} {e.statut === "public" ? "public" : "privé"}
        {e.contratPrive ? ` (${e.contratPrive})` : ""}
        {e.nature && e.nature !== "COLLEGE" ? ` · ${e.nature.toLowerCase()}` : ""} · UAI {e.uai}
        {e.educationPrioritaire ? ` · éducation prioritaire ${e.educationPrioritaire}` : ""}
      </p>
      <p className="mt-2 flex flex-wrap gap-2 print:hidden">
        <BoutonComparer uai={e.uai} nom={e.nom} />
        <BoutonExportPdf libelle="Imprimer / PDF" />
      </p>

      <section className="mt-6" aria-labelledby="t-contact">
        <h3 id="t-contact" className="text-lg font-bold">Contact</h3>
        <p>
          {e.adresse}, {e.codePostal} {e.commune}
        </p>
        <ul className="text-sm">
          {e.telephone && (
            <li>
              Téléphone : <a href={`tel:${e.telephone.replace(/\s/g, "")}`} className="underline">{e.telephone}</a>
            </li>
          )}
          {e.mail && (
            <li>
              Courriel : <a href={`mailto:${e.mail}`} className="underline">{e.mail}</a>
            </li>
          )}
          {e.web && (
            <li>
              Site : <a href={e.web} className="underline" target="_blank" rel="noreferrer">{e.web}</a>
            </li>
          )}
          <li>
            Horaires : non publiés en données ouvertes, à voir sur le site de l&apos;établissement ou par téléphone.
          </li>
          <li>
            Fiche officielle :{" "}
            <a href={lienAnnuaire(e.uai)} className="underline" target="_blank" rel="noreferrer">
              annuaire de l&apos;Éducation nationale
            </a>
            {e.ficheOnisep && (
              <>
                {" · "}
                <a href={e.ficheOnisep} className="underline" target="_blank" rel="noreferrer">
                  fiche ONISEP (formations)
                </a>
              </>
            )}
          </li>
        </ul>
        <Sources sources={fichier.sources} cles={["annuaire"]} />
      </section>

      <section className="mt-6" aria-labelledby="t-resultats">
        <h3 id="t-resultats" className="text-lg font-bold">Résultats et valeur ajoutée</h3>
        <Resultats e={e} />
        <Sources sources={fichier.sources} cles={e.niveau === "college" ? ["ivac"] : e.niveau === "lycee" ? ["ival_gt", "ival_pro"] : []} />
      </section>

      <section className="mt-6" aria-labelledby="t-ips">
        <h3 id="t-ips" className="text-lg font-bold">Profil social des élèves (IPS)</h3>
        <p>{phraseIps(ips)}</p>
        {ips && (
          <p className="text-sm text-gray-700">
            Références : académie {num(ips.reference.academie)}, France {num(ips.reference.national)}
            {ips.ecartType !== null && ` · écart-type ${num(ips.ecartType)} (plus il est grand, plus le public est mélangé)`}.
          </p>
        )}
        <p className="mt-1 text-sm text-gray-700">
          L&apos;IPS résume le milieu social des familles à partir de la profession des parents. Il ne mesure pas la
          qualité de l&apos;enseignement ; il aide à lire les résultats.
        </p>
        {e.ips.length > 1 && (
          <p className="text-sm">Historique : {e.ips.map((i) => `${i.rentree} : ${num(i.valeur)}`).join(" · ")}</p>
        )}
        <Sources sources={fichier.sources} cles={[cleIps]} />
      </section>

      <section className="mt-6" aria-labelledby="t-eff">
        <h3 id="t-eff" className="text-lg font-bold">Effectifs</h3>
        {e.effectifs.length ? (
          <ul className="text-sm">
            {e.effectifs.map((x) => (
              <li key={x.rentree}>
                Rentrée {x.rentree} : {x.eleves} élèves{x.classes ? ` en ${x.classes} classes (${(x.eleves / x.classes).toFixed(1).replace(".", ",")} élèves par classe en moyenne)` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Effectifs non publiés pour cet établissement.</p>
        )}
        <Sources sources={fichier.sources} cles={[cleEff, ...(e.niveau === "lycee" ? ["eff_lp"] : [])]} />
      </section>

      <section className="mt-6" aria-labelledby="t-options">
        <h3 id="t-options" className="text-lg font-bold">Options, sections et services</h3>
        {e.options.length ? (
          <ul className="flex flex-wrap gap-1 text-sm">
            {e.options.map((o) => (
              <li key={o} className="rounded bg-gray-100 px-2 py-0.5">{OPTION_LIBELLE[o] ?? o}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Aucune option particulière signalée dans l&apos;annuaire.</p>
        )}
        {e.sectionsInternationales.length > 0 && (
          <p className="mt-2 text-sm">Sections internationales : {e.sectionsInternationales.join(", ")}.</p>
        )}
        {e.langues.length > 0 && (
          <p className="mt-2 text-sm">
            Langues enseignées : {e.langues.join(", ")}.
            {rares.length > 0 && ` Langue(s) moins répandue(s) : ${rares.join(", ")}.`}
          </p>
        )}
        <Sources sources={fichier.sources} cles={["annuaire", "langues", "sections_internationales"]} />
      </section>
      <p className="mt-6 text-sm text-gray-700">
        Ces informations sont une synthèse de données publiques ; elles peuvent dater d&apos;une ou deux rentrées.
        Elles ne remplacent pas une visite ni l&apos;échange avec l&apos;équipe de l&apos;établissement.
      </p>
    </article>
  );
}
