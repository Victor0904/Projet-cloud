"use client";

import { Champ, ChampSelect } from "@vie-fr/ui";
import { useState } from "react";
import { ENVOIS, ORGANISMES, nomCanal, type TypeLettre } from "../lib/donnees";
import { genererLettre, QUALITE_PAR_LIEN, TYPES_LETTRES, type InfosLettre } from "../lettres/modeles";
import type { Profil } from "../plan/profil";
import { Bouton, Encart, Source, ZoneTexte } from "./ui";

export type SelectionLettre = { type: TypeLettre; organisme: string | null };

export function VueLettres({
  infos,
  profil,
  selection,
  onInfos,
  onSelection,
}: {
  infos: InfosLettre;
  profil: Profil;
  selection: SelectionLettre;
  onInfos: (i: InfosLettre) => void;
  onSelection: (s: SelectionLettre) => void;
}) {
  const [copie, setCopie] = useState("");
  const org = selection.organisme ? ORGANISMES.find((o) => o.id === selection.organisme) : undefined;
  const effectives: InfosLettre = {
    ...infos,
    dateDeces: profil.dateDeces,
    qualite: infos.qualite || QUALITE_PAR_LIEN[profil.lien],
  };
  const lettre = genererLettre(selection.type, effectives, org);
  const maj = <K extends keyof InfosLettre>(k: K, v: InfosLettre[K]) => onInfos({ ...infos, [k]: v });
  const besoinSecu = selection.type === "demande_capital_deces" || selection.type === "demande_reversion";

  async function copier() {
    try {
      await navigator.clipboard.writeText(lettre.texte);
      setCopie("Le courrier est copié : collez-le dans votre traitement de texte ou votre messagerie.");
    } catch {
      setCopie("La copie automatique n'a pas fonctionné : sélectionnez le texte du courrier et copiez-le.");
    }
  }

  return (
    <section aria-labelledby="titre-lettres">
      <h2 id="titre-lettres" className="text-xl font-bold print:hidden">
        Courriers prêts à envoyer
      </h2>
      <p className="mt-2 text-gray-700 print:hidden">
        Choisissez le courrier et le destinataire, complétez ce que vous savez : le texte se met à jour. Vos
        informations restent sur cet appareil et sont réutilisées pour les courriers suivants.
      </p>

      <div className="mt-4 grid gap-x-6 md:grid-cols-2 print:hidden">
        <div>
          <ChampSelect
            label="Type de courrier"
            value={selection.type}
            onChange={(e) => onSelection({ ...selection, type: e.target.value as TypeLettre })}
            options={TYPES_LETTRES.map((t) => [t.id, t.nom])}
          />
          <p className="-mt-3 mb-4 text-sm text-gray-600">
            {TYPES_LETTRES.find((t) => t.id === selection.type)?.description}
          </p>
          <ChampSelect
            label="Destinataire"
            value={selection.organisme ?? ""}
            onChange={(e) => onSelection({ ...selection, organisme: e.target.value || null })}
            options={[
              ["", "Autre (à préciser ci-dessous)"],
              ...ORGANISMES.map((o) => [o.id, o.nom] as [string, string]),
            ]}
          />
          {org?.id === "bailleur" && (
            <label className="mb-4 flex items-start gap-2">
              <input
                type="checkbox"
                checked={infos.transfertBail}
                onChange={(e) => maj("transfertBail", e.target.checked)}
                className="mt-1 h-5 w-5 accent-blue-900"
              />
              <span>Je vivais dans le logement et je souhaite garder le bail (demande de transfert)</span>
            </label>
          )}
          <Champ
            label="Nom du destinataire (service, agence)"
            value={infos.destinataireNom}
            placeholder={org?.nom}
            onChange={(e) => maj("destinataireNom", e.target.value)}
          />
          <ZoneTexte
            label="Adresse du destinataire"
            valeur={infos.destinataireAdresse}
            onChange={(v) => maj("destinataireAdresse", v)}
          />
          <Champ
            label="Numéro de contrat, de client ou d'allocataire"
            value={infos.reference}
            onChange={(e) => maj("reference", e.target.value)}
          />
        </div>
        <div>
          <Champ
            label="Vos nom et prénom"
            value={infos.expediteurNom}
            autoComplete="name"
            onChange={(e) => maj("expediteurNom", e.target.value)}
          />
          <ZoneTexte
            label="Votre adresse"
            valeur={infos.expediteurAdresse}
            onChange={(v) => maj("expediteurAdresse", v)}
          />
          <Champ
            label="Téléphone ou e-mail (facultatif)"
            value={infos.expediteurContact}
            onChange={(e) => maj("expediteurContact", e.target.value)}
          />
          <Champ
            label="Votre qualité"
            aide="Ex. « fille de la personne décédée », « conjoint survivant »."
            value={infos.qualite}
            placeholder={QUALITE_PAR_LIEN[profil.lien]}
            onChange={(e) => maj("qualite", e.target.value)}
          />
          <Champ
            label="Nom et prénom de la personne décédée"
            value={infos.defuntNom}
            onChange={(e) => maj("defuntNom", e.target.value)}
          />
          <Champ
            label="Sa date de naissance (facultatif)"
            placeholder="JJ/MM/AAAA"
            value={infos.defuntDateNaissance}
            onChange={(e) => maj("defuntDateNaissance", e.target.value)}
          />
          {besoinSecu && (
            <Champ
              label="Son numéro de sécurité sociale"
              value={infos.defuntNumeroSecu}
              onChange={(e) => maj("defuntNumeroSecu", e.target.value)}
            />
          )}
          <Champ label="Ville d'où vous écrivez" value={infos.ville} onChange={(e) => maj("ville", e.target.value)} />
          <Champ
            label="Notaire chargé de la succession (facultatif)"
            value={infos.notaire}
            onChange={(e) => maj("notaire", e.target.value)}
          />
        </div>
      </div>

      <Encart titre={`Envoi conseillé : ${nomCanal(lettre.envoi).toLowerCase()}`}>
        <span className="print:hidden">{ENVOIS.modes.find((m) => m.id === lettre.envoi)?.quand}</span>
      </Encart>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Bouton onClick={copier}>Copier le texte</Bouton>
        <Bouton variante="secondaire" onClick={() => window.print()}>
          Imprimer ou enregistrer en PDF
        </Bouton>
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-green-800 print:hidden">
        {copie}
      </p>

      <article
        aria-label="Aperçu du courrier"
        className="mt-4 border border-gray-400 bg-white p-6 font-serif leading-relaxed whitespace-pre-wrap print:border-0 print:p-0"
      >
        {lettre.texte}
      </article>

      <section aria-labelledby="titre-envois" className="mt-8 print:hidden">
        <h3 id="titre-envois" className="text-lg font-bold">
          Recommandé, courrier simple ou espace en ligne : que choisir ?
        </h3>
        <dl className="mt-2 space-y-3">
          {ENVOIS.modes.map((m) => (
            <div key={m.id}>
              <dt className="font-medium">{m.nom}</dt>
              <dd className="text-gray-800">
                {m.quand} <span className="text-gray-600">{m.conseil}</span>
              </dd>
            </div>
          ))}
        </dl>
        <Source source={ENVOIS.source} verifieLe={ENVOIS.verifie_le} statut={ENVOIS.statut} />
      </section>
    </section>
  );
}
