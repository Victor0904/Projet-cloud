"use client";

import { BoutonExportPdf } from "@vie-fr/ui";
import { dateLongue, joursRestants, libelleRelatif } from "../lib/dates";
import { nomCanal, type NatureDelai, type TypeLettre } from "../lib/donnees";
import { prochainesEcheances, type DemarchePlanifiee, type Plan } from "../plan/generer";
import { LIBELLES_ACTIVITE, LIBELLES_LIEN, LIBELLES_LOGEMENT, type Profil } from "../plan/profil";
import { Bouton, Encart, Source } from "./ui";

const NATURE: Record<NatureDelai, { texte: string; cls: string }> = {
  legal: { texte: "Délai fixé par la loi", cls: "bg-red-100 text-red-900" },
  recommande: { texte: "Délai conseillé par l'organisme", cls: "bg-amber-100 text-amber-900" },
  conseil_outil: { texte: "Repère conseillé", cls: "bg-gray-200 text-gray-800" },
};

function LigneEcheance({ d, aujourdhui, faite }: { d: DemarchePlanifiee; aujourdhui: Date; faite: boolean }) {
  const n = d.echeance.date ? joursRestants(d.echeance.date, aujourdhui) : null;
  const urgent = !faite && n !== null && n <= 3;
  return (
    <p className="mt-1">
      <span className={`font-bold ${urgent ? "text-red-800" : ""}`}>
        {d.echeance.date && d.delai.valeur !== 0 ? `Avant le ${d.echeance.libelle}` : d.delai.libelle}
      </span>
      {d.echeance.date && d.delai.valeur !== 0 && !faite && n !== null && (
        <span className="text-gray-700"> ({libelleRelatif(n)})</span>
      )}
      <span className={`ml-2 inline-block rounded px-2 text-xs font-medium ${NATURE[d.delai.nature].cls}`}>
        {NATURE[d.delai.nature].texte}
      </span>
    </p>
  );
}

