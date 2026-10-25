"use client";

import { dateCourte, dateLongue, euros } from "@vie-fr/fr-data";
import type { ReactNode } from "react";
import type { TypeCourrier } from "@/donnees/types";
import { calculerDelais, verifierControles, type DatesDepart } from "@/decodeur";
import { joursRestants, libelleDate } from "@/delais/calcul";
import type { Extraction } from "@/extraction/extraire";
import { Source } from "./Source";

function Bloc({ titre, numero, children }: { titre: string; numero: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid border-l-4 border-blue-900 bg-blue-50 p-4" aria-label={titre}>
      <h3 className="text-lg font-bold text-blue-900">
        <span aria-hidden="true" className="mr-2 inline-block w-6 rounded-full bg-blue-900 text-center text-white">
          {numero}
        </span>
        {titre}
      </h3>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

const LIBELLE_DEPART = {
  reception: "à partir de la réception du courrier",
  date_courrier: "à partir de la date du courrier",
  date_limite_courrier: "date fixée par le courrier",
} as const;

export function FicheDecodage({
  type,
  extraction,
  dates,
  aujourdhui,
  alsaceMoselle,
}: {
  type: TypeCourrier;
  extraction: Extraction;
  dates: DatesDepart;
  aujourdhui: Date;
  alsaceMoselle: boolean;
}) {
  const delais = calculerDelais(type, dates, alsaceMoselle);
  const alertes = verifierControles(type, extraction.montants);
  const principal = extraction.montantPrincipal;

  return (
    <div className="space-y-4">
      <Bloc numero="1" titre="C'est quoi ?">
        <p>{type.cestQuoi}</p>
        {(principal || extraction.dateCourrier) && (
          <p>
            {extraction.dateCourrier && (
              <>
                Courrier daté du <strong>{dateLongue(extraction.dateCourrier.date)}</strong>.{" "}
              </>
            )}
            {principal && (
              <>
                Montant principal repéré : <strong>{euros(principal.valeur)}</strong> (lu dans le texte : « {principal.brut} »).
              </>
            )}
          </p>
        )}
      </Bloc>

      <Bloc numero="2" titre="Ce que je risque">
        <ul className="list-disc space-y-1 pl-5">
          {type.risques.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {alertes.map(({ controle, montant }) => (
          <div key={montant.index} role="alert" className="border-l-4 border-red-700 bg-red-50 p-3">
            <p className="font-bold text-red-900">
              Attention : {euros(montant.valeur)} de {controle.libelle.toLowerCase()} — au-delà du plafond de{" "}
              {euros(controle.plafond)}.
            </p>
            <p>{controle.message} Vous pouvez en demander le remboursement.</p>
            <Source source={controle.source} verifieLe={controle.verifie_le} statut={controle.statut} reference={controle.reference_legale} />
          </div>
        ))}
      </Bloc>

      <Bloc numero="3" titre="Ce que je dois faire">
        <ol className="list-decimal space-y-1 pl-5">
          {type.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </Bloc>

      <Bloc numero="4" titre="Délai">
        <ul className="space-y-4">
          {delais.map(({ delai, calcul, manque }) => {
            const reste = calcul ? joursRestants(aujourdhui, calcul.date) : null;
            return (
              <li key={delai.id} className="rounded border border-blue-200 bg-white p-3">
                <p className="font-medium">{delai.libelle}</p>
                {calcul ? (
                  <>
                    <p className="mt-1 text-2xl font-bold text-blue-900">Avant le {libelleDate(calcul.date)}</p>
                    {reste !== null && (
                      <p className={reste < 0 ? "font-bold text-red-800" : reste <= 7 ? "font-bold text-amber-900" : ""}>
                        {reste < 0
                          ? `Ce délai semble dépassé depuis ${-reste} jour${reste < -1 ? "s" : ""}. Agissez quand même : certains recours restent possibles (demandez conseil).`
                          : reste === 0
                            ? "C'est aujourd'hui le dernier jour."
                            : `Il reste ${reste} jour${reste > 1 ? "s" : ""}.`}
                      </p>
                    )}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sm underline">Voir le calcul</summary>
                      <ol className="mt-1 list-decimal pl-5 text-sm">
                        {delai.duree !== undefined && delai.unite && (
                          <li>
                            Durée : {delai.unite === "fin_annee" ? `jusqu'au 31 décembre de l'année N+${delai.duree}` : `${delai.duree} ${delai.unite}`}
                            {delai.mode === "franc" ? " (jours francs)" : delai.mode === "ouvre" ? " (jours ouvrés)" : delai.unite === "jours" ? " (jours calendaires)" : ""}
                            , {LIBELLE_DEPART[delai.depart]}.
                          </li>
                        )}
                        {calcul.etapes.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ol>
                    </details>
                  </>
                ) : (
                  <p className="mt-1 text-amber-900">{manque}</p>
                )}
                {delai.explication && <p className="mt-1 text-sm">{delai.explication}</p>}
                {delai.depart !== "date_limite_courrier" && (
                  <Source source={delai.source} verifieLe={delai.verifie_le} statut={delai.statut} reference={delai.reference_legale} />
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-gray-700">
          Calcul indicatif : la date retenue est la plus prudente (sans report de week-end ni de jour férié). Le délai réel
          dépend de la date exacte de notification ; en cas de doute, agissez au plus tôt et gardez une preuve d&apos;envoi.
          {dates.reception && <> Date de réception retenue : {dateCourte(dates.reception)}.</>}
        </p>
      </Bloc>
    </div>
  );
}
