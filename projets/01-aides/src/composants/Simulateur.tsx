"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { situationVide, type Situation } from "../moteur";
import { lireFragment, normaliserSituation } from "../lib/partage";
import { Bouton } from "./champs";
import { EtapeActivite, EtapeFoyer, EtapeLogement, EtapeParticuliere } from "./Etapes";
import { Resultats } from "./Resultats";

const CLE_STOCKAGE = "vie-fr:01-aides:situation";

const ETAPES = [
  { titre: "Votre foyer", Composant: EtapeFoyer },
  { titre: "Votre logement", Composant: EtapeLogement },
  { titre: "Vos activités et revenus", Composant: EtapeActivite },
  { titre: "Situations particulières", Composant: EtapeParticuliere },
] as const;

const RESULTATS = ETAPES.length;

function charger(): Situation | null {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    return brut ? normaliserSituation(JSON.parse(brut)) : null;
  } catch {
    return null;
  }
}

export function Simulateur() {
  const [s, setS] = useState<Situation>(situationVide);
  const [etape, setEtape] = useState(0);
  const [erreur, setErreur] = useState("");
  const [pret, setPret] = useState(false);
  const titre = useRef<HTMLHeadingElement>(null);

  // Au chargement : lien de partage (#s=…) en priorité, sinon la saisie précédente gardée dans ce navigateur.
  useEffect(() => {
    const partagee = lireFragment(window.location.hash);
    if (partagee) {
      setS(partagee);
      setEtape(RESULTATS);
    } else {
      const locale = charger();
      if (locale) setS(locale);
    }
    setPret(true);
  }, []);

  useEffect(() => {
    if (!pret) return;
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(s));
    } catch {
      // Stockage indisponible (navigation privée) : on continue sans.
    }
  }, [s, pret]);

  useEffect(() => {
    if (pret) titre.current?.focus();
  }, [etape, pret]);

  const maj = useCallback((f: (x: Situation) => void) => {
    setS((ancien) => {
      const copie = structuredClone(ancien);
      f(copie);
      return copie;
    });
  }, []);

  const suivant = () => {
    if (etape === 0 && (s.demandeur.age === null || s.demandeur.age < 15)) {
      setErreur("Indiquez votre âge (15 ans ou plus) pour continuer.");
      return;
    }
    setErreur("");
    setEtape((e) => Math.min(RESULTATS, e + 1));
  };

  const recommencer = () => {
    setS(situationVide());
    setEtape(0);
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (etape === RESULTATS) {
    return (
      <>
        <h2 ref={titre} tabIndex={-1} className="mb-4 text-2xl font-bold focus:outline-none">
          Les aides auxquelles vous pourriez avoir droit
        </h2>
        <ResumeSituation s={s} />
        <Resultats s={s} maj={maj} modifier={() => setEtape(0)} />
        <p className="mt-6 print:hidden">
          <button type="button" className="text-blue-900 underline" onClick={recommencer}>
            Effacer mes réponses et recommencer
          </button>
        </p>
      </>
    );
  }

  const { titre: titreEtape, Composant } = ETAPES[etape];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        suivant();
      }}
      noValidate
    >
      <p className="text-sm text-gray-700">
        Étape {etape + 1} sur {ETAPES.length} — moins de 5 minutes, aucun document nécessaire.
      </p>
      <div className="my-2 h-2 w-full rounded bg-gray-200" aria-hidden="true">
        <div className="h-2 rounded bg-blue-900" style={{ width: `${((etape + 1) / ETAPES.length) * 100}%` }} />
      </div>
      <h2 ref={titre} tabIndex={-1} className="mb-4 text-2xl font-bold focus:outline-none">
        {titreEtape}
      </h2>
      <Composant s={s} maj={maj} />
      {erreur && (
        <p role="alert" className="mb-3 font-medium text-red-800">
          {erreur}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {etape > 0 && (
          <Bouton secondaire onClick={() => setEtape((e) => e - 1)}>
            Précédent
          </Bouton>
        )}
        <Bouton type="submit">{etape === ETAPES.length - 1 ? "Voir mes aides" : "Suivant"}</Bouton>
      </div>
    </form>
  );
}

function ResumeSituation({ s }: { s: Situation }) {
  const statut = { locataire: "locataire", locataire_hlm: "locataire HLM", proprietaire: "propriétaire", heberge: "hébergé(e)" }[s.logement.statut];
  const revenus = s.demandeur.revenusActivite + (s.conjoint?.revenusActivite ?? 0) + s.autresRevenus;
  return (
    <p className="mb-4 text-gray-700">
      {s.conjoint ? "Couple" : "Personne seule"}
      {s.enfants.length > 0 ? `, ${s.enfants.length} enfant${s.enfants.length > 1 ? "s" : ""} (${s.enfants.map((e) => e.age).join(", ")} ans)` : ", sans enfant"}, {statut}
      {s.logement.loyer ? ` (loyer ${Math.round(s.logement.loyer)} €)` : ""}
      {s.logement.commune?.nom ? ` à ${s.logement.commune.nom}` : ""}, {Math.round(revenus)} € nets par mois.
    </p>
  );
}
