"use client";

import { dateLongue, euros } from "@vie-fr/fr-data";
import { useEffect, useId, useMemo, useState } from "react";
import { ORGANISMES } from "@/donnees";
import type { TypeCourrier } from "@/donnees/types";
import { referencePrincipale, type Extraction } from "@/extraction/extraire";
import { LIBELLES_ENVOI, MODELES, remplir, variablesDe, type Variable } from "@/lettres/modeles";
import { ecrire, lire } from "@/lib/stockage";

const CLE_IDENTITE = "decodeur-courrier:identite";
type Identite = { nom: string; adresse: string; ville: string };

const CHAMPS: { cle: Variable; label: string; aide?: string; multiligne?: boolean }[] = [
  { cle: "destinataire", label: "Destinataire (organisme et adresse)", multiligne: true },
  { cle: "reference_libelle", label: "Type de référence", aide: "Ex. : N° allocataire, N° fiscal, N° de dossier" },
  { cle: "reference", label: "Référence du dossier" },
  { cle: "montant", label: "Montant en cause" },
  { cle: "date_courrier", label: "Date du courrier reçu" },
  { cle: "date_reception", label: "Date de réception du courrier" },
  { cle: "immatriculation", label: "Immatriculation du véhicule" },
  { cle: "mensualite", label: "Montant mensuel que vous pouvez payer", aide: "Soyez réaliste : un échéancier non respecté est souvent annulé." },
  { cle: "conducteur", label: "Conducteur désigné", aide: "Nom, prénom, adresse, date et lieu de naissance, n° de permis", multiligne: true },
  {
    cle: "motif",
    label: "Vos explications",
    aide: "Des faits précis et datés : ce qui est faux, ce que vous avez déclaré, votre situation. Joignez les preuves.",
    multiligne: true,
  },
];

const champClasse =
  "mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700";

