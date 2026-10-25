"use client";

import type { Activite, Adulte, Situation, StatutLogement } from "../moteur";
import { ChampCommune } from "./ChampCommune";
import { Bouton, CaseACocher, ChampChoix, ChampNombre } from "./champs";

type Props = { s: Situation; maj: (f: (s: Situation) => void) => void };

const ACTIVITES: [Activite, string][] = [
  ["salarie", "Salarié(e)"],
  ["independant", "Indépendant(e)"],
  ["etudiant", "Étudiant(e)"],
  ["demandeur_emploi", "Demandeur d'emploi"],
  ["retraite", "Retraité(e)"],
  ["sans_activite", "Sans activité"],
];

export function EtapeFoyer({ s, maj }: Props) {
  return (
    <>
      <ChampNombre label="Votre âge" requis valeur={s.demandeur.age} max={120} suffixe="ans" onChange={(v) => maj((x) => void (x.demandeur.age = v))} />
      <ChampChoix
        legende="Vivez-vous en couple ?"
        aide="Mariage, Pacs ou union libre."
        options={[
          ["non", "Non, seul(e)"],
          ["oui", "Oui, en couple"],
        ]}
        valeur={s.conjoint ? "oui" : "non"}
        onChange={(v) =>
          maj((x) => {
            x.conjoint = v === "oui" ? (x.conjoint ?? { age: null, activite: "salarie", revenusActivite: 0 }) : null;
          })
        }
      />
      {s.conjoint && (
        <ChampNombre label="Âge de votre conjoint(e)" valeur={s.conjoint.age} max={120} suffixe="ans" onChange={(v) => maj((x) => void (x.conjoint!.age = v))} />
      )}
      <fieldset className="mb-4">
        <legend className="font-medium">Enfants à votre charge</legend>
        <p className="text-sm text-gray-700">Enfants qui vivent avec vous (moins de 25 ans). Indiquez l&apos;âge de chacun.</p>
        <ul className="mt-2 space-y-2">
          {s.enfants.map((e, i) => (
            <li key={i} className="flex items-end gap-3">
              <ChampNombre
                label={`Âge de l'enfant ${i + 1}`}
                valeur={e.age}
                max={24}
                suffixe="ans"
                onChange={(v) => maj((x) => void (x.enfants[i].age = Math.max(0, Math.round(v ?? 0))))}
              />
              <button
                type="button"
                className="mb-5 text-blue-900 underline"
                aria-label={`Retirer l'enfant ${i + 1}`}
                onClick={() => maj((x) => void x.enfants.splice(i, 1))}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
        <Bouton secondaire onClick={() => maj((x) => void x.enfants.push({ age: 0 }))}>
          + Ajouter un enfant
        </Bouton>
      </fieldset>
    </>
  );
}

export function EtapeLogement({ s, maj }: Props) {
  const locataire = s.logement.statut === "locataire" || s.logement.statut === "locataire_hlm";
  return (
    <>
      <ChampChoix<StatutLogement>
        legende="Vous êtes…"
        options={[
          ["locataire", "Locataire (privé)"],
          ["locataire_hlm", "Locataire HLM"],
          ["proprietaire", "Propriétaire"],
          ["heberge", "Hébergé(e) gratuitement"],
        ]}
        valeur={s.logement.statut}
        onChange={(v) => maj((x) => void (x.logement.statut = v))}
      />
      {locataire && (
        <>
          <ChampNombre
            label="Loyer mensuel hors charges"
            aide="Montant inscrit sur votre bail ou votre quittance, sans les charges."
            valeur={s.logement.loyer}
            suffixe="€ / mois"
            onChange={(v) => maj((x) => void (x.logement.loyer = v))}
          />
          <CaseACocher label="Je suis en colocation" coche={s.logement.colocation} onChange={(v) => maj((x) => void (x.logement.colocation = v))} />
        </>
      )}
      <ChampCommune valeur={s.logement.commune} onChange={(c) => maj((x) => void (x.logement.commune = c))} />
    </>
  );
}

function BlocAdulte({ titre, a, set }: { titre: string; a: Adulte; set: (f: (a: Adulte) => void) => void }) {
  return (
    <div className="mb-4 border-l-4 border-gray-300 pl-4">
      <ChampChoix<Activite> legende={titre} options={ACTIVITES} valeur={a.activite} onChange={(v) => set((x) => void (x.activite = v))} />
      <ChampNombre
        label="Revenus d'activité nets par mois"
        aide="Salaire net avant impôt (moyenne des 3 derniers mois), ou revenu mensuel d'indépendant. 0 si aucun."
        valeur={a.revenusActivite}
        suffixe="€ / mois"
        onChange={(v) => set((x) => void (x.revenusActivite = v ?? 0))}
      />
    </div>
  );
}

export function EtapeActivite({ s, maj }: Props) {
  return (
    <>
      <BlocAdulte titre="Votre situation professionnelle" a={s.demandeur} set={(f) => maj((x) => f(x.demandeur))} />
      {s.conjoint && <BlocAdulte titre="Situation de votre conjoint(e)" a={s.conjoint} set={(f) => maj((x) => f(x.conjoint!))} />}
      <ChampNombre
        label="Autres revenus du foyer par mois"
        aide="Allocations chômage, retraites, pensions alimentaires reçues, pensions d'invalidité… Sans les aides de la CAF."
        valeur={s.autresRevenus}
        suffixe="€ / mois"
        onChange={(v) => maj((x) => void (x.autresRevenus = v ?? 0))}
      />
      <p className="text-sm text-gray-700">
        Revenus nets mensuels du foyer : <strong>{Math.round(s.demandeur.revenusActivite + (s.conjoint?.revenusActivite ?? 0) + s.autresRevenus)} €</strong>
      </p>
    </>
  );
}

export function EtapeParticuliere({ s, maj }: Props) {
  return (
    <>
      <p className="mb-3 text-gray-700">Cochez ce qui vous concerne (vous ou votre conjoint). Tout est facultatif.</p>
      <CaseACocher
        label="Situation de handicap"
        aide="Handicap reconnu ou en cours de reconnaissance par la MDPH."
        coche={s.particulier.handicap}
        onChange={(v) => maj((x) => void (x.particulier.handicap = v))}
      />
      <CaseACocher label="Grossesse en cours" coche={s.particulier.grossesse} onChange={(v) => maj((x) => void (x.particulier.grossesse = v))} />
      <CaseACocher
        label="Je suis en apprentissage"
        aide="Contrat d'apprentissage."
        coche={s.particulier.apprentissage}
        onChange={(v) => maj((x) => void (x.particulier.apprentissage = v))}
      />
      <CaseACocher
        label="Je suis en alternance (contrat de professionnalisation)"
        coche={s.particulier.alternance}
        onChange={(v) => maj((x) => void (x.particulier.alternance = v))}
      />
      <ChampNombre
        label="Revenu fiscal de référence (facultatif)"
        aide="Sur votre dernier avis d'impôt, en première page. Sinon, nous l'estimons à partir de vos revenus."
        valeur={s.complements.rfr}
        suffixe="€ / an"
        onChange={(v) => maj((x) => void (x.complements.rfr = v))}
      />
    </>
  );
}
