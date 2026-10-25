"use client";

import { BoutonExportPdf } from "@vie-fr/ui";
import { useId, useState } from "react";
import {
  CATEGORIES,
  ORGANISMES,
  VERIFIE_LE_ORGANISMES,
  delai as trouverDelai,
  nomCanal,
  type CategorieOrganisme,
  type TypeLettre,
} from "../lib/donnees";
import { LIBELLES_STATUT, type ElementInventaire, type StatutSuivi } from "../etat/etat";
import { Bouton, Encart, Source, classeChamp } from "./ui";

const STATUTS = Object.entries(LIBELLES_STATUT) as [StatutSuivi, string][];

function LigneSuivi({
  el,
  onStatut,
  onModifier,
  onRetirer,
  onLettre,
}: {
  el: ElementInventaire;
  onStatut: (s: StatutSuivi) => void;
  onModifier: (champs: Partial<ElementInventaire>) => void;
  onRetirer: () => void;
  onLettre?: () => void;
}) {
  const id = useId();
  return (
    <li className="border border-gray-400 p-3 break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">{el.nom}</p>
        <Bouton variante="lien" className="text-sm" onClick={onRetirer} aria-label={`Retirer ${el.nom} de la liste`}>
          Retirer
        </Bouton>
      </div>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-statut`} className="block text-sm font-medium">
            Où en est-on ?
          </label>
          <select
            id={`${id}-statut`}
            value={el.statut}
            onChange={(e) => onStatut(e.target.value as StatutSuivi)}
            className={classeChamp}
          >
            {STATUTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-ref`} className="block text-sm font-medium">
            Numéro de contrat ou de client
          </label>
          <input
            id={`${id}-ref`}
            value={el.reference}
            onChange={(e) => onModifier({ reference: e.target.value })}
            className={classeChamp}
          />
        </div>
        <div>
          <label htmlFor={`${id}-envoi`} className="block text-sm font-medium">
            Contacté le
          </label>
          <input
            id={`${id}-envoi`}
            type="date"
            value={el.dateEnvoi}
            onChange={(e) => onModifier({ dateEnvoi: e.target.value })}
            className={classeChamp}
          />
        </div>
        <div>
          <label htmlFor={`${id}-rep`} className="block text-sm font-medium">
            Réponse ou clôture le
          </label>
          <input
            id={`${id}-rep`}
            type="date"
            value={el.dateReponse}
            onChange={(e) => onModifier({ dateReponse: e.target.value })}
            className={classeChamp}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-note`} className="block text-sm font-medium">
            Note (qui s&apos;en occupe, interlocuteur…)
          </label>
          <input
            id={`${id}-note`}
            value={el.note}
            onChange={(e) => onModifier({ note: e.target.value })}
            className={classeChamp}
          />
        </div>
      </div>
      {onLettre && (
        <Bouton variante="secondaire" className="mt-3 text-sm" onClick={onLettre}>
          Préparer le courrier
        </Bouton>
      )}
    </li>
  );
}

export function VueInventaire({
  inventaire,
  suggeres,
  onAjouter,
  onAjouterSuggeres,
  onAjouterLibre,
  onRetirer,
  onStatut,
  onModifier,
  onLettre,
}: {
  inventaire: ElementInventaire[];
  suggeres: string[];
  onAjouter: (organismeId: string) => void;
  onAjouterSuggeres: () => void;
  onAjouterLibre: (nom: string, reference: string) => void;
  onRetirer: (id: string) => void;
  onStatut: (id: string, s: StatutSuivi) => void;
  onModifier: (id: string, champs: Partial<ElementInventaire>) => void;
  onLettre: (type: TypeLettre, organisme: string | null, reference: string, nom: string) => void;
}) {
  const [nom, setNom] = useState("");
  const [ref, setRef] = useState("");
  const presents = new Set(inventaire.map((e) => e.organismeId).filter(Boolean));
  const manquants = suggeres.filter((s) => !presents.has(s)).length;
  const compte = (s: StatutSuivi) => inventaire.filter((e) => e.statut === s).length;
  const categories = Object.keys(CATEGORIES) as CategorieOrganisme[];

  return (
    <section aria-labelledby="titre-inventaire">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-inventaire" className="text-xl font-bold">
          Contrats et organismes à prévenir
        </h2>
        <BoutonExportPdf libelle="Imprimer la liste" />
      </div>
      <p className="mt-2 text-gray-700">
        Cochez dans le catalogue ce qui existait, ajoutez les contrats qui n&apos;y figurent pas, puis suivez où en est
        chaque démarche. Astuce : les relevés bancaires des derniers mois font apparaître presque tous les abonnements.
      </p>

      {manquants > 0 && (
        <Bouton className="mt-4" onClick={onAjouterSuggeres}>
          Ajouter les {manquants} organismes de mon plan
        </Bouton>
      )}

      <section aria-labelledby="titre-suivi" className="mt-6">
        <h3 id="titre-suivi" className="text-lg font-bold">
          Votre suivi
        </h3>
        {inventaire.length === 0 ? (
          <p className="mt-2 text-gray-700">Rien pour l&apos;instant. Cochez des organismes ci-dessous.</p>
        ) : (
          <>
            <p className="mt-1 text-gray-700" aria-live="polite">
              {compte("a_prevenir")} à prévenir · {compte("en_attente")} en attente de réponse · {compte("fait")} fait
              {compte("fait") > 1 ? "s" : ""}
            </p>
            <ul className="mt-3 space-y-3">
              {inventaire.map((el) => {
                const org = el.organismeId ? ORGANISMES.find((o) => o.id === el.organismeId) : undefined;
                const type: TypeLettre | null = org ? org.lettre : "resiliation";
                return (
                  <LigneSuivi
                    key={el.id}
                    el={el}
                    onStatut={(s) => onStatut(el.id, s)}
                    onModifier={(c) => onModifier(el.id, c)}
                    onRetirer={() => onRetirer(el.id)}
                    onLettre={type ? () => onLettre(type, el.organismeId, el.reference, org ? "" : el.nom) : undefined}
                  />
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="titre-libre" className="mt-8 print:hidden">
        <h3 id="titre-libre" className="text-lg font-bold">
          Ajouter un contrat absent du catalogue
        </h3>
        <form
          className="mt-2 grid gap-x-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            onAjouterLibre(nom, ref);
            setNom("");
            setRef("");
          }}
        >
          <div className="mb-4">
            <label htmlFor="libre-nom" className="block font-medium">
              Nom (ex. salle de sport, journal, association)
            </label>
            <input id="libre-nom" value={nom} onChange={(e) => setNom(e.target.value)} className={classeChamp} />
          </div>
          <div className="mb-4">
            <label htmlFor="libre-ref" className="block font-medium">
              Référence (facultatif)
            </label>
            <input id="libre-ref" value={ref} onChange={(e) => setRef(e.target.value)} className={classeChamp} />
          </div>
          <div className="mb-4">
            <Bouton type="submit" disabled={!nom.trim()}>
              Ajouter
            </Bouton>
          </div>
        </form>
      </section>

      <section aria-labelledby="titre-catalogue" className="mt-8 print:hidden">
        <h3 id="titre-catalogue" className="text-lg font-bold">
          Catalogue des organismes
        </h3>
        <Encart>
          Les liens et procédures du catalogue n&apos;ont pas tous pu être vérifiés sur les sites officiels lors de la
          création de l&apos;outil : ceux marqués « à confirmer » doivent être vérifiés avant de vous y fier.
        </Encart>
        {categories.map((cat) => {
          const liste = ORGANISMES.filter((o) => o.categorie === cat);
          if (liste.length === 0) return null;
          return (
            <fieldset key={cat} className="mt-4">
              <legend className="font-bold text-blue-900">{CATEGORIES[cat]}</legend>
              <ul className="mt-2 space-y-2">
                {liste.map((o) => {
                  const coche = presents.has(o.id);
                  return (
                    <li key={o.id} className="border-b border-gray-200 pb-2">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={coche}
                          onChange={() => (coche ? onRetirer(o.id) : onAjouter(o.id))}
                          className="mt-1 h-5 w-5 shrink-0 accent-blue-900"
                        />
                        <span>
                          <span className="font-medium">{o.nom}</span>
                          {suggeres.includes(o.id) && (
                            <span className="ml-2 rounded bg-blue-100 px-1 text-xs text-blue-900">dans votre plan</span>
                          )}
                        </span>
                      </label>
                      <details className="ml-7 mt-1 text-sm">
                        <summary className="cursor-pointer text-blue-900 underline">Comment faire</summary>
                        <p className="mt-1">{o.role}</p>
                        {o.procedure && <p className="mt-1">{o.procedure}</p>}
                        <p className="mt-1">
                          <span className="font-medium">Comment : </span>
                          {o.canaux.map((c) => nomCanal(c).toLowerCase()).join(", ")} (conseillé :{" "}
                          {nomCanal(o.canal_conseille).toLowerCase()}).
                        </p>
                        <p className="mt-1">
                          <span className="font-medium">Quand : </span>
                          {trouverDelai(o.delai).libelle.toLowerCase()}.
                        </p>
                        <p className="mt-1">
                          <span className="font-medium">Pièces : </span>
                          {o.pieces.join(" ; ")}.
                        </p>
                        <p className="mt-1">
                          <a href={o.lien} target="_blank" rel="noreferrer" className="underline break-all">
                            Page officielle ou d&apos;aide
                          </a>
                        </p>
                        <Source source={o.source} verifieLe={VERIFIE_LE_ORGANISMES} statut={o.statut} />
                      </details>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </section>
    </section>
  );
}
