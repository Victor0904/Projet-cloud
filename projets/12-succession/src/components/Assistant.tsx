"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ajouterContratLibre,
  ajouterOrganisme,
  changerStatut,
  charger,
  effacer,
  etatInitial,
  fusionner,
  marquerDemarche,
  modifierElement,
  organismesSuggeres,
  retirerElement,
  sauvegarder,
  type EtatApp,
} from "../etat/etat";
import { aujourdhuiUtc } from "../lib/dates";
import { organisme, type TypeLettre } from "../lib/donnees";
import { genererPlan } from "../plan/generer";
import { Questionnaire } from "./Questionnaire";
import { Encart } from "./ui";
import { VueDroits } from "./VueDroits";
import { VueInventaire } from "./VueInventaire";
import { VueLettres, type SelectionLettre } from "./VueLettres";
import { VuePartage } from "./VuePartage";
import { VuePlan } from "./VuePlan";

type Onglet = "situation" | "plan" | "inventaire" | "lettres" | "droits" | "partage";

const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: "situation", nom: "Votre situation" },
  { id: "plan", nom: "Le plan" },
  { id: "inventaire", nom: "Organismes" },
  { id: "lettres", nom: "Courriers" },
  { id: "droits", nom: "Droits et aides" },
  { id: "partage", nom: "Partager" },
];

export function Assistant() {
  const [etat, setEtat] = useState<EtatApp>(etatInitial);
  const [charge, setCharge] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("situation");
  const [selection, setSelection] = useState<SelectionLettre>({ type: "information_deces", organisme: "banque" });

  // Lecture du stockage local après le premier rendu (évite les écarts entre serveur et navigateur).
  useEffect(() => {
    const e = charger();
    if (e) {
      setEtat(e);
      if (e.questionnaireValide) setOnglet("plan");
    }
    setCharge(true);
  }, []);

  useEffect(() => {
    if (charge) sauvegarder(etat);
  }, [etat, charge]);

  const aujourdhui = aujourdhuiUtc();
  const plan = useMemo(
    () => (etat.questionnaireValide ? genererPlan(etat.profil) : null),
    [etat.profil, etat.questionnaireValide],
  );
  const suggeres = useMemo(() => organismesSuggeres(etat.profil), [etat.profil]);

  function aller(o: Onglet) {
    setOnglet(o);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function ouvrirLettre(type: TypeLettre, org: string | null, reference = "", nomLibre = "") {
    setSelection({ type, organisme: org });
    setEtat((e) => ({
      ...e,
      infosLettre: {
        ...e.infosLettre,
        reference,
        destinataireNom: nomLibre,
        destinataireAdresse: "",
      },
    }));
    aller("lettres");
  }

  const pret = etat.questionnaireValide && plan;

  return (
    <div>
      <p className="mb-4 text-gray-800 print:hidden">
        Nous sommes désolés pour votre perte. Cet assistant vous aide à savoir quoi faire, quand, et auprès de qui.
        Prenez votre temps : tout est enregistré au fur et à mesure, sur cet appareil seulement.
      </p>

      <nav aria-label="Étapes" className="mb-6 print:hidden">
        <ul className="flex flex-wrap gap-1 border-b-2 border-gray-300">
          {ONGLETS.map((o) => {
            const actif = onglet === o.id;
            const bloque = o.id !== "situation" && !pret;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => aller(o.id)}
                  disabled={bloque}
                  aria-current={actif ? "page" : undefined}
                  className={`-mb-0.5 border-b-4 px-3 py-2 font-medium focus:outline-2 focus:outline-blue-700 disabled:cursor-not-allowed disabled:text-gray-400 ${
                    actif ? "border-blue-900 text-blue-900" : "border-transparent text-gray-800 hover:border-gray-400"
                  }`}
                >
                  {o.nom}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {!charge ? (
        <p>Chargement…</p>
      ) : onglet === "situation" || !pret ? (
        <Questionnaire
          profil={etat.profil}
          onChange={(profil) => setEtat((e) => ({ ...e, profil, majLe: new Date().toISOString() }))}
          onValider={() => {
            setEtat((e) => ({ ...e, questionnaireValide: true, majLe: new Date().toISOString() }));
            aller("plan");
          }}
        />
      ) : onglet === "plan" ? (
        <VuePlan
          plan={plan}
          profil={etat.profil}
          demarchesFaites={etat.demarchesFaites}
          aujourdhui={aujourdhui}
          onToggle={(id, f) => setEtat((e) => marquerDemarche(e, id, f))}
          onLettre={(type, org) => ouvrirLettre(type, org)}
          onModifier={() => aller("situation")}
        />
      ) : onglet === "inventaire" ? (
        <VueInventaire
          inventaire={etat.inventaire}
          suggeres={suggeres}
          onAjouter={(id) => setEtat((e) => ajouterOrganisme(e, organisme(id)))}
          onAjouterSuggeres={() =>
            setEtat((e) => suggeres.reduce((acc, id) => ajouterOrganisme(acc, organisme(id)), e))
          }
          onAjouterLibre={(nom, ref) => setEtat((e) => ajouterContratLibre(e, nom, ref))}
          onRetirer={(id) => setEtat((e) => retirerElement(e, id))}
          onStatut={(id, s) => setEtat((e) => changerStatut(e, id, s))}
          onModifier={(id, c) => setEtat((e) => modifierElement(e, id, c))}
          onLettre={(type, org, ref, nom) => ouvrirLettre(type, org, ref, nom)}
        />
      ) : onglet === "lettres" ? (
        <VueLettres
          infos={etat.infosLettre}
          profil={etat.profil}
          selection={selection}
          onInfos={(infosLettre) => setEtat((e) => ({ ...e, infosLettre }))}
          onSelection={setSelection}
        />
      ) : onglet === "droits" ? (
        <VueDroits
          profil={etat.profil}
          onVoirDemarche={(id) => {
            setOnglet("plan");
            window.setTimeout(() => {
              const cible = document.getElementById(`titre-${id}`);
              if (cible) cible.scrollIntoView({ block: "center" });
              else window.scrollTo({ top: 0 });
            }, 50);
          }}
        />
      ) : (
        <VuePartage
          etat={etat}
          onRemplacer={(e) => setEtat({ ...e, majLe: new Date().toISOString() })}
          onFusionner={(recu) => setEtat((e) => fusionner(e, recu))}
          onEffacer={() => {
            effacer();
            setEtat(etatInitial());
            setSelection({ type: "information_deces", organisme: "banque" });
          }}
        />
      )}

      {pret && onglet !== "situation" && (
        <div className="print:hidden">
          <Encart>
            <span className="text-sm">
              Vos données restent sur cet appareil. Pensez à exporter le fichier de partage (onglet « Partager ») pour
              en garder une copie ou la transmettre à vos proches.
            </span>
          </Encart>
        </div>
      )}
    </div>
  );
}
