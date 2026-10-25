"use client";

import { BoutonExportPdf } from "@vie-fr/ui";
import { dateLongue, qrCodeDataUrl } from "@vie-fr/fr-data";
import { useEffect, useMemo, useRef, useState } from "react";
import { evaluer, montantAnnuel, type Confiance, type ResultatAide, type Situation } from "../moteur";
import { euros } from "../moteur/outils";
import { baremes } from "../moteur/baremes";
import { encoderSituation, normaliserSituation } from "../lib/partage";
import { Bouton } from "./champs";
import { QuestionInline } from "./QuestionInline";

type Maj = (f: (s: Situation) => void) => void;

const BADGES: Record<Confiance, { texte: string; classe: string }> = {
  probable: { texte: "Probable", classe: "bg-green-100 text-green-900 border-green-800" },
  possible: { texte: "Possible", classe: "bg-blue-100 text-blue-900 border-blue-900" },
  a_verifier: { texte: "À vérifier", classe: "bg-amber-100 text-amber-900 border-amber-800" },
};

function Badge({ c }: { c: Confiance }) {
  return <span className={`inline-block rounded border px-2 py-0.5 text-sm font-medium ${BADGES[c].classe}`}>{BADGES[c].texte}</span>;
}

function Montant({ r }: { r: ResultatAide }) {
  if (r.montantEstime === null) {
    return <p className="text-lg font-bold text-blue-900">Droit à faire valoir (pas de montant chiffré)</p>;
  }
  return (
    <p className="text-2xl font-bold text-blue-900">
      {euros(r.montantEstime)} <span className="text-base font-normal">{r.periodicite === "mensuel" ? "par mois" : "par an"}</span>
    </p>
  );
}

