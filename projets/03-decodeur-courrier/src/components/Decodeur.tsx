"use client";

import { BoutonExportPdf } from "@vie-fr/ui";
import { lireDate } from "@vie-fr/fr-data";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ORGANISMES, TYPES } from "@/donnees";
import { classer, typeParId } from "@/classif/classifieur";
import { aMinuitUTC } from "@/delais/calcul";
import { extraire } from "@/extraction/extraire";
import { effacer, ecrire, lire, telecharger } from "@/lib/stockage";
import { FicheDecodage } from "./FicheDecodage";
import { GenerateurLettre } from "./GenerateurLettre";
import { Orientation } from "./Orientation";
import { Saisie } from "./Saisie";
import { TexteSurligne } from "./TexteSurligne";

const CLE_SESSION = "decodeur-courrier:dernier";
type Sauvegarde = { version: 1; texte: string; typeChoisi: string | null; reception: string; alsaceMoselle: boolean };

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const ORDRE_ORGANISMES = [...new Set(TYPES.map((t) => t.organisme))];

function Section({ titre, children, className = "" }: { titre: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`mt-8 ${className}`}>
      <h2 id={id} className="mb-3 text-xl font-bold">
        {titre}
      </h2>
      {children}
    </section>
  );
}

export function Decodeur() {
  const [texte, setTexte] = useState("");
  const [analyse, setAnalyse] = useState<string | null>(null); // texte effectivement décodé
  const [typeChoisi, setTypeChoisi] = useState<string | null>(null);
  const [reception, setReception] = useState("");
  const [alsaceMoselle, setAlsaceMoselle] = useState(false);
  const [glossaire, setGlossaire] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const titreResultat = useRef<HTMLHeadingElement>(null);

  const classification = useMemo(() => (analyse ? classer(analyse) : null), [analyse]);
  const extraction = useMemo(() => (analyse ? extraire(analyse) : null), [analyse]);
  const type = typeChoisi ? typeParId(typeChoisi) : (classification?.meilleur?.type ?? null);

  // Reprise de la dernière analyse (stockée uniquement dans ce navigateur).
  useEffect(() => {
    const s = lire<Sauvegarde | null>(CLE_SESSION, null);
    if (s?.version === 1 && s.texte) {
      setTexte(s.texte);
      setAnalyse(s.texte);
      setTypeChoisi(s.typeChoisi);
      setReception(s.reception);
      setAlsaceMoselle(s.alsaceMoselle);
    }
  }, []);
  useEffect(() => {
    if (analyse) ecrire(CLE_SESSION, { version: 1, texte: analyse, typeChoisi, reception, alsaceMoselle } satisfies Sauvegarde);
  }, [analyse, typeChoisi, reception, alsaceMoselle]);

  function decoder(t: string) {
    setAnalyse(t);
    setTypeChoisi(null);
    setGlossaire(false);
    setReception(iso(extraire(t).dateCourrier?.date));
    setMessage(null);
    requestAnimationFrame(() => titreResultat.current?.focus());
  }

  function toutEffacer() {
    effacer(CLE_SESSION);
    setTexte("");
    setAnalyse(null);
    setTypeChoisi(null);
    setReception("");
  }

  function exporter() {
    const s: Sauvegarde = { version: 1, texte: analyse ?? texte, typeChoisi, reception, alsaceMoselle };
    telecharger(`decodage-courrier-${iso(new Date())}.json`, JSON.stringify(s, null, 2));
  }

  async function importer(f: File | undefined) {
    if (!f) return;
    try {
      const s = JSON.parse(await f.text()) as Sauvegarde;
      if (s.version !== 1 || typeof s.texte !== "string") throw new Error();
      setTexte(s.texte);
      setAnalyse(s.texte);
      setTypeChoisi(s.typeChoisi && typeParId(s.typeChoisi) ? s.typeChoisi : null);
      setReception(s.reception ?? "");
      setAlsaceMoselle(!!s.alsaceMoselle);
      setMessage("Décodage importé.");
    } catch {
      setMessage("Ce fichier n'est pas un export du décodeur.");
    }
  }

  const dateReception = lireDate(reception);
  const aujourdhui = aMinuitUTC(new Date());

  return (
    <div>
      <p className="mb-4 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm">
        <strong>Ceci est une aide à la compréhension</strong>, pas un conseil juridique. L&apos;outil repère des mots et des
        dates dans votre courrier : il peut se tromper. Vérifiez toujours le courrier original et, en cas de doute,
        contactez l&apos;organisme ou un point-justice. <strong>Votre courrier n&apos;est envoyé nulle part</strong> : tout est
        analysé dans votre navigateur, même hors connexion.
      </p>

      <Saisie texte={texte} onTexte={setTexte} onDecoder={decoder} />

      {analyse && classification && extraction && (
        <div className="mt-8" aria-live="polite">
          <h2 ref={titreResultat} tabIndex={-1} className="text-xl font-bold focus:outline-none">
            2. Ce que dit ce courrier
          </h2>

          <div className="mt-2 rounded border p-3 print:border-0 print:p-0">
            {type ? (
              <p>
                Type de courrier : <strong className="text-lg">{type.libelle}</strong>
                {!typeChoisi && classification.meilleur && (
                  <span className="ml-2 text-sm text-gray-700">
                    (fiabilité de la détection : {classification.confiance >= 0.75 ? "bonne" : classification.confiance >= 0.6 ? "moyenne" : "faible"} —
                    mots repérés : {classification.meilleur.indices.slice(0, 5).join(", ")})
                  </span>
                )}
              </p>
            ) : (
              <p className="font-medium text-amber-900">
                Nous n&apos;avons pas reconnu ce type de courrier. Choisissez-le dans la liste ci-dessous si vous le connaissez.
              </p>
            )}
            <div className="mt-2 print:hidden">
              <label htmlFor="choix-type" className="block text-sm font-medium">
                {type ? "Ce n'est pas ça ? Choisissez le bon type :" : "Type de courrier :"}
              </label>
              <select
                id="choix-type"
                value={type?.id ?? ""}
                onChange={(e) => setTypeChoisi(e.target.value || null)}
                className="mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 sm:w-auto"
              >
                <option value="">— Choisir —</option>
                {ORDRE_ORGANISMES.map((o) => (
                  <optgroup key={o} label={ORGANISMES.find((x) => x.id === o)?.nom ?? o}>
                    {TYPES.filter((t) => t.organisme === o).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.libelle}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <details className="mt-3 rounded border p-3 print:hidden">
            <summary className="cursor-pointer font-medium">Ce que l&apos;outil a lu dans le texte</summary>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-bold">Montants</dt>
                <dd>{extraction.montants.length ? extraction.montants.map((m) => m.brut).join(" ; ") : "aucun"}</dd>
              </div>
              <div>
                <dt className="font-bold">Dates</dt>
                <dd>
                  {extraction.dates.length
                    ? extraction.dates
                        .map((d) => `${d.brut}${d === extraction.dateCourrier ? " (date du courrier)" : d === extraction.dateLimite ? " (date limite)" : ""}`)
                        .join(" ; ")
                    : "aucune"}
                </dd>
              </div>
              <div>
                <dt className="font-bold">Références</dt>
                <dd>{extraction.references.length ? extraction.references.map((r) => `${r.libelle} : ${r.valeur}`).join(" ; ") : "aucune"}</dd>
              </div>
            </dl>
          </details>

          {type && (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-4 print:hidden">
                <div>
                  <label htmlFor="reception" className="block font-medium">
                    Date de réception du courrier
                  </label>
                  <p id="reception-aide" className="text-xs text-gray-700">
                    Pour un recommandé : date de première présentation par La Poste.
                  </p>
                  <input
                    id="reception"
                    type="date"
                    aria-describedby="reception-aide"
                    value={reception}
                    onChange={(e) => setReception(e.target.value)}
                    className="mt-1 rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2"
                  />
                </div>
                <button type="button" className="text-sm underline" onClick={() => setReception(iso(aujourdhui))}>
                  Je l&apos;ai reçu aujourd&apos;hui
                </button>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={alsaceMoselle} onChange={(e) => setAlsaceMoselle(e.target.checked)} />
                  J&apos;habite en Alsace-Moselle (jours fériés locaux)
                </label>
              </div>

              <div className="mt-4">
                <FicheDecodage
                  type={type}
                  extraction={extraction}
                  dates={{
                    reception: dateReception,
                    dateCourrier: extraction.dateCourrier?.date ?? null,
                    dateLimite: extraction.dateLimite?.date ?? null,
                  }}
                  aujourdhui={aujourdhui}
                  alsaceMoselle={alsaceMoselle}
                />
              </div>

              <Section titre="3. Je ne comprends toujours pas" className="print:hidden">
                <button
                  type="button"
                  aria-expanded={glossaire}
                  onClick={() => setGlossaire(!glossaire)}
                  className="rounded border-2 border-amber-600 px-4 py-2 font-medium text-amber-900 hover:bg-amber-50 focus:outline-2 focus:outline-blue-700"
                >
                  {glossaire ? "Masquer le texte expliqué" : "Expliquer les mots difficiles de mon courrier"}
                </button>
                {glossaire && (
                  <div className="mt-3">
                    <TexteSurligne texte={analyse} />
                  </div>
                )}
              </Section>

              <Section titre="4. Ma réponse, prête à envoyer" className="print:hidden">
                <GenerateurLettre key={type.id} type={type} extraction={extraction} reception={dateReception} />
              </Section>

              <Section titre="5. Qui peut m'aider gratuitement ?">
                <Orientation type={type} />
              </Section>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-4 print:hidden">
                <BoutonExportPdf libelle="Imprimer la fiche de décodage" />
                <button type="button" onClick={exporter} className="rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 hover:bg-blue-50">
                  Enregistrer (fichier .json)
                </button>
                <label className="cursor-pointer rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 hover:bg-blue-50 focus-within:outline-2 focus-within:outline-blue-700">
                  Ouvrir un fichier .json
                  <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importer(e.target.files?.[0])} />
                </label>
                <button type="button" onClick={toutEffacer} className="text-sm underline">
                  Tout effacer de cet appareil
                </button>
                {message && <p role="status">{message}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
