"use client";

import { useEffect, useState } from "react";
import { BoutonExportPdf, Champ } from "@vie-fr/ui";
import derogations from "../../data/derogations.json";
import type { AdresseDetaillee } from "@/lib/adresse";
import { lireAdresse, memoriserAdresse } from "@/lib/adresseMemoire";
import { CRITERES, redigerLettre, type DemandeDerogation } from "@/lib/lettre";
import { EncartSecteur } from "./EncartSecteur";
import { RechercheAdresse } from "./RechercheAdresse";
import { useDonneesAdresse } from "./useDonneesAdresse";

const VIDE: DemandeDerogation = {
  parent: "",
  adresse: "",
  enfant: "",
  dateNaissance: "",
  classeRentree: "6e",
  ecoleActuelle: "",
  collegeSecteur: "",
  collegeDemande: "",
  motifs: [],
  precisions: "",
  ville: "",
  date: "",
};

export function MonSecteur() {
  const [adresse, setAdresse] = useState<AdresseDetaillee | null>(null);
  const donnees = useDonneesAdresse(adresse);
  const [d, setD] = useState<DemandeDerogation>(VIDE);
  const maj = (k: keyof DemandeDerogation) => (ev: { target: { value: string } }) => setD((x) => ({ ...x, [k]: ev.target.value }));

  useEffect(() => setAdresse(lireAdresse()), []);

  // Pré-remplit l'adresse et le collège de secteur dans la lettre quand ils sont connus.
  useEffect(() => {
    if (!adresse) return;
    setD((x) => ({ ...x, adresse: x.adresse || adresse.label, ville: x.ville || adresse.commune }));
  }, [adresse]);
  useEffect(() => {
    if (donnees.etat !== "pret" || donnees.secteur.statut !== "trouve") return;
    const uai = donnees.secteur.colleges[0];
    const e = donnees.fichier.etablissements.find((x) => x.uai === uai);
    if (e) setD((x) => ({ ...x, collegeSecteur: x.collegeSecteur || `${e.nom} (${e.commune})` }));
  }, [donnees]);

  const lettre = redigerLettre(d);

  return (
    <div>
      <section className="print:hidden">
        <RechercheAdresse
          key={adresse?.label ?? "vide"}
          valeurInitiale={adresse?.label ?? ""}
          onChoix={(a) => {
            memoriserAdresse(a);
            setAdresse(a);
          }}
        />
        {donnees.etat === "chargement" && <p className="mt-2">Chargement…</p>}
        {donnees.etat === "hors_couverture" && (
          <p className="mt-2 rounded border border-orange-800 bg-orange-50 p-3">
            Département non importé dans cet outil. Pour connaître votre collège de secteur, contactez la mairie ou la
            DSDEN de votre département.
          </p>
        )}
        {donnees.etat === "pret" && adresse && (
          <EncartSecteur adresse={adresse} resultat={donnees.secteur} carte={donnees.carte} etabs={donnees.fichier.etablissements} />
        )}
      </section>

      <section id="derogations" className="mt-8 print:hidden" aria-labelledby="t-derog">
        <h2 id="t-derog" className="text-xl font-bold">Demander un autre collège : la dérogation</h2>
        <p className="mt-2">{derogations.principe}</p>
        <p className="mt-2">
          <strong>Qui décide ?</strong> {derogations.qui_decide}
        </p>
        <h3 className="mt-4 font-bold">Les motifs reconnus, par ordre de priorité</h3>
        <ol className="ml-6 list-decimal space-y-1">
          {CRITERES.map((c) => (
            <li key={c.code}>
              {c.libelle} <span className="text-sm text-gray-700">— justificatif : {c.justificatif}</span>
            </li>
          ))}
        </ol>
        <h3 className="mt-4 font-bold">Quand ?</h3>
        <p>{derogations.calendrier.texte}</p>
        <h3 className="mt-4 font-bold">Et si c&apos;est refusé ?</h3>
        <p>{derogations.recours}</p>
        <h3 className="mt-4 font-bold">École ou lycée</h3>
        <p>{derogations.ecoles}</p>
        <p className="mt-1">{derogations.lycees}</p>
        <p className="mt-3 text-xs text-gray-600">
          Sources :{" "}
          <a href={derogations.source} className="underline" target="_blank" rel="noreferrer">
            service-public.gouv.fr
          </a>
          ,{" "}
          <a href={derogations.source_juridique_url} className="underline" target="_blank" rel="noreferrer">
            {derogations.source_juridique}
          </a>
          . Vérification : {derogations.verifie_le === "A_VERIFIER" ? "à confirmer (sources officielles non consultées lors de la rédaction)" : derogations.verifie_le}.
          Les dates et formulaires changent selon le département : renseignez-vous auprès de l&apos;école ou de la DSDEN.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="t-lettre">
        <h2 id="t-lettre" className="text-xl font-bold print:hidden">Préparer ma lettre de demande</h2>
        <p className="text-sm text-gray-700 print:hidden">
          Remplissez ce que vous voulez : les champs vides resteront en pointillés à compléter à la main. Rien n&apos;est
          envoyé : la lettre est fabriquée dans votre navigateur. {derogations.limites}
        </p>
        <div className="mt-3 grid gap-x-6 sm:grid-cols-2 print:hidden">
          <Champ label="Vos nom et prénom" value={d.parent} onChange={maj("parent")} autoComplete="name" />
          <Champ label="Votre adresse" value={d.adresse} onChange={maj("adresse")} />
          <Champ label="Nom et prénom de l'enfant" value={d.enfant} onChange={maj("enfant")} />
          <Champ label="Date de naissance de l'enfant" value={d.dateNaissance} onChange={maj("dateNaissance")} placeholder="jj/mm/aaaa" />
          <Champ label="Classe à la rentrée" value={d.classeRentree} onChange={maj("classeRentree")} />
          <Champ label="École ou collège actuel" value={d.ecoleActuelle} onChange={maj("ecoleActuelle")} />
          <Champ label="Collège de secteur" value={d.collegeSecteur} onChange={maj("collegeSecteur")} />
          <Champ label="Collège demandé" value={d.collegeDemande} onChange={maj("collegeDemande")} />
          <Champ label="Ville" value={d.ville} onChange={maj("ville")} />
          <Champ label="Date de la lettre" value={d.date} onChange={maj("date")} placeholder="jj/mm/aaaa" />
        </div>
        <fieldset className="mt-2 print:hidden">
          <legend className="font-medium">Motif(s) de la demande</legend>
          {CRITERES.map((c) => (
            <label key={c.code} className="block">
              <input
                type="checkbox"
                className="mr-2"
                checked={d.motifs.includes(c.code)}
                onChange={() =>
                  setD((x) => ({
                    ...x,
                    motifs: x.motifs.includes(c.code) ? x.motifs.filter((m) => m !== c.code) : [...x.motifs, c.code],
                  }))
                }
              />
              {c.libelle}
            </label>
          ))}
        </fieldset>
        <div className="mt-3 print:hidden">
          <label htmlFor="precisions" className="block font-medium">
            Précisions (facultatif)
          </label>
          <textarea
            id="precisions"
            value={d.precisions}
            onChange={maj("precisions")}
            rows={3}
            className="mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700"
          />
        </div>
        <p className="mt-3 print:hidden">
          <BoutonExportPdf libelle="Imprimer ou enregistrer la lettre en PDF" />
        </p>
        <div className="mt-4 rounded border p-6 font-serif leading-relaxed print:border-0 print:p-0" aria-label="Aperçu de la lettre">
          {lettre.map((p, i) => (
            <p key={i} className={`mb-3 whitespace-pre-line ${i === 1 || i === 2 ? "text-right" : ""}`}>
              {p}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
