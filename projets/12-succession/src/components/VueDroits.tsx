"use client";

import { CarteResultat, Champ } from "@vie-fr/ui";
import { euros } from "@vie-fr/fr-data";
import { useState } from "react";
import {
  droitsApplicables,
  estimerReversionBase,
  estimerReversionComplementaire,
  estimerVeuvage,
  type Droit,
} from "../droits/calcul";
import { valeurDroit } from "../lib/donnees";
import { estConjointMarie, type Profil } from "../plan/profil";
import { Bouton, Encart, Source } from "./ui";

const nombre = (s: string) => {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function CarteDroit({ d, onVoir }: { d: Droit; onVoir?: () => void }) {
  return (
    <li className="border border-gray-400 p-4 break-inside-avoid">
      <p className="text-lg font-bold">{d.titre}</p>
      <p className="text-sm font-medium text-gray-700">
        {d.eligibilite === "probable" ? "Vous êtes probablement concerné" : "Vous pourriez être concerné"}
      </p>
      {d.montant && <p className="mt-1 text-2xl font-bold text-blue-900">{d.montant}</p>}
      <p className="mt-2">{d.explication}</p>
      <p className="mt-1 text-sm">
        <span className="font-medium">Où le demander : </span>
        {d.ouDemander}
      </p>
      {d.valeurs.map((v) => (
        <Source key={v.id} source={v.source} verifieLe={v.verifie_le} statut={v.statut} />
      ))}
      {onVoir && (
        <Bouton variante="lien" className="mt-2 text-sm" onClick={onVoir}>
          Voir la démarche dans le plan
        </Bouton>
      )}
    </li>
  );
}

function Simulateurs() {
  const [ressourcesMois, setRessourcesMois] = useState("");
  const [retraiteBase, setRetraiteBase] = useState("");
  const [retraiteCompl, setRetraiteCompl] = useState("");
  const [ressourcesAn, setRessourcesAn] = useState("");
  const [enCouple, setEnCouple] = useState(false);
  const veuvage = estimerVeuvage(nombre(ressourcesMois));
  const rev = estimerReversionBase(nombre(retraiteBase), nombre(ressourcesAn), enCouple);
  const revC = estimerReversionComplementaire(nombre(retraiteCompl));
  const vMax = valeurDroit("veuvage_montant_max");
  const vPlafond = valeurDroit("veuvage_plafond_trimestriel");
  const tauxBase = valeurDroit("reversion_base_taux");
  const plafond = valeurDroit(enCouple ? "reversion_plafond_couple" : "reversion_plafond_seul");
  const tauxCompl = valeurDroit("reversion_agirc_arrco_taux");

  return (
    <section aria-labelledby="titre-simu" className="mt-8">
      <h3 id="titre-simu" className="text-lg font-bold">
        Estimer la réversion ou l&apos;allocation de veuvage
      </h3>
      <p className="mt-1 text-gray-700">
        Montants bruts, indicatifs. Seule la caisse de retraite calcule le montant exact, après examen de toutes vos
        ressources.
      </p>

      <div className="mt-4 grid gap-x-6 md:grid-cols-2">
        <div>
          <Champ
            label="Retraite de base du défunt (€ brut par mois)"
            inputMode="decimal"
            value={retraiteBase}
            onChange={(e) => setRetraiteBase(e.target.value)}
          />
          <Champ
            label="Retraite complémentaire Agirc-Arrco du défunt (€ brut par mois)"
            inputMode="decimal"
            value={retraiteCompl}
            onChange={(e) => setRetraiteCompl(e.target.value)}
          />
        </div>
        <div>
          <Champ
            label="Vos ressources sur un an (€ brut)"
            aide="Vos revenus, hors réversion à venir."
            inputMode="decimal"
            value={ressourcesAn}
            onChange={(e) => setRessourcesAn(e.target.value)}
          />
          <label className="mb-4 flex items-start gap-2">
            <input
              type="checkbox"
              checked={enCouple}
              onChange={(e) => setEnCouple(e.target.checked)}
              className="mt-1 h-5 w-5 accent-blue-900"
            />
            <span>Je vis de nouveau en couple</span>
          </label>
          <Champ
            label="Pour l'allocation de veuvage : vos ressources par mois (€)"
            aide="Moyenne des trois derniers mois."
            inputMode="decimal"
            value={ressourcesMois}
            onChange={(e) => setRessourcesMois(e.target.value)}
          />
        </div>
      </div>

      <CarteResultat
        titre="Réversion du régime de base (estimation)"
        valeur={`${euros(rev.estimee)} par mois`}
        source={plafond.source}
        verifieLe={plafond.verifie_le}
      >
        <p>
          {Math.round(tauxBase.valeur * 100)} % de la retraite de base = {euros(rev.theorique)}.{" "}
          {rev.reduite
            ? `Réduite car vos ressources plus la réversion dépasseraient le plafond de ${euros(plafond.valeur)} par an.`
            : `Sous le plafond de ressources de ${euros(plafond.valeur)} par an.`}
        </p>
        {plafond.statut === "A_VERIFIER" && (
          <p className="text-sm text-amber-900">Plafond à confirmer sur le site officiel.</p>
        )}
      </CarteResultat>
      <CarteResultat
        titre="Réversion complémentaire Agirc-Arrco (estimation)"
        valeur={`${euros(revC)} par mois`}
        source={tauxCompl.source}
        verifieLe={tauxCompl.verifie_le}
      >
        <p>{Math.round(tauxCompl.valeur * 100)} % de la retraite complémentaire, sans condition de ressources.</p>
      </CarteResultat>
      <CarteResultat
        titre="Allocation de veuvage (estimation, si vous avez moins de l'âge limite)"
        valeur={`${euros(veuvage)} par mois`}
        source={vMax.source}
        verifieLe={vMax.verifie_le}
      >
        <p>
          Elle complète vos ressources jusqu&apos;à {euros(vPlafond.valeur)} par trimestre, dans la limite de{" "}
          {euros(vMax.valeur)} par mois.
        </p>
        {vMax.statut === "A_VERIFIER" && (
          <p className="text-sm text-amber-900">Montants à confirmer sur le site officiel.</p>
        )}
      </CarteResultat>
    </section>
  );
}

export function VueDroits({ profil, onVoirDemarche }: { profil: Profil; onVoirDemarche: (id: string) => void }) {
  const droits = droitsApplicables(profil);
  const concernes = droits.filter((d) => d.eligibilite !== "non_concerne");
  const autres = droits.filter((d) => d.eligibilite === "non_concerne");
  return (
    <section aria-labelledby="titre-droits">
      <h2 id="titre-droits" className="text-xl font-bold">
        Droits et aides
      </h2>
      <p className="mt-2 text-gray-700">
        Les sommes auxquelles vous ou votre famille pouvez prétendre, d&apos;après vos réponses. Ce sont des repères :
        chaque organisme vérifie les conditions.
      </p>
      <ul className="mt-4 space-y-3">
        {concernes.map((d) => (
          <CarteDroit key={d.id} d={d} onVoir={d.demarche ? () => onVoirDemarche(d.demarche!) : undefined} />
        ))}
      </ul>

      {estConjointMarie(profil) && <Simulateurs />}

      {autres.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-medium text-blue-900 underline">
            Aides qui ne semblent pas vous concerner ({autres.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {autres.map((d) => (
              <li key={d.id} className="border-l-4 border-gray-300 pl-3">
                <p className="font-medium">{d.titre}</p>
                <p className="text-gray-700">{d.explication}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Encart titre="Bon à savoir">
        Le capital décès et l&apos;assurance-vie ne font pas partie de la succession. Pour la succession elle-même
        (partage, droits à payer), adressez-vous au notaire : cet outil ne la calcule pas.
      </Encart>
    </section>
  );
}
