"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BoutonExportPdf, CarteResultat } from "@vie-fr/ui";
import { euros } from "@vie-fr/fr-data";
import { TAUX } from "@/paie/taux";
import { calculerScenario, exempleParis, scenarioParDefaut, type Scenario } from "@/paie/scenario";
import { pointIndifference, type PointIndifference } from "@/paie/indifference";
import {
  MAX_SCENARIOS,
  contexteParDefaut,
  lienDePartage,
  lireFragment,
  normaliserEtat,
  type Etat,
} from "@/paie/partage";
import { FormulaireScenario } from "./FormulaireScenario";
import { FormulaireFoyer } from "./FormulaireFoyer";
import { TableauComparatif } from "./TableauComparatif";
import { Graphique } from "./Graphique";
import { DetailScenario, Sources } from "./Details";

const CLE_STOCKAGE = "vie-fr-08-changer-de-boulot";
const lettre = (i: number) => String.fromCharCode(65 + i);
const etatExemple = (): Etat => ({ v: 1, scenarios: exempleParis(), contexte: contexteParDefaut() });

function phraseIndifference(nomA: string, nomB: string, p: PointIndifference, joursFactures: number): string {
  if (p.montant === null) return `${nomB} n'atteint pas ${nomA} dans la plage de montants testée.`;
  if (p.montant === 0) return `${nomB} laisse au moins autant que ${nomA}, quel que soit le montant.`;
  if (p.unite === "brut")
    return `${nomB} vaut ${nomA} à partir de ${euros(p.montant, true)} brut par an (même reste après frais pro).`;
  return `${nomB} vaut ${nomA} à partir d'un TJM de ${euros(p.montant, true)} HT, soit ${euros(p.chiffreAffaires ?? 0, true)} de chiffre d'affaires sur ${joursFactures} jours facturés.`;
}

