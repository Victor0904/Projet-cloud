"use client";

import { useEffect, useMemo, useState } from "react";
import type { Analyse } from "../lib/analyse";
import { REGLES } from "../lib/analyse";
import { genererLettre, lettreEnTexte } from "../lib/lettre";
import type { Saisie } from "../lib/saisie";

const CLE = "vie-fr/05-loyer/lettre";
type Coordonnees = { locataireNom: string; locataireAdresse: string; bailleurNom: string; bailleurAdresse: string };
const VIDE: Coordonnees = { locataireNom: "", locataireAdresse: "", bailleurNom: "", bailleurAdresse: "" };

const classeChamp =
  "mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700";

export function LettreMiseEnDemeure({ analyse: a, saisie, aujourdhui }: { analyse: Analyse; saisie: Saisie; aujourdhui: string }) {
  const [c, setC] = useState<Coordonnees>(VIDE);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    try {
      const b = localStorage.getItem(CLE);
      if (b) setC({ ...VIDE, ...(JSON.parse(b) as Partial<Coordonnees>) });
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const maj = (k: keyof Coordonnees, v: string) => {
    const n = { ...c, [k]: v };
    setC(n);
    try {
      localStorage.setItem(CLE, JSON.stringify(n));
    } catch {
      /* stockage indisponible */
    }
  };

  const lettre = useMemo(
    () =>
      genererLettre({
        ...c,
        adresseLogement: saisie.adresse?.label ?? saisie.adresseTexte,
        ville: a.ville.nom,
        dateSignature: saisie.dateSignature,
        dateLettre: aujourdhui,
        surface: a.verdict.surface,
        loyerBase: a.verdict.loyerBase,
        plafond: a.verdict.plafond,
        loyerDemande: Math.min(a.verdict.loyerBase, a.verdict.plafond),
        loyerReferenceMajoreM2: a.reference.majore,
        depassementMensuel: a.verdict.depassementMensuel,
        complement: a.verdict.complement,
        complementContestable: a.complement.contestable,
        raisonsComplement: a.complement.raisons,
        tropPercu: a.tropPercu.montant,
        tropPercuDepuis: a.tropPercu.depuis,
        delaiReponseJours: REGLES.depassement.delai_reponse_lettre_jours,
        arrete: a.millesime.arrete,
      }),
    [c, a, saisie, aujourdhui],
  );

  function imprimer() {
    document.body.dataset.impression = "lettre";
    const fin = () => {
      delete document.body.dataset.impression;
      window.removeEventListener("afterprint", fin);
    };
    window.addEventListener("afterprint", fin);
    window.print();
  }

  const champ = (k: keyof Coordonnees, label: string, multi = false) => (
    <div className="mb-3">
      <label htmlFor={`lettre-${k}`} className="block font-medium">
        {label}
      </label>
      {multi ? (
        <textarea id={`lettre-${k}`} rows={2} value={c[k]} onChange={(e) => maj(k, e.target.value)} className={classeChamp} />
      ) : (
        <input id={`lettre-${k}`} type="text" value={c[k]} onChange={(e) => maj(k, e.target.value)} className={classeChamp} />
      )}
    </div>
  );

  return (
    <section aria-labelledby="titre-lettre" className="mt-8">
      <h2 id="titre-lettre" className="text-xl font-bold print:hidden">
        Votre lettre de mise en demeure
      </h2>
      <div className="mt-3 grid gap-x-4 sm:grid-cols-2 print:hidden">
        {champ("locataireNom", "Vos nom et prénom")}
        {champ("bailleurNom", "Nom du bailleur ou de l'agence")}
        {champ("locataireAdresse", "Votre adresse", true)}
        {champ("bailleurAdresse", "Adresse du bailleur", true)}
      </div>
      <p className="text-sm text-gray-600 print:hidden">Ces informations restent dans votre navigateur.</p>

      <article data-imprimable="lettre" className="mt-4 border border-gray-300 bg-white p-6 font-serif leading-relaxed print:border-0 print:p-0">
        <div>
          {lettre.expediteur.map((l, i) => (
            <p key={i} className="whitespace-pre-line">
              {l}
            </p>
          ))}
        </div>
        <div className="mt-4 text-right">
          {lettre.destinataire.map((l, i) => (
            <p key={i} className="whitespace-pre-line">
              {l}
            </p>
          ))}
        </div>
        <p className="mt-4 text-right">{lettre.lieuDate}</p>
        <p className="mt-4 font-bold">Objet : {lettre.objet}</p>
        {lettre.corps.map((p, i) => (
          <p key={i} className="mt-3">
            {p}
          </p>
        ))}
      </article>

      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={imprimer}
          className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
        >
          Télécharger la lettre en PDF
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(lettreEnTexte(lettre)).then(() => setCopie(true));
          }}
          className="rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
        >
          {copie ? "Lettre copiée ✓" : "Copier le texte"}
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-600 print:hidden">
        Pour le PDF, choisissez « Enregistrer au format PDF » dans la fenêtre d&apos;impression. Relisez la lettre avant de
        l&apos;envoyer : c&apos;est un modèle, pas un conseil juridique.
      </p>
    </section>
  );
}
