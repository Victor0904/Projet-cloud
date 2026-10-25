"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoutonExportPdf } from "@vie-fr/ui";
import { avertissements, lignesIndicateurs } from "@/lib/comparaison";
import { chargerEtablissement } from "@/lib/donnees";
import { languesRares } from "@/lib/geo";
import { dernier, NIVEAU_LIBELLE, OPTION_LIBELLE } from "@/lib/interpretation";
import { basculer, remplacerSelection } from "@/lib/selection";
import type { Etablissement, SourceImport } from "@/lib/types";
import { useSelection } from "./BoutonComparer";
import { IndicateurVa } from "./Indicateurs";
import { Sources } from "./Sources";

const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n).replace(".", ","));

export function Comparaison() {
  const selection = useSelection();
  const [etabs, setEtabs] = useState<Etablissement[] | null>(null);
  const [sources, setSources] = useState<SourceImport[]>([]);

  useEffect(() => {
    let annule = false;
    Promise.all(selection.map((u) => chargerEtablissement(u).catch(() => null))).then((r) => {
      if (annule) return;
      const ok = r.filter((x): x is NonNullable<typeof x> => x !== null);
      setEtabs(ok.map((x) => x.etab));
      setSources([...new Map(ok.flatMap((x) => x.fichier.sources).map((s) => [s.cle, s])).values()]);
    });
    return () => {
      annule = true;
    };
  }, [selection]);

  if (etabs === null) return <p aria-live="polite">Chargement…</p>;
  if (etabs.length === 0) {
    return (
      <div className="space-y-2">
        <p>Votre comparaison est vide.</p>
        <p>
          Cherchez votre adresse sur la{" "}
          <Link href="/" className="underline">
            carte
          </Link>{" "}
          puis cliquez sur « Comparer » pour 2 à 4 établissements (par exemple deux lycées).
        </p>
      </div>
    );
  }

  const lignes = lignesIndicateurs(etabs);
  const alertes = avertissements(etabs);
  const colonnes = `minmax(10rem,1fr) repeat(${etabs.length}, minmax(12rem,1fr))`;

  const Ligne = ({ titre, children }: { titre: string; children: React.ReactNode[] }) => (
    <div role="row" className="grid border-b py-2 break-inside-avoid" style={{ gridTemplateColumns: colonnes }}>
      <div role="rowheader" className="pr-2 font-medium">
        {titre}
      </div>
      {children.map((c, i) => (
        <div role="cell" key={i} className="pr-2 text-sm">
          {c}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <p className="flex flex-wrap gap-2 print:hidden">
        <BoutonExportPdf libelle="Télécharger la comparaison en PDF" />
        <button type="button" onClick={() => remplacerSelection([])} className="rounded border border-gray-700 px-3 py-2 text-sm">
          Vider la comparaison
        </button>
      </p>
      <p className="mt-2 hidden text-sm print:block">Comparaison éditée le {new Date().toLocaleDateString("fr-FR")}.</p>
      {alertes.length > 0 && (
        <ul className="mt-3 list-disc rounded border-l-4 border-orange-700 bg-orange-50 py-2 pl-8 pr-3 text-sm">
          {alertes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-gray-700">
        Lisez la <strong>valeur ajoutée</strong> (écart entre résultat réel et résultat attendu pour des élèves
        comparables) avant le taux brut : c&apos;est elle qui dit ce que l&apos;établissement apporte.
      </p>
      <div className="mt-3 overflow-x-auto">
        <div role="table" aria-label="Comparaison des établissements" className="min-w-max">
          <div role="row" className="grid border-b-2 border-gray-800 pb-2" style={{ gridTemplateColumns: colonnes }}>
            <div role="columnheader" />
            {etabs.map((e) => (
              <div role="columnheader" key={e.uai} className="pr-2">
                <Link href={`/etablissement?uai=${e.uai}`} className="font-bold text-blue-900 underline">
                  {e.nom}
                </Link>
                <p className="text-xs text-gray-700">{e.commune}</p>
                <button type="button" onClick={() => basculer(e.uai)} className="mt-1 text-xs underline print:hidden">
                  Retirer<span className="sr-only"> {e.nom}</span>
                </button>
              </div>
            ))}
          </div>
          <Ligne titre="Type">
            {etabs.map((e) => `${NIVEAU_LIBELLE[e.niveau]} ${e.statut === "public" ? "public" : "privé"}${e.contratPrive ? ` (${e.contratPrive})` : ""}`)}
          </Ligne>
          <Ligne titre="Profil social (IPS)">
            {etabs.map((e) => {
              const i = dernier(e.ips);
              return i ? `${num(i.valeur)} (dép. ${num(i.reference.departement)}, ${i.rentree})` : "non publié";
            })}
          </Ligne>
          {lignes.map((l) => (
            <Ligne key={l.libelle} titre={l.libelle}>
              {l.valeurs.map((v, i) => (v ? <IndicateurVa key={i} ind={v} compact /> : "non publié"))}
            </Ligne>
          ))}
          <Ligne titre="Session des résultats">
            {etabs.map((e) => String(e.niveau === "college" ? (dernier(e.dnb)?.session ?? "—") : e.niveau === "lycee" ? (Math.max(...e.bac.map((b) => b.session), 0) || "—") : "—"))}
          </Ligne>
          <Ligne titre="Élèves">
            {etabs.map((e) => {
              const x = dernier(e.effectifs);
              return x ? `${x.eleves} (rentrée ${x.rentree})` : "—";
            })}
          </Ligne>
          <Ligne titre="Options">
            {etabs.map((e) =>
              e.options.filter((o) => !["restauration", "maternelle", "elementaire"].includes(o)).map((o) => OPTION_LIBELLE[o]).join(", ") || "—",
            )}
          </Ligne>
          <Ligne titre="Langues moins répandues">{etabs.map((e) => languesRares(e).join(", ") || "—")}</Ligne>
          <Ligne titre="Contact">{etabs.map((e) => [e.telephone, e.mail].filter(Boolean).join(" · ") || "—")}</Ligne>
        </div>
      </div>
      <Sources sources={sources} cles={["annuaire", "ivac", "ival_gt", "ival_pro", "ips_colleges", "ips_lycees", "ips_ecoles"]} />
      <p className="mt-2 text-xs text-gray-600">
        Estimation à partir de données publiques ; ne remplace ni la visite de l&apos;établissement ni la démarche
        officielle d&apos;inscription.
      </p>
    </div>
  );
}