function CarteDemarche({
  d,
  faiteLe,
  aujourdhui,
  onToggle,
  onLettre,
}: {
  d: DemarchePlanifiee;
  faiteLe?: string;
  aujourdhui: Date;
  onToggle: (faite: boolean) => void;
  onLettre: (type: TypeLettre, organisme: string) => void;
}) {
  const faite = faiteLe !== undefined;
  return (
    <li
      className={`border p-4 break-inside-avoid ${faite ? "border-gray-300 bg-gray-50" : "border-gray-400 bg-white"}`}
    >
      <div className="flex items-start gap-3">
        <input
          id={`fait-${d.id}`}
          type="checkbox"
          checked={faite}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-blue-900"
          aria-describedby={`titre-${d.id}`}
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`fait-${d.id}`}
            id={`titre-${d.id}`}
            className={`text-lg font-bold ${faite ? "line-through decoration-1" : ""}`}
          >
            {d.titre}
          </label>
          {faite && (
            <p className="text-sm text-green-800">
              Fait{faiteLe ? ` le ${faiteLe.split("-").reverse().join("/")}` : ""}
            </p>
          )}
          <LigneEcheance d={d} aujourdhui={aujourdhui} faite={faite} />
          {d.qui === "heritiers" && (
            <p className="mt-1 text-sm font-medium text-amber-900">À transmettre aux héritiers ou au notaire.</p>
          )}
          <p className="mt-2">{d.pourquoi}</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="inline font-medium">Qui contacter : </dt>
              <dd className="inline">
                {d.contact && <span>{d.contact} </span>}
                {d.organismes.map((o, i) => (
                  <span key={o.id}>
                    {i > 0 && " · "}
                    <a href={o.lien} target="_blank" rel="noreferrer" className="underline">
                      {o.nom}
                    </a>{" "}
                    <span className="text-gray-600">({nomCanal(o.canal_conseille).toLowerCase()})</span>
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Pièces à fournir : </dt>
              <dd className="inline">{d.pieces.join(" ; ")}.</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-gray-700">{d.delai.explication}</p>
          <Source source={d.delai.source} verifieLe={d.delai.verifie_le} statut={d.delai.statut} />
          {d.lettre && (
            <Bouton
              variante="secondaire"
              className="mt-3 text-sm"
              onClick={() => onLettre(d.lettre!.type, d.lettre!.organisme)}
            >
              Préparer le courrier
            </Bouton>
          )}
        </div>
      </div>
    </li>
  );
}

export function VuePlan({
  plan,
  profil,
  demarchesFaites,
  aujourdhui,
  onToggle,
  onLettre,
  onModifier,
}: {
  plan: Plan;
  profil: Profil;
  demarchesFaites: Record<string, string>;
  aujourdhui: Date;
  onToggle: (id: string, faite: boolean) => void;
  onLettre: (type: TypeLettre, organisme: string) => void;
  onModifier: () => void;
}) {
  const faites = new Set(Object.keys(demarchesFaites).filter((id) => plan.demarches.some((d) => d.id === id)));
  const prochaines = prochainesEcheances(plan, faites, 3);
  return (
    <section aria-labelledby="titre-plan">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-plan" className="text-xl font-bold">
          Votre plan de démarches
        </h2>
        <BoutonExportPdf libelle="Imprimer ou enregistrer en PDF" />
      </div>
      <p className="mt-2 text-gray-700">
        Décès le <strong>{dateLongue(plan.dateDeces)}</strong>. Vous êtes : {LIBELLES_LIEN[profil.lien].toLowerCase()} ·{" "}
        {LIBELLES_ACTIVITE[profil.activite].toLowerCase()} · {LIBELLES_LOGEMENT[profil.logement].toLowerCase()}.{" "}
        <Bouton variante="lien" onClick={onModifier}>
          Modifier mes réponses
        </Bouton>
      </p>
      <p className="mt-1 text-gray-700" aria-live="polite">
        {faites.size} démarche{faites.size > 1 ? "s" : ""} faite{faites.size > 1 ? "s" : ""} sur {plan.demarches.length}
        .
      </p>

      {prochaines.length > 0 && (
        <Encart titre="À faire en priorité">
          <ul className="list-disc pl-5">
            {prochaines.map((d) => {
              const n = joursRestants(d.echeance.date!, aujourdhui);
              return (
                <li key={d.id}>
                  {d.titre} — avant le {d.echeance.libelle} ({libelleRelatif(n)})
                </li>
              );
            })}
          </ul>
        </Encart>
      )}

      <Encart ton="attention">
        Les délais sont calculés à partir de la date du décès. Ils sont indicatifs : en cas de doute, l&apos;organisme
        ou le notaire fait foi. Rien ne vous oblige à tout faire seul : les pompes funèbres, le notaire et vos proches
        peuvent prendre une partie des démarches.
      </Encart>

      {plan.phases.map((ph) =>
        ph.demarches.length === 0 ? null : (
          <section key={ph.id} aria-labelledby={`phase-${ph.id}`} className="mt-8">
            <h3 id={`phase-${ph.id}`} className="border-b-2 border-blue-900 pb-1 text-lg font-bold text-blue-900">
              {ph.titre}
            </h3>
            <p className="mb-3 mt-1 text-gray-700">{ph.intro}</p>
            <ol className="space-y-3">
              {ph.demarches.map((d) => (
                <CarteDemarche
                  key={d.id}
                  d={d}
                  faiteLe={demarchesFaites[d.id]}
                  aujourdhui={aujourdhui}
                  onToggle={(f) => onToggle(d.id, f)}
                  onLettre={onLettre}
                />
              ))}
            </ol>
          </section>
        ),
      )}

      <Encart titre="Ce que cet outil ne fait pas">
        Il ne calcule pas les droits de succession et n&apos;évalue pas le patrimoine : c&apos;est le rôle du notaire.
        Il ne remplace pas les démarches officielles ni un conseil personnalisé.
      </Encart>
    </section>
  );
}
