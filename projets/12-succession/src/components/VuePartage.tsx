"use client";

import { useRef, useState } from "react";
import { deserialiser, serialiser, type EtatApp } from "../etat/etat";
import { Bouton, Encart } from "./ui";

export function VuePartage({
  etat,
  onRemplacer,
  onFusionner,
  onEffacer,
}: {
  etat: EtatApp;
  onRemplacer: (e: EtatApp) => void;
  onFusionner: (e: EtatApp) => void;
  onEffacer: () => void;
}) {
  const fichier = useRef<HTMLInputElement>(null);
  const [recu, setRecu] = useState<EtatApp | null>(null);
  const [message, setMessage] = useState("");
  const [confirmerEffacement, setConfirmerEffacement] = useState(false);

  function exporter() {
    const blob = new Blob([serialiser(etat)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demarches-deces-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Le fichier a été téléchargé. Envoyez-le à vos proches par e-mail ou sur une clé USB.");
  }

  async function lire(f: File | undefined) {
    if (!f) return;
    const r = deserialiser(await f.text());
    if (fichier.current) fichier.current.value = "";
    if (!r.ok) {
      setRecu(null);
      setMessage(r.erreur);
      return;
    }
    setRecu(r.etat);
    setMessage("");
  }

  return (
    <section aria-labelledby="titre-partage">
      <h2 id="titre-partage" className="text-xl font-bold">
        Partager avec vos proches
      </h2>
      <p className="mt-2 text-gray-700">
        Il n&apos;y a pas de compte ni de serveur : tout est enregistré dans ce navigateur. Pour avancer à plusieurs,
        exportez un fichier et envoyez-le ; votre frère ou votre sœur l&apos;importe dans cet outil sur son appareil.
      </p>

      <section aria-labelledby="titre-export" className="mt-6">
        <h3 id="titre-export" className="text-lg font-bold">
          Envoyer l&apos;avancement
        </h3>
        <p className="mt-1 text-gray-700">
          Le fichier contient vos réponses, le suivi des démarches et des organismes, et les informations saisies pour
          les courriers (noms, adresses). Ne l&apos;envoyez qu&apos;à des personnes de confiance.
        </p>
        <Bouton className="mt-3" onClick={exporter}>
          Télécharger le fichier de partage
        </Bouton>
      </section>

      <section aria-labelledby="titre-import" className="mt-8">
        <h3 id="titre-import" className="text-lg font-bold">
          Recevoir l&apos;avancement d&apos;un proche
        </h3>
        <label htmlFor="fichier-import" className="mt-2 block font-medium">
          Choisir le fichier reçu (.json)
        </label>
        <input
          id="fichier-import"
          ref={fichier}
          type="file"
          accept="application/json,.json"
          onChange={(e) => lire(e.target.files?.[0])}
          className="mt-1 block"
        />
        {recu && (
          <Encart titre="Fichier lu">
            <p>
              {recu.inventaire.length} organisme{recu.inventaire.length > 1 ? "s" : ""} suivi
              {recu.inventaire.length > 1 ? "s" : ""}, {Object.keys(recu.demarchesFaites).length} démarche
              {Object.keys(recu.demarchesFaites).length > 1 ? "s" : ""} faite
              {Object.keys(recu.demarchesFaites).length > 1 ? "s" : ""}. Que voulez-vous faire ?
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Bouton
                onClick={() => {
                  onFusionner(recu);
                  setRecu(null);
                  setMessage(
                    "Les deux suivis ont été réunis. Pour chaque organisme, la mise à jour la plus récente est gardée.",
                  );
                }}
              >
                Réunir avec mon suivi
              </Bouton>
              <Bouton
                variante="secondaire"
                onClick={() => {
                  onRemplacer(recu);
                  setRecu(null);
                  setMessage("Votre suivi a été remplacé par celui du fichier.");
                }}
              >
                Remplacer mon suivi
              </Bouton>
            </div>
          </Encart>
        )}
      </section>

      <p role="status" className="mt-4 font-medium text-blue-900">
        {message}
      </p>

      <section aria-labelledby="titre-effacer" className="mt-10 border-t pt-6">
        <h3 id="titre-effacer" className="text-lg font-bold">
          Effacer les données de cet appareil
        </h3>
        <p className="mt-1 text-gray-700">
          Utile sur un ordinateur partagé. Exportez d&apos;abord si vous voulez garder une copie.
        </p>
        {confirmerEffacement ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <Bouton
              className="bg-red-800 hover:bg-red-700"
              onClick={() => {
                onEffacer();
                setConfirmerEffacement(false);
                setMessage("Toutes les données ont été effacées de cet appareil.");
              }}
            >
              Oui, tout effacer
            </Bouton>
            <Bouton variante="secondaire" onClick={() => setConfirmerEffacement(false)}>
              Annuler
            </Bouton>
          </div>
        ) : (
          <Bouton variante="secondaire" className="mt-3" onClick={() => setConfirmerEffacement(true)}>
            Effacer mes données
          </Bouton>
        )}
      </section>
    </section>
  );
}
