"use client";

import { useEffect, useRef, useState } from "react";
import { chargerEtat, effacerEtat, ETAT_PAR_DEFAUT, lireEtat, sauverEtat, telecharger, type Etat } from "@/lib/etat";
import { SectionComparaison } from "./SectionComparaison";
import { SectionContribution } from "./SectionContribution";
import { SectionFoyer } from "./SectionFoyer";
import { SectionGarde } from "./SectionGarde";
import { SectionUsage } from "./SectionUsage";

const bouton = "rounded border-2 border-blue-900 px-3 py-1 text-sm font-medium text-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700";

export function Application() {
  const [etat, setEtat] = useState<Etat>(ETAT_PAR_DEFAUT);
  const [pret, setPret] = useState(false);
  const [message, setMessage] = useState("");
  const fichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const e = chargerEtat();
    if (e) setEtat(e);
    setPret(true);
  }, []);

  useEffect(() => {
    if (pret) sauverEtat(etat);
  }, [etat, pret]);

  async function importer(f: File | undefined) {
    if (!f) return;
    try {
      const e = lireEtat(JSON.parse(await f.text()));
      if (!e) throw new Error();
      setEtat(e);
      setMessage("Données importées.");
    } catch {
      setMessage("Fichier illisible : choisissez un fichier exporté par cet outil.");
    }
  }

  return (
    <>
      <p className="mb-2 border-l-4 border-blue-900 bg-blue-50 p-3 text-sm">
        <strong>Vos données restent sur votre appareil.</strong> Les calculs se font dans votre navigateur ; rien n&apos;est envoyé. Les montants sont des
        estimations à partir des grilles publiées par les mairies et la CAF ; ils ne remplacent pas la facture ni la démarche officielle.
      </p>
      <nav aria-label="Étapes" className="mb-6 print:hidden">
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><a className="underline" href="#foyer">1. Foyer</a></li>
          <li><a className="underline" href="#besoins">2. Besoins</a></li>
          <li><a className="underline" href="#comparaison">3. Comparaison</a></li>
          <li><a className="underline" href="#creche">4. Crèche ou assistante maternelle</a></li>
          <li><a className="underline" href="#contribuer">5. Contribuer</a></li>
        </ol>
      </nav>

      <SectionFoyer foyer={etat.foyer} onChange={(foyer) => setEtat({ ...etat, foyer })} />
      <SectionUsage usage={etat.usage} onChange={(usage) => setEtat({ ...etat, usage })} />
      <SectionComparaison foyer={etat.foyer} usage={etat.usage} communes={etat.communes} onCommunes={(communes) => setEtat({ ...etat, communes })} />
      <SectionGarde foyer={etat.foyer} garde={etat.garde} communePrincipale={etat.communes[0]} onChange={(garde) => setEtat({ ...etat, garde })} />
      <SectionContribution />

      <section aria-labelledby="donnees-titre" className="mb-6 print:hidden">
        <h2 id="donnees-titre" className="mb-2 text-lg font-bold">Vos données</h2>
        <p className="mb-2 text-sm text-gray-700">Vos saisies sont gardées dans ce navigateur. Vous pouvez les exporter pour les reprendre ailleurs.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={bouton} onClick={() => telecharger("quotient-mes-donnees.json", JSON.stringify(etat, null, 2))}>
            Exporter (JSON)
          </button>
          <button type="button" className={bouton} onClick={() => fichier.current?.click()}>
            Importer
          </button>
          <input ref={fichier} type="file" accept="application/json,.json" className="sr-only" aria-label="Fichier à importer" onChange={(e) => importer(e.target.files?.[0])} />
          <button
            type="button"
            className={bouton}
            onClick={() => {
              effacerEtat();
              setEtat(ETAT_PAR_DEFAUT);
              setMessage("Données effacées de ce navigateur.");
            }}
          >
            Tout effacer
          </button>
        </div>
        <p aria-live="polite" className="mt-2 text-sm">
          {message}
        </p>
      </section>
    </>
  );
}