export function Comparateur() {
  const [etat, setEtat] = useState<Etat>(etatExemple);
  const [actif, setActif] = useState(0);
  const [lien, setLien] = useState("");
  const [avecFoyer, setAvecFoyer] = useState(false);
  const [message, setMessage] = useState("");
  const charge = useRef(false);
  const fichier = useRef<HTMLInputElement>(null);

  // Au chargement : lien partagé (#e=…) prioritaire, sinon dernier état enregistré sur l'appareil.
  useEffect(() => {
    const depuisLien = lireFragment(window.location.hash);
    if (depuisLien) {
      setEtat(depuisLien);
      setMessage("Scénarios chargés depuis le lien partagé.");
    } else {
      try {
        const brut = window.localStorage.getItem(CLE_STOCKAGE);
        const lu = brut ? normaliserEtat(JSON.parse(brut)) : null;
        if (lu) setEtat(lu);
      } catch {
        // Stockage indisponible ou corrompu : on garde l'exemple.
      }
    }
    charge.current = true;
  }, []);

  useEffect(() => {
    if (!charge.current) return;
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    } catch {
      // Navigation privée : pas d'enregistrement, sans gravité.
    }
  }, [etat]);

  const differe = useDeferredValue(etat);
  const resultats = useMemo(
    () => differe.scenarios.map((s) => calculerScenario(s, differe.contexte)),
    [differe],
  );
  const indifferences = useMemo(
    () =>
      differe.scenarios
        .slice(1)
        .map((b) => pointIndifference(differe.scenarios[0], b, differe.contexte, "resteAnnuel", TAUX, resultats[0])),
    [differe, resultats],
  );

  const majScenario = (i: number, patch: Partial<Scenario>) =>
    setEtat((e) => ({ ...e, scenarios: e.scenarios.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const ajouter = () => {
    if (etat.scenarios.length >= MAX_SCENARIOS) return;
    const n = etat.scenarios.length;
    setEtat((e) => ({ ...e, scenarios: [...e.scenarios, scenarioParDefaut("salarie_cadre", `Offre ${lettre(n)}`)] }));
    setActif(n);
  };
  const dupliquer = (i: number) => {
    if (etat.scenarios.length >= MAX_SCENARIOS) return;
    const n = etat.scenarios.length;
    setEtat((e) => ({ ...e, scenarios: [...e.scenarios, { ...e.scenarios[i], nom: `${e.scenarios[i].nom} (copie)` }] }));
    setActif(n);
  };
  const supprimer = (i: number) => {
    if (etat.scenarios.length <= 1) return;
    setEtat((e) => ({ ...e, scenarios: e.scenarios.filter((_, j) => j !== i) }));
    setActif(0);
  };

  const exporterJson = () => {
    const blob = new Blob([JSON.stringify(etat, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios-changer-de-boulot.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importerJson = (f: File) => {
    f.text()
      .then((t) => {
        const lu = normaliserEtat(JSON.parse(t));
        if (!lu) throw new Error("vide");
        setEtat(lu);
        setActif(0);
        setMessage("Scénarios importés.");
      })
      .catch(() => setMessage("Fichier illisible : ce n'est pas un export de cet outil."));
  };
  const creerLien = async () => {
    const l = lienDePartage(etat, window.location.href, avecFoyer);
    setLien(l);
    try {
      await navigator.clipboard.writeText(l);
      setMessage("Lien copié dans le presse-papiers.");
    } catch {
      setMessage("Copiez le lien ci-dessous.");
    }
  };

  const meilleur = resultats.reduce((m, r, i) => (r.resteMensuel > resultats[m].resteMensuel ? i : m), 0);
  const s = etat.scenarios[Math.min(actif, etat.scenarios.length - 1)];

  return (
    <div>
      <p className="mb-4">
        Comparez jusqu&apos;à trois situations (CDI, freelance, portage, société) sur ce qui compte vraiment : ce qui reste
        chaque mois après cotisations, impôt, frais de trajet et de mutuelle, et ce que vaut une heure de votre temps,
        trajet compris. Un exemple est pré-rempli : modifiez-le.
      </p>
      <p className="mb-4 rounded bg-gray-100 p-3 text-sm">
        <strong>Confidentialité :</strong> tous les calculs se font dans votre navigateur. Rien n&apos;est envoyé : vos
        scénarios sont seulement enregistrés sur cet appareil.
      </p>

      {message && (
        <p role="status" className="mb-4 border-l-4 border-blue-900 bg-blue-50 p-2 text-sm print:hidden">
          {message}
        </p>
      )}

      <section aria-labelledby="titre-saisie" className="print:hidden">
        <h2 id="titre-saisie" className="mb-2 text-xl font-bold">
          1. Vos scénarios
        </h2>
        <div role="tablist" aria-label="Scénarios" className="mb-4 flex flex-wrap gap-2">
          {etat.scenarios.map((sc, i) => (
            <button
              key={i}
              role="tab"
              type="button"
              aria-selected={i === actif}
              onClick={() => setActif(i)}
              className={`rounded border-2 px-3 py-2 text-left text-sm focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 ${
                i === actif ? "border-blue-900 bg-blue-900 text-white" : "border-blue-900 bg-white text-blue-900"
              }`}
            >
              {lettre(i)}. {sc.nom || "Sans nom"}
            </button>
          ))}
          {etat.scenarios.length < MAX_SCENARIOS && (
            <button
              type="button"
              onClick={ajouter}
              className="rounded border-2 border-dashed border-blue-900 px-3 py-2 text-sm text-blue-900 focus:outline-2 focus:outline-blue-700"
            >
              + Ajouter un scénario
            </button>
          )}
        </div>
        <div role="tabpanel" aria-label={`Scénario ${lettre(actif)}`} className="rounded border border-gray-300 bg-gray-50 p-4">
          <FormulaireScenario s={s} onChange={(p) => majScenario(actif, p)} />
          <div className="flex flex-wrap gap-2">
            {etat.scenarios.length < MAX_SCENARIOS && (
              <button type="button" onClick={() => dupliquer(actif)} className="rounded border border-gray-500 px-3 py-1 text-sm">
                Dupliquer ce scénario
              </button>
            )}
            {etat.scenarios.length > 1 && (
              <button
                type="button"
                onClick={() => supprimer(actif)}
                className="rounded border border-red-700 px-3 py-1 text-sm text-red-800"
              >
                Supprimer ce scénario
              </button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <FormulaireFoyer c={etat.contexte} onChange={(c) => setEtat((e) => ({ ...e, contexte: c }))} />
        </div>
      </section>

      <section aria-labelledby="titre-resultat" className="mt-8">
        <h2 id="titre-resultat" className="mb-2 text-xl font-bold">
          2. Comparaison
        </h2>
        <CarteResultat
          titre={`Ce qui vous reste le plus : ${lettre(meilleur)}. ${resultats[meilleur].nom}`}
          valeur={`${euros(resultats[meilleur].resteMensuel, true)} / mois`}
          source="https://mon-entreprise.urssaf.fr/"
          verifieLe={TAUX.meta.verifie_le}
        >
          <p className="text-sm">
            Après cotisations, impôt sur le revenu et frais professionnels. Taux et barèmes 2026 (Urssaf, Agirc-Arrco, loi
            de finances pour 2026) : détail en bas de page.
          </p>
        </CarteResultat>

        {indifferences.length > 0 && (
          <div className="my-4 border-l-4 border-green-800 bg-green-50 p-4 break-inside-avoid">
            <h3 className="font-bold">Point d&apos;indifférence</h3>
            <ul className="list-disc pl-5">
              {indifferences.map((p, i) => (
                <li key={i}>
                  {phraseIndifference(
                    `l'offre A (${resultats[0].nom})`,
                    `L'offre ${lettre(i + 1)}`,
                    p,
                    differe.scenarios[i + 1].joursFactures,
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-gray-700">
              Calculé en faisant varier le brut (salarié) ou le TJM (indépendant) de l&apos;offre, tout le reste égal.
            </p>
          </div>
        )}

        <TableauComparatif resultats={resultats} />
        <Graphique resultats={resultats} />

        <h2 className="mb-2 mt-8 text-xl font-bold">3. Hypothèses et limites</h2>
        {resultats.map((r, i) => (
          <DetailScenario key={i} r={r} lettre={lettre(i)} />
        ))}
        <div className="border-l-4 border-gray-500 bg-gray-50 p-3 text-sm">
          <p>
            <strong>Estimation indicative, pas un conseil.</strong> Ne remplace ni une simulation officielle (Urssaf,
            impots.gouv.fr) ni l&apos;avis d&apos;un expert-comptable. Ne sont pas pris en compte : l&apos;assurance
            chômage (droits ARE), les écarts de retraite et de prévoyance entre statuts, les heures supplémentaires,
            l&apos;Alsace-Moselle et l&apos;outre-mer, les réductions de cotisations patronales (portage, société), les
            crédits et réductions d&apos;impôt.
          </p>
        </div>
        <Sources />
      </section>

      <section aria-labelledby="titre-actions" className="mt-8 print:hidden">
        <h2 id="titre-actions" className="mb-2 text-xl font-bold">
          4. Garder et partager
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <BoutonExportPdf libelle="Télécharger la comparaison en PDF" />
          <button
            type="button"
            onClick={creerLien}
            className="rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
          >
            Créer un lien de partage
          </button>
          <button
            type="button"
            onClick={exporterJson}
            className="rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
          >
            Exporter (JSON)
          </button>
          <button
            type="button"
            onClick={() => fichier.current?.click()}
            className="rounded border-2 border-blue-900 px-4 py-2 font-medium text-blue-900 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
          >
            Importer un fichier
          </button>
          <input
            ref={fichier}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Fichier de scénarios à importer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importerJson(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              setEtat(etatExemple());
              setActif(0);
              setMessage("Exemple rechargé.");
            }}
            className="rounded border border-gray-500 px-4 py-2 text-sm"
          >
            Recharger l&apos;exemple
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={avecFoyer}
            onChange={(e) => setAvecFoyer(e.target.checked)}
            className="h-5 w-5 accent-blue-900"
          />
          Inclure la situation du foyer (parts, revenus du conjoint) dans le lien
        </label>
        <p className="mt-1 text-xs text-gray-600">
          Le lien contient seulement les paramètres chiffrés des scénarios (et leurs noms), dans la partie après « # »
          qui n&apos;est jamais envoyée à un serveur. Aucune identité.
        </p>
        {lien && (
          <div className="mt-2">
            <label htmlFor="lien-partage" className="block text-sm font-medium">
              Lien de partage
            </label>
            <input
              id="lien-partage"
              readOnly
              value={lien}
              onFocus={(e) => e.target.select()}
              className="mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 text-sm"
            />
          </div>
        )}
      </section>
    </div>
  );
}
