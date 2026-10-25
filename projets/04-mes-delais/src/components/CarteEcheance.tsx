"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { dateConseillee, marquerFait } from "@/lib/calcul";
import { alerteJourNonOuvre, dateAvecJour, dateMoyenne, ecartJours, estIso, relatif } from "@/lib/dates";
import type { Ligne } from "@/lib/vue";
import { modifierEtat } from "./etat";
import { BadgeStatut, BadgeUrgence, Bouton, classeBouton } from "./ui";

const BORDURE = {
  depasse: "border-red-700",
  moins30: "border-orange-500",
  moins90: "border-yellow-600",
  plus_tard: "border-gray-300",
  aucune: "border-gray-300",
};

export function CarteEcheance({ ligne, auj, lectureSeule = false }: { ligne: Ligne; auj: string; lectureSeule?: boolean }) {
  const { echeance: e, type, res, membre } = ligne;
  const [faitOuvert, setFaitOuvert] = useState(false);
  const [faitLe, setFaitLe] = useState(auj);
  const idFait = useId();
  const conseil = dateConseillee(type, res, auj);
  const nonOuvre = res.date && res.statut === "a_venir" ? alerteJourNonOuvre(res.date) : null;

  const valider = () => {
    if (!estIso(faitLe)) return;
    modifierEtat((etat) => ({
      ...etat,
      echeances: etat.echeances.map((x) => (x.id === e.id ? marquerFait(type, x, faitLe, auj) : x)),
    }));
    setFaitOuvert(false);
  };

  const supprimer = () => {
    if (!window.confirm(`Supprimer « ${ligne.titre} » ?`)) return;
    modifierEtat((etat) => ({ ...etat, echeances: etat.echeances.filter((x) => x.id !== e.id) }));
  };

  return (
    <article className={`mb-3 rounded border border-l-8 bg-white p-4 shadow-sm break-inside-avoid ${BORDURE[ligne.urgence]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold">
            {ligne.titre}
            <BadgeStatut statut={type.statut} />
          </h3>
          {membre && <p className="text-sm text-gray-700">Pour : {membre.nom}</p>}
        </div>
        <BadgeUrgence urgence={ligne.urgence} />
      </div>

      {res.date ? (
        <p className="mt-2 text-lg">
          {res.statut === "en_retard" ? (
            <>
              <strong className="text-red-800">À faire maintenant</strong> — prévu le {dateMoyenne(res.dateTheorique!)} (
              {relatif(auj, res.dateTheorique!)})
            </>
          ) : res.statut === "depasse" ? (
            <>
              <strong className="text-red-800">Délai expiré</strong> le {dateMoyenne(res.date)}
            </>
          ) : (
            <>
              <strong>{dateAvecJour(res.date)}</strong> <span className="text-gray-700">({relatif(auj, res.date)})</span>
            </>
          )}
        </p>
      ) : (
        <p className="mt-2 text-gray-700">{res.statut === "termine" ? "Terminé." : "Informations incomplètes."}</p>
      )}

      <p className="mt-1 text-sm text-gray-800">{res.explication}</p>
      {nonOuvre && (
        <p className="mt-1 text-sm text-orange-900">
          Attention : cette date tombe un {nonOuvre}. Agissez le jour ouvré précédent.
        </p>
      )}
      {conseil && ecartJours(auj, conseil) < 365 && (
        <p className="mt-1 text-sm text-blue-900">
          Conseil : commencez la démarche vers le {dateMoyenne(conseil)} (délais de rendez-vous ou de traitement).
        </p>
      )}
      {res.suivantes.length > 0 && (
        <p className="mt-1 text-sm text-gray-700">Ensuite : {res.suivantes.map(dateMoyenne).join(", ")}.</p>
      )}

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-blue-900 underline">Pourquoi cette date ? Que risque-t-on ?</summary>
        <div className="mt-2 space-y-1">
          <p>{type.description}</p>
          {type.consequences && (
            <p>
              <strong>En cas d&apos;oubli :</strong> {type.consequences}
            </p>
          )}
          {type.note && <p className="text-gray-700">{type.note}</p>}
          {type.demarche.url && (
            <p>
              <a href={type.demarche.url} target="_blank" rel="noreferrer" className="text-blue-900 underline">
                {type.demarche.libelle} (site officiel)
              </a>
            </p>
          )}
          {type.source && (
            <p className="text-xs text-gray-600">
              Source : <a href={type.source} className="break-all underline" target="_blank" rel="noreferrer">{type.source}</a> — vérifié le{" "}
              {dateMoyenne(type.verifie_le)}
              {type.statut === "A_VERIFIER" ? " (à vérifier)" : ""}. Estimation : ne remplace pas la démarche officielle.
            </p>
          )}
        </div>
      </details>

      {!lectureSeule && res.statut !== "termine" && (
        <div className="mt-3 flex flex-wrap items-end gap-2 print:hidden">
          {faitOuvert ? (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor={idFait} className="block text-sm font-medium">
                  Fait le
                </label>
                <input
                  id={idFait}
                  type="date"
                  value={faitLe}
                  max={auj}
                  onChange={(ev) => setFaitLe(ev.target.value)}
                  className="rounded-t border-b-2 border-gray-800 bg-gray-100 px-2 py-1"
                />
              </div>
              <Bouton onClick={valider} disabled={!estIso(faitLe)}>
                Valider
              </Bouton>
              <Bouton variante="discret" onClick={() => setFaitOuvert(false)}>
                Annuler
              </Bouton>
            </div>
          ) : (
            <Bouton onClick={() => setFaitOuvert(true)} disabled={!res.dateTheorique}>
              ✓ C&apos;est fait
            </Bouton>
          )}
          <Link href={`/ajouter?modifier=${encodeURIComponent(e.id)}`} className={classeBouton.discret}>
            Modifier
          </Link>
          <Bouton variante="discret" onClick={supprimer}>
            Supprimer
          </Bouton>
        </div>
      )}
    </article>
  );
}
