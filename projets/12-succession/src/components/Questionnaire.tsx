"use client";

import { Champ } from "@vie-fr/ui";
import { useState } from "react";
import { aujourdhuiUtc, dateVersIso, isoVersDate } from "../lib/dates";
import { valeurDroit } from "../lib/donnees";
import {
  LIBELLES_ACTIVITE,
  LIBELLES_LIEN,
  LIBELLES_LOGEMENT,
  LIBELLES_UNION,
  type Activite,
  type Lien,
  type Logement,
  type OuiNonInconnu,
  type Profil,
  type Union,
} from "../plan/profil";
import { Bouton, GroupeChoix, OuiNon } from "./ui";

const entrees = <K extends string>(o: Record<K, string>) => Object.entries(o) as [K, string][];

const OUI_NON_INCONNU: [OuiNonInconnu, string][] = [
  ["oui", "Oui"],
  ["non", "Non"],
  ["ne_sait_pas", "Je ne sais pas"],
];

export function Questionnaire({
  profil,
  onChange,
  onValider,
}: {
  profil: Profil;
  onChange: (p: Profil) => void;
  onValider: () => void;
}) {
  const [erreur, setErreur] = useState("");
  const maj = <K extends keyof Profil>(k: K, v: Profil[K]) => onChange({ ...profil, [k]: v });
  const aujourdhui = dateVersIso(aujourdhuiUtc());
  const ageSeuil = valeurDroit("conge_enfant_age_seuil").valeur;

  function valider(e: React.FormEvent) {
    e.preventDefault();
    const d = isoVersDate(profil.dateDeces);
    if (!d) return setErreur("Indiquez la date du décès pour calculer les délais.");
    if (profil.dateDeces > aujourdhui) return setErreur("La date du décès ne peut pas être dans le futur.");
    setErreur("");
    onValider();
  }

  return (
    <form onSubmit={valider} noValidate aria-labelledby="titre-questionnaire">
      <h2 id="titre-questionnaire" className="mb-2 text-xl font-bold">
        Votre situation
      </h2>
      <p className="mb-6 text-gray-700">
        Une douzaine de questions, pour ne vous montrer que ce qui vous concerne. Vous pourrez revenir modifier vos
        réponses à tout moment. Si vous ne savez pas, choisissez la réponse la plus probable.
      </p>

      <Champ
        label="Date du décès"
        type="date"
        max={aujourdhui}
        required
        value={profil.dateDeces}
        onChange={(e) => maj("dateDeces", e.target.value)}
        aria-invalid={erreur ? true : undefined}
      />
      {erreur && (
        <p role="alert" className="-mt-2 mb-4 font-medium text-red-800">
          {erreur}
        </p>
      )}

      <GroupeChoix<Lien>
        legende="Vous êtes…"
        nom="lien"
        valeur={profil.lien}
        options={entrees(LIBELLES_LIEN)}
        onChange={(v) => maj("lien", v)}
      />

      <GroupeChoix<Union>
        legende="Au moment du décès, la personne était…"
        nom="union"
        valeur={profil.union}
        options={entrees(LIBELLES_UNION)}
        onChange={(v) => maj("union", v)}
      />

      {profil.lien === "conjoint" && (
        <Champ
          label="Votre âge (facultatif)"
          aide="Il sert seulement à savoir si la pension de réversion ou l'allocation de veuvage vous concerne."
          type="number"
          inputMode="numeric"
          min={16}
          max={120}
          value={profil.ageConjoint ?? ""}
          onChange={(e) => maj("ageConjoint", e.target.value === "" ? null : Number(e.target.value))}
        />
      )}

      {profil.lien === "parent" && (
        <OuiNon
          legende={`Votre enfant avait-il moins de ${ageSeuil} ans, ou était-il lui-même parent ?`}
          aide="Cela allonge votre congé et ouvre un congé de deuil si vous êtes salarié."
          nom="jeune"
          valeur={profil.defuntJeuneOuParent}
          onChange={(v) => maj("defuntJeuneOuParent", v)}
        />
      )}

      <OuiNon
        legende="La personne avait-elle des enfants ?"
        nom="enfants"
        valeur={profil.enfants}
        onChange={(v) => onChange({ ...profil, enfants: v, enfantsMineurs: v ? profil.enfantsMineurs : false })}
      />
      {profil.enfants && (
        <OuiNon
          legende="Certains de ces enfants sont-ils encore à charge (mineurs ou jeunes adultes) ?"
          nom="enfantsMineurs"
          valeur={profil.enfantsMineurs}
          onChange={(v) => maj("enfantsMineurs", v)}
        />
      )}

      <GroupeChoix<Logement>
        legende="Son logement"
        nom="logement"
        valeur={profil.logement}
        options={entrees(LIBELLES_LOGEMENT)}
        onChange={(v) => maj("logement", v)}
      />

      <GroupeChoix<Activite>
        legende="Sa situation professionnelle"
        nom="activite"
        valeur={profil.activite}
        options={entrees(LIBELLES_ACTIVITE)}
        onChange={(v) => maj("activite", v)}
      />

      <GroupeChoix<OuiNonInconnu>
        legende="Existe-t-il un testament ?"
        nom="testament"
        valeur={profil.testament}
        options={OUI_NON_INCONNU}
        onChange={(v) => maj("testament", v)}
      />

      <GroupeChoix<OuiNonInconnu>
        legende="Connaissez-vous une assurance-vie à son nom ?"
        nom="assuranceVie"
        valeur={profil.assuranceVie}
        options={OUI_NON_INCONNU}
        onChange={(v) => maj("assuranceVie", v)}
      />

      <OuiNon
        legende="Avait-elle un véhicule ?"
        nom="vehicule"
        valeur={profil.vehicule}
        onChange={(v) => maj("vehicule", v)}
      />
      <OuiNon
        legende="Avait-elle des animaux ?"
        nom="animaux"
        valeur={profil.animaux}
        onChange={(v) => maj("animaux", v)}
      />
      <OuiNon
        legende="Dirigeait-elle une entreprise ou exerçait-elle en indépendant ?"
        nom="entreprise"
        valeur={profil.entreprise}
        onChange={(v) => maj("entreprise", v)}
      />
      <OuiNon
        legende="Le décès a-t-il eu lieu hors de France métropolitaine ?"
        aide="Les délais de la succession sont alors plus longs."
        nom="etranger"
        valeur={profil.decesEtranger}
        onChange={(v) => maj("decesEtranger", v)}
      />
      <OuiNon
        legende="Êtes-vous vous-même salarié ?"
        aide="Pour savoir si vous avez droit à un congé pour décès."
        nom="procheSalarie"
        valeur={profil.procheSalarie}
        onChange={(v) => maj("procheSalarie", v)}
      />

      <div className="mt-6">
        <Bouton type="submit">Voir mon plan de démarches</Bouton>
      </div>
    </form>
  );
}