export function GenerateurLettre({
  type,
  extraction,
  reception,
}: {
  type: TypeCourrier;
  extraction: Extraction;
  reception: Date | null;
}) {
  const id = useId();
  const [modeleId, setModeleId] = useState(type.lettres[0]);
  const modele = MODELES[modeleId] ?? MODELES[type.lettres[0]];

  const [identite, setIdentite] = useState<Identite>({ nom: "", adresse: "", ville: "" });
  const [memoriser, setMemoriser] = useState(false);
  useEffect(() => {
    const sauvee = lire<Identite | null>(CLE_IDENTITE, null);
    if (sauvee) {
      setIdentite(sauvee);
      setMemoriser(true);
    }
  }, []);
  useEffect(() => {
    if (memoriser) ecrire(CLE_IDENTITE, identite);
  }, [identite, memoriser]);

  const prerempli = useMemo((): Partial<Record<Variable, string>> => {
    const ref = referencePrincipale(extraction.references);
    const immat = extraction.references.find((r) => r.type === "immatriculation");
    const org = ORGANISMES.find((o) => o.id === type.organisme);
    return {
      destinataire: org?.nom ?? "",
      reference: ref?.valeur ?? "",
      reference_libelle: ref?.libelle ?? "Référence",
      montant: extraction.montantPrincipal ? euros(extraction.montantPrincipal.valeur) : "",
      date_courrier: extraction.dateCourrier ? dateLongue(extraction.dateCourrier.date) : "",
      date_reception: reception ? dateLongue(reception) : "",
      immatriculation: immat?.valeur ?? "",
    };
  }, [extraction, reception, type.organisme]);

  const [champs, setChamps] = useState<Partial<Record<Variable, string>>>(prerempli);
  useEffect(() => setChamps((c) => ({ ...c, ...prerempli })), [prerempli]);

  const [texteLibre, setTexteLibre] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  const utilisees = variablesDe(modele.corps);
  const texte = remplir(modele.corps, {
    ...champs,
    ...identite,
    date_jour: dateLongue(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))),
  });
  const final = texteLibre ?? texte;

  async function copier() {
    try {
      await navigator.clipboard.writeText(final);
      setCopie("Texte copié dans le presse-papiers.");
    } catch {
      setCopie("La copie automatique a échoué : sélectionnez le texte et copiez-le manuellement.");
    }
  }

  function imprimer() {
    document.body.classList.add("impression-lettre");
    const retirer = () => {
      document.body.classList.remove("impression-lettre");
      window.removeEventListener("afterprint", retirer);
    };
    window.addEventListener("afterprint", retirer);
    window.print();
    setTimeout(retirer, 1000);
  }

  const manquants = (final.match(/\[à compléter[^\]]*\]/g) ?? []).length;

  return (
    <div>
      {type.lettres.length > 1 && (
        <fieldset className="mb-4 print:hidden">
          <legend className="font-medium">Quelle lettre ?</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {type.lettres.map((l) => (
              <label
                key={l}
                className={`cursor-pointer rounded border-2 px-3 py-2 text-sm focus-within:outline-2 focus-within:outline-blue-700 ${
                  l === modeleId ? "border-blue-900 bg-blue-900 text-white" : "border-blue-900 text-blue-900"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-modele`}
                  value={l}
                  checked={l === modeleId}
                  onChange={() => {
                    setModeleId(l);
                    setTexteLibre(null);
                  }}
                  className="sr-only"
                />
                {MODELES[l].titre}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="print:hidden" onSubmit={(e) => e.preventDefault()} aria-label="Informations pour la lettre">
          <fieldset className="mb-4">
            <legend className="font-medium">Vous</legend>
            {(["nom", "adresse", "ville"] as const).map((k) => (
              <div key={k} className="mt-2">
                <label htmlFor={`${id}-${k}`} className="block text-sm font-medium">
                  {k === "nom" ? "Nom et prénom" : k === "adresse" ? "Adresse" : "Ville (pour « Fait à »)"}
                </label>
                {k === "adresse" ? (
                  <textarea
                    id={`${id}-${k}`}
                    rows={2}
                    value={identite[k]}
                    onChange={(e) => setIdentite({ ...identite, [k]: e.target.value })}
                    className={champClasse}
                    autoComplete="street-address"
                  />
                ) : (
                  <input
                    id={`${id}-${k}`}
                    value={identite[k]}
                    onChange={(e) => setIdentite({ ...identite, [k]: e.target.value })}
                    className={champClasse}
                    autoComplete={k === "nom" ? "name" : "address-level2"}
                  />
                )}
              </div>
            ))}
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={memoriser} onChange={(e) => setMemoriser(e.target.checked)} />
              Mémoriser mes coordonnées sur cet appareil (navigateur uniquement)
            </label>
          </fieldset>
          <fieldset>
            <legend className="font-medium">Le dossier</legend>
            {CHAMPS.filter((c) => utilisees.includes(c.cle)).map((c) => (
              <div key={c.cle} className="mt-2">
                <label htmlFor={`${id}-${c.cle}`} className="block text-sm font-medium">
                  {c.label}
                </label>
                {c.aide && (
                  <p id={`${id}-${c.cle}-aide`} className="text-xs text-gray-700">
                    {c.aide}
                  </p>
                )}
                {c.multiligne ? (
                  <textarea
                    id={`${id}-${c.cle}`}
                    aria-describedby={c.aide ? `${id}-${c.cle}-aide` : undefined}
                    rows={c.cle === "motif" ? 5 : 2}
                    value={champs[c.cle] ?? ""}
                    onChange={(e) => setChamps({ ...champs, [c.cle]: e.target.value })}
                    className={champClasse}
                  />
                ) : (
                  <input
                    id={`${id}-${c.cle}`}
                    aria-describedby={c.aide ? `${id}-${c.cle}-aide` : undefined}
                    value={champs[c.cle] ?? ""}
                    onChange={(e) => setChamps({ ...champs, [c.cle]: e.target.value })}
                    className={champClasse}
                  />
                )}
              </div>
            ))}
          </fieldset>
        </form>

        <div>
          <div className="mb-2 flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={imprimer}
              className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
            >
              Imprimer / enregistrer en PDF
            </button>
            <button
              type="button"
              onClick={copier}
              className="rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-blue-700"
            >
              Copier le texte
            </button>
            {texteLibre !== null && (
              <button type="button" className="text-sm underline" onClick={() => setTexteLibre(null)}>
                Revenir au modèle
              </button>
            )}
          </div>
          {copie && (
            <p role="status" className="mb-2 text-sm print:hidden">
              {copie}
            </p>
          )}
          {manquants > 0 && (
            <p className="mb-2 text-sm text-amber-900 print:hidden">
              {manquants} passage{manquants > 1 ? "s" : ""} « [à compléter] » à remplir avant l&apos;envoi.
            </p>
          )}
          <label htmlFor={`${id}-lettre`} className="block text-sm font-medium print:hidden">
            Aperçu de la lettre (modifiable)
          </label>
          <textarea
            id={`${id}-lettre`}
            value={final}
            onChange={(e) => setTexteLibre(e.target.value)}
            rows={24}
            className="mt-1 block w-full rounded border bg-white p-3 font-serif text-sm print:hidden"
          />
          <div id="lettre-imprimable" className="hidden whitespace-pre-wrap font-serif text-[12pt] leading-relaxed">
            {final}
          </div>
        </div>
      </div>

      <div className="mt-4 border-l-4 border-gray-500 bg-gray-50 p-3 print:hidden">
        <p className="font-medium">Comment l&apos;envoyer</p>
        <p className="text-sm">
          Modalités conseillées : {modele.envoi.map((e) => LIBELLES_ENVOI[e]).join(" ou ")}.
        </p>
        <p className="text-sm">{modele.conseil_envoi}</p>
        <p className="text-sm">Gardez une copie de la lettre et la preuve d&apos;envoi (bordereau, accusé de réception, capture d&apos;écran).</p>
      </div>
    </div>
  );
}
