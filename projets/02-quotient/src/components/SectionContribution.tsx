"use client";

import { communesParNom, type Commune } from "@vie-fr/fr-data";
import { Champ, ChampSelect } from "@vie-fr/ui";
import { useMemo, useState } from "react";
import { construireGrille, LIBELLES_PRESTATIONS, nomFichier, saisieVide, texteIssue, type SaisieContribution } from "@/lib/contribution";
import { telecharger } from "@/lib/etat";
import { LIBELLES_BASE } from "@/lib/quotient";
import type { BaseCalcul, Unite } from "@/lib/types";
import { validerGrille } from "@/lib/validation";
import { Alerte, Section } from "./commun";

type CleSaisie = keyof SaisieContribution["prestations"];

const UNITES: [Unite, string][] = [
  ["repas", "par repas"],
  ["seance", "par séance"],
  ["heure", "par heure"],
  ["jour", "par journée"],
  ["demi_journee", "par demi-journée"],
  ["mois", "forfait mensuel"],
  ["an", "forfait annuel"],
];

const bouton = "rounded border-2 border-blue-900 px-3 py-1 font-medium text-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700";

export function SectionContribution() {
  const [s, setS] = useState<SaisieContribution>(saisieVide);
  const [suggestions, setSuggestions] = useState<Commune[]>([]);
  const [message, setMessage] = useState("");
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const grille = useMemo(() => construireGrille(s, aujourdhui), [s, aujourdhui]);
  const erreurs = validerGrille(grille);
  const issue = texteIssue(grille);

  const majPrestation = (cle: CleSaisie, f: (p: SaisieContribution["prestations"][CleSaisie]) => SaisieContribution["prestations"][CleSaisie]) =>
    setS({ ...s, prestations: { ...s.prestations, [cle]: f(s.prestations[cle]) } });

  async function chercher() {
    setMessage("");
    try {
      const r = await communesParNom(s.commune, 5);
      setSuggestions(r);
      if (r.length === 0) setMessage("Aucune commune trouvée.");
    } catch {
      setMessage("Recherche indisponible : saisissez le code INSEE à la main.");
    }
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(issue);
      setMessage("Texte copié.");
    } catch {
      setMessage("Copie impossible : sélectionnez le texte à la main.");
    }
  }

  return (
    <Section
      id="contribuer"
      titre="5. Proposer la grille de votre commune"
      intro="Votre commune manque ou une grille est fausse ? Recopiez les tarifs publiés par la mairie. L'outil fabrique le fichier à ajouter au projet et le texte d'un ticket GitHub. Rien n'est envoyé automatiquement."
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        <div>
          <Champ label="Commune" value={s.commune} onChange={(e) => setS({ ...s, commune: e.target.value })} />
          <button type="button" className={`${bouton} -mt-2 mb-4`} onClick={chercher} disabled={s.commune.trim().length < 2}>
            Trouver le code INSEE
          </button>
          <p className="-mt-2 mb-4 text-xs text-gray-600">Interroge l&apos;API Géo publique (geo.api.gouv.fr) avec le seul nom de la commune.</p>
          {suggestions.length > 0 && (
            <ul className="mb-4 text-sm">
              {suggestions.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setS({ ...s, commune: c.nom, codeInsee: c.code, departement: c.codeDepartement });
                      setSuggestions([]);
                    }}
                  >
                    {c.nom} ({c.codeDepartement}) — {c.code}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Champ label="Code INSEE" aide="5 caractères, différent du code postal." value={s.codeInsee} onChange={(e) => setS({ ...s, codeInsee: e.target.value })} />
        <Champ label="Adresse de la page ou du PDF officiel" type="url" value={s.source} onChange={(e) => setS({ ...s, source: e.target.value })} />
        <Champ label="Période de validité" aide="Ex. : année scolaire 2026-2027." value={s.periode} onChange={(e) => setS({ ...s, periode: e.target.value })} />
        <ChampSelect
          label="Les tranches portent sur"
          value={s.baseCalcul}
          onChange={(e) => setS({ ...s, baseCalcul: e.target.value as BaseCalcul })}
          options={Object.entries(LIBELLES_BASE) as [string, string][]}
        />
      </div>

      {(Object.keys(s.prestations) as CleSaisie[]).map((cle) => {
        const p = s.prestations[cle];
        return (
          <fieldset key={cle} className="my-4 rounded border border-gray-300 p-3">
            <legend className="px-1 font-bold">{LIBELLES_PRESTATIONS[cle]}</legend>
            <ChampSelect label="Facturation" value={p.unite} onChange={(e) => majPrestation(cle, (x) => ({ ...x, unite: e.target.value as Unite }))} options={UNITES} />
            {p.lignes.length === 0 && <p className="mb-2 text-sm text-gray-600">Pas de tranche : la prestation sera marquée « à vérifier ».</p>}
            {p.lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Champ
                  label={`Tranche ${i + 1} : QF jusqu'à (inclus)`}
                  aide={i === p.lignes.length - 1 ? "Laisser vide pour la dernière tranche." : undefined}
                  inputMode="decimal"
                  value={l.jusqua}
                  onChange={(e) => majPrestation(cle, (x) => ({ ...x, lignes: x.lignes.map((y, j) => (j === i ? { ...y, jusqua: e.target.value } : y)) }))}
                />
                <Champ
                  label="Tarif (€)"
                  inputMode="decimal"
                  value={l.tarif}
                  onChange={(e) => majPrestation(cle, (x) => ({ ...x, lignes: x.lignes.map((y, j) => (j === i ? { ...y, tarif: e.target.value } : y)) }))}
                />
                <button
                  type="button"
                  className={`${bouton} mb-4`}
                  aria-label={`Supprimer la tranche ${i + 1}`}
                  onClick={() => majPrestation(cle, (x) => ({ ...x, lignes: x.lignes.filter((_, j) => j !== i) }))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className={bouton} onClick={() => majPrestation(cle, (x) => ({ ...x, lignes: [...x.lignes, { jusqua: "", tarif: "" }] }))}>
              Ajouter une tranche
            </button>
          </fieldset>
        );
      })}

      {erreurs.length > 0 ? (
        <Alerte ton="attention">
          <p className="font-medium">À corriger avant de proposer la grille :</p>
          <ul className="list-disc pl-5">
            {erreurs.slice(0, 12).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alerte>
      ) : (
        <Alerte>La grille est cohérente : tranches ordonnées, sans trou ni chevauchement.</Alerte>
      )}

      <div className="my-3 flex flex-wrap gap-3">
        <button type="button" className={bouton} onClick={() => telecharger(nomFichier(grille), JSON.stringify(grille, null, 2) + "\n")}>
          Télécharger {nomFichier(grille)}
        </button>
        <button type="button" className={bouton} onClick={copier}>
          Copier le texte du ticket GitHub
        </button>
      </div>
      <p aria-live="polite" className="text-sm">
        {message}
      </p>
      <label htmlFor="issue" className="mt-2 block font-medium">
        Texte du ticket
      </label>
      <textarea id="issue" readOnly value={issue} rows={10} className="mt-1 w-full rounded border border-gray-400 bg-gray-50 p-2 font-mono text-xs" />
    </Section>
  );
}