function Sources({ r }: { r: ResultatAide }) {
  return (
    <details className="mt-2 text-xs text-gray-700 print:block">
      <summary className="cursor-pointer print:hidden">Sources et date de vérification</summary>
      <ul className="mt-1 list-disc pl-5">
        {r.sources.map((s) => (
          <li key={s.source} className="break-all">
            {s.source.startsWith("http") ? (
              <a href={s.source} className="underline" target="_blank" rel="noreferrer">
                {s.source}
              </a>
            ) : (
              s.source
            )}
            {s.date_effet && s.date_effet !== "A_VERIFIER" && <> — en vigueur depuis le {s.date_effet}</>} — vérifié le {s.verifie_le}
            {s.statut === "A_VERIFIER" && <strong> (valeur à vérifier)</strong>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function CarteAide({ r, s, maj }: { r: ResultatAide; s: Situation; maj: Maj }) {
  return (
    <li className="break-inside-avoid border-l-4 border-blue-900 bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-bold">{r.nom}</h3>
        <Badge c={r.confiance} />
      </div>
      <Montant r={r} />
      <p className="mt-2">{r.explication}</p>
      {r.questions.length > 0 && (
        <div className="mt-3 rounded bg-gray-50 p-3 print:hidden">
          <p className="mb-2 text-sm font-medium">{r.confiance === "a_verifier" ? "Pour vérifier, répondez ici :" : "Pour affiner (facultatif) :"}</p>
          {r.questions.map((q) => (
            <QuestionInline key={q} id={q} s={s} maj={maj} />
          ))}
        </div>
      )}
      <p className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={r.lien}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 print:bg-white print:p-0 print:text-blue-900 print:underline"
        >
          Faire la démarche officielle<span className="sr-only"> pour {r.nom} (nouvel onglet)</span>
        </a>
        <span className="text-sm text-gray-700">{r.organisme}</span>
        <span className="hidden text-xs print:inline">{r.lien}</span>
      </p>
      <Sources r={r} />
    </li>
  );
}

export function Resultats({ s, maj, modifier }: { s: Situation; maj: Maj; modifier: () => void }) {
  const bilan = useMemo(() => evaluer(s), [s]);
  const [lien, setLien] = useState("");
  const [copie, setCopie] = useState(false);
  const [qr, setQr] = useState("");
  const [erreurImport, setErreurImport] = useState("");
  const fichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = `${window.location.origin}${window.location.pathname}#s=${encoderSituation(s)}`;
    setLien(url);
    window.history.replaceState(null, "", `#s=${encoderSituation(s)}`);
    qrCodeDataUrl(url, 160).then(setQr, () => setQr(""));
  }, [s]);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  const exporter = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ma-situation-aides.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importer = async (f: File) => {
    try {
      const sit = normaliserSituation(JSON.parse(await f.text()));
      if (!sit) throw new Error();
      setErreurImport("");
      maj((x) => Object.assign(x, sit));
    } catch {
      setErreurImport("Ce fichier n'est pas une situation valide.");
    }
  };

  const avecMontant = bilan.eligibles.filter((r) => r.montantEstime !== null && r.montantEstime > 0);
  const sansMontant = bilan.eligibles.filter((r) => !(r.montantEstime !== null && r.montantEstime > 0));

  return (
    <section aria-labelledby="titre-resultats">
      <h2 id="titre-resultats" className="sr-only">
        Résultats
      </h2>
      <div className="mb-6 border-l-4 border-blue-900 bg-blue-50 p-4">
        <p className="font-medium">Total estimé des aides avec un montant</p>
        <p className="text-4xl font-bold text-blue-900">
          {euros(bilan.totalAnnuel)} <span className="text-lg font-normal">par an</span>
        </p>
        <p className="text-sm text-gray-700">
          soit environ {euros(bilan.totalAnnuel / 12)} par mois, dont {euros(bilan.totalAnnuelProbable)} par an pour les aides « probables ». Les aides «
          à vérifier » ne sont pas comptées.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          <strong>Estimation</strong> faite avec les barèmes vérifiés le {dateLongue(new Date(baremes._genere_le))}. Elle ne remplace pas la simulation officielle ni la
          demande auprès de chaque organisme.
        </p>
      </div>

      {bilan.eligibles.length === 0 && <p className="mb-6">Nous n&apos;avons trouvé aucune aide probable pour votre situation.</p>}

      <ol className="space-y-4">
        {avecMontant.map((r) => (
          <CarteAide key={r.id} r={r} s={s} maj={maj} />
        ))}
      </ol>

      {sansMontant.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-xl font-bold">Autres droits possibles (sans montant chiffré)</h3>
          <ol className="space-y-4">
            {sansMontant.map((r) => (
              <CarteAide key={r.id} r={r} s={s} maj={maj} />
            ))}
          </ol>
        </>
      )}

      <details className="mt-8 print:hidden">
        <summary className="cursor-pointer font-medium">Aides auxquelles vous n&apos;avez probablement pas droit ({bilan.nonEligibles.length})</summary>
        <ul className="mt-3 space-y-3">
          {bilan.nonEligibles.map((r) => (
            <li key={r.id} className="border-l-4 border-gray-300 pl-3">
              <p className="font-medium">
                {r.nom}
                {montantAnnuel(r) === 0 && r.confiance !== "probable" && <span className="text-sm font-normal"> — résultat proche d&apos;un seuil</span>}
              </p>
              <p className="text-sm">{r.explication}</p>
              {r.questions.map((q) => (
                <QuestionInline key={q} id={q} s={s} maj={maj} />
              ))}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-8 border-t pt-6 print:hidden">
        <h3 className="mb-3 text-xl font-bold">Garder ou partager ce résultat</h3>
        <div className="flex flex-wrap gap-3">
          <BoutonExportPdf libelle="Télécharger le récapitulatif PDF" />
          <Bouton secondaire onClick={copier}>
            {copie ? "Lien copié !" : "Copier le lien de partage"}
          </Bouton>
          <Bouton secondaire onClick={exporter}>
            Exporter (JSON)
          </Bouton>
          <Bouton secondaire onClick={() => fichier.current?.click()}>
            Importer (JSON)
          </Bouton>
          <input
            ref={fichier}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importer une situation au format JSON"
            onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])}
          />
          <Bouton secondaire onClick={modifier}>
            Modifier mes réponses
          </Bouton>
        </div>
        {erreurImport && <p className="mt-2 text-red-800">{erreurImport}</p>}
        <p className="mt-3 text-sm text-gray-700">
          Le lien contient vos réponses (âges, montants, commune), jamais votre nom ni votre adresse. Toute personne qui l&apos;ouvre verra
          ces informations.
        </p>
      </div>

      <div className="mt-6 hidden items-center gap-4 print:flex">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code du lien vers ce résultat" width={120} height={120} />
        )}
        <p className="text-xs break-all">Retrouver et mettre à jour ce résultat : {lien}</p>
      </div>
    </section>
  );
}
