"use client";

import { useState } from "react";
import { Champ, ChampSelect } from "@vie-fr/ui";
import { nouvelId } from "@/lib/stockage";
import type { GenreMembre } from "@/lib/types";
import { LIBELLES_GENRE } from "./Assistant";
import { modifierEtat, useEtat } from "./etat";
import { Bouton, Chargement } from "./ui";

const OPTIONS_GENRE = Object.entries(LIBELLES_GENRE) as [string, string][];

export function Foyer() {
  const etat = useEtat();
  const [nom, setNom] = useState("");
  const [genre, setGenre] = useState<GenreMembre>("personne");

  if (!etat) return <Chargement />;

  const ajouter = () => {
    if (!nom.trim()) return;
    modifierEtat((s) => ({ ...s, membres: [...s.membres, { id: nouvelId(), nom: nom.trim(), genre }] }));
    setNom("");
  };

  const renommer = (id: string, n: string) =>
    modifierEtat((s) => ({ ...s, membres: s.membres.map((m) => (m.id === id ? { ...m, nom: n.slice(0, 80) } : m)) }));
  const changerGenre = (id: string, g: GenreMembre) =>
    modifierEtat((s) => ({ ...s, membres: s.membres.map((m) => (m.id === id ? { ...m, genre: g } : m)) }));
  const supprimer = (id: string, n: string) => {
    if (!window.confirm(`Retirer « ${n} » ? Ses échéances sont conservées, sans étiquette.`)) return;
    modifierEtat((s) => ({
      ...s,
      membres: s.membres.filter((m) => m.id !== id),
      echeances: s.echeances.map((e) => (e.membreId === id ? { ...e, membreId: undefined } : e)),
    }));
  };

  return (
    <>
      <p className="mb-4">
        Ajoutez les personnes, véhicules et logements de votre foyer. Chaque échéance peut porter une étiquette, et le
        tableau de bord peut être filtré par étiquette.
      </p>
      {etat.membres.length === 0 ? (
        <p className="mb-4 text-gray-700">Aucune étiquette pour l&apos;instant.</p>
      ) : (
        <ul className="mb-6 space-y-3">
          {etat.membres.map((m) => {
            const n = etat.echeances.filter((e) => e.membreId === m.id && !e.archivee).length;
            return (
              <li key={m.id} className="rounded border border-gray-300 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Champ label="Nom" value={m.nom} onChange={(e) => renommer(m.id, e.target.value)} />
                  <ChampSelect label="Type" value={m.genre} onChange={(e) => changerGenre(m.id, e.target.value as GenreMembre)} options={OPTIONS_GENRE} />
                  <div className="mb-4">
                    <Bouton variante="danger" onClick={() => supprimer(m.id, m.nom)}>
                      Retirer
                    </Bouton>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{n === 0 ? "Aucune échéance" : n === 1 ? "1 échéance" : `${n} échéances`}</p>
              </li>
            );
          })}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ajouter();
        }}
        className="rounded border border-blue-900 p-4"
      >
        <h2 className="mb-2 font-bold">Ajouter une personne ou un bien</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Champ label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Léa, Clio, Maison…" maxLength={80} />
          <ChampSelect label="Type" value={genre} onChange={(e) => setGenre(e.target.value as GenreMembre)} options={OPTIONS_GENRE} />
        </div>
        <button type="submit" className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700">
          Ajouter
        </button>
      </form>
    </>
  );
}
