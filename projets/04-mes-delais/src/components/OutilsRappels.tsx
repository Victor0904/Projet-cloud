"use client";

import { useEffect, useId, useState } from "react";
import { qrCodeDataUrl } from "@vie-fr/fr-data";
import { genererIcs } from "@/lib/ics";
import { aNotifier, texteNotification } from "@/lib/notifications";
import { encoderLien, fusionner, validerEtat } from "@/lib/stockage";
import { evenementsAgenda, lignes } from "@/lib/vue";
import { modifierEtat, telecharger, useAujourdhui, useEtat } from "./etat";
import { Bouton, Chargement, Encadre } from "./ui";

/** Au-delà, un QR code devient trop dense pour être lu de façon fiable par un téléphone. */
const LONGUEUR_MAX_QR = 2000;

export function lienRappel(encode: string): string {
  const base = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`;
  return `${base}/rappel?data=${encode}`;
}

export function OutilsRappels() {
  const etat = useEtat();
  const auj = useAujourdhui();
  const [permission, setPermission] = useState<string>("inconnue");
  const [qr, setQr] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [messageImport, setMessageImport] = useState<string | null>(null);
  const [modeImport, setModeImport] = useState<"fusion" | "remplacer">("fusion");
  const idFichier = useId();

  const lien = etat && typeof window !== "undefined" ? lienRappel(encoderLien(etat)) : "";
  const lienTropLong = lien.length > LONGUEUR_MAX_QR;

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "indisponible" : Notification.permission);
  }, []);

  useEffect(() => {
    if (!lien || lienTropLong) return;
    let actif = true;
    qrCodeDataUrl(lien, 320)
      .then((u) => actif && setQr(u))
      .catch(() => actif && setQr(null));
    return () => {
      actif = false;
    };
  }, [lien, lienTropLong]);

  if (!etat || !auj) return <Chargement />;
  const ls = lignes(etat, auj);
  const evenements = evenementsAgenda(ls);

  const demanderPermission = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") tester();
  };

  const tester = () => {
    const t = texteNotification(aNotifier(ls, auj), auj) ?? {
      titre: "Mes délais",
      corps: "Rien d'urgent dans les 7 prochains jours. Vous serez prévenu à l'ouverture de la page.",
    };
    try {
      new Notification(t.titre, { body: t.corps, tag: "mes-delais" });
    } catch {
      setPermission("indisponible");
    }
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };

  const importer = async (fichier: File) => {
    try {
      const donnees = validerEtat(JSON.parse(await fichier.text()));
      if (!donnees) {
        setMessageImport("Ce fichier n'est pas une sauvegarde de Mes délais.");
        return;
      }
      modifierEtat((s) => (modeImport === "remplacer" ? donnees : fusionner(s, donnees)));
      setMessageImport(`${donnees.echeances.length} échéance(s) et ${donnees.membres.length} étiquette(s) importées.`);
    } catch {
      setMessageImport("Fichier illisible : ce n'est pas un JSON valide.");
    }
  };

  return (
    <>
      <section aria-labelledby="t-ics" className="mb-8">
        <h2 id="t-ics" className="text-xl font-bold">
          1. Recevoir les rappels dans votre agenda (.ics)
        </h2>
        <p className="mt-2">
          Le fichier contient {evenements.length} événement(s) : la prochaine échéance de chaque élément et jusqu&apos;à 3
          suivantes. Chaque événement déclenche une alerte <strong>60 jours, 30 jours et 7 jours avant, à 9 h</strong>.
        </p>
        <Bouton
          className="mt-3"
          disabled={evenements.length === 0}
          onClick={() => telecharger("mes-delais.ics", genererIcs(evenements), "text/calendar;charset=utf-8")}
        >
          Télécharger mes-delais.ics
        </Bouton>
        <details className="mt-3">
          <summary className="cursor-pointer text-blue-900 underline">Comment l&apos;importer ?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>iPhone, iPad, Mac (Calendrier)</strong> : ouvrez le fichier, choisissez un calendrier, validez. Les
              trois alertes sont conservées.
            </li>
            <li>
              <strong>Outlook, Thunderbird</strong> : Fichier → Importer, ou glissez le fichier dans l&apos;agenda. Les
              alertes sont conservées.
            </li>
            <li>
              <strong>Google Agenda</strong> : sur ordinateur, Paramètres → Importer et exporter → Importer. Attention :
              Google ignore les alertes du fichier et applique les notifications par défaut de l&apos;agenda choisi.
              Créez un agenda « Mes délais » et réglez ses notifications par défaut (par exemple 30 jours et 7 jours
              avant).
            </li>
            <li>
              Après un « c&apos;est fait » ou un ajout, téléchargez et importez à nouveau le fichier : les événements
              existants sont mis à jour (mêmes identifiants), mais les échéances supprimées ne disparaissent pas
              automatiquement de votre agenda.
            </li>
          </ul>
        </details>
      </section>

      <section aria-labelledby="t-notif" className="mb-8">
        <h2 id="t-notif" className="text-xl font-bold">
          2. Notifications du navigateur
        </h2>
        <p className="mt-2">
          Si vous les autorisez, une notification résume les échéances en retard ou à moins de 7 jours, au maximum une
          fois par jour, <strong>quand vous ouvrez cette application</strong> (il n&apos;y a pas de serveur pour vous
          prévenir quand elle est fermée : c&apos;est le rôle du fichier .ics).
        </p>
        <p className="mt-2 text-sm">
          État :{" "}
          <strong>
            {
              {
                granted: "autorisées",
                denied: "refusées (modifiez le réglage du site dans votre navigateur)",
                default: "pas encore demandées",
                indisponible: "non disponibles sur ce navigateur",
                inconnue: "…",
              }[permission]
            }
          </strong>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {permission === "default" && <Bouton onClick={demanderPermission}>Autoriser les notifications</Bouton>}
          {permission === "granted" && (
            <Bouton variante="secondaire" onClick={tester}>
              Envoyer une notification de test
            </Bouton>
          )}
        </div>
      </section>

      <section aria-labelledby="t-lien" className="mb-8">
        <h2 id="t-lien" className="text-xl font-bold">
          3. Lien de rappel et passage au téléphone
        </h2>
        <p className="mt-2">
          Ce lien contient vos échéances (encodées dans l&apos;adresse, rien n&apos;est envoyé à un serveur). Mettez-le
          en favori : à chaque ouverture, les délais sont recalculés à la date du jour. Scannez le QR code avec votre
          téléphone pour y retrouver vos échéances.
        </p>
        {etat.echeances.length === 0 ? (
          <p className="mt-2 text-gray-700">Ajoutez d&apos;abord une échéance.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={lien} className="rounded border border-blue-900 px-4 py-2 font-medium text-blue-900 hover:bg-blue-50">
                Ouvrir le lien de rappel
              </a>
              <Bouton variante="secondaire" onClick={copier}>
                {copie ? "Lien copié ✓" : "Copier le lien"}
              </Bouton>
            </div>
            {lienTropLong ? (
              <Encadre ton="alerte">
                Trop d&apos;échéances pour un QR code lisible ({lien.length} caractères). Utilisez le lien copié ou le
                fichier de sauvegarde ci-dessous.
              </Encadre>
            ) : (
              qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code du lien de rappel, à scanner avec votre téléphone" width={240} height={240} className="mt-3 border" />
              )
            )}
            <p className="mt-2 text-xs text-gray-700">
              Attention : toute personne qui a ce lien voit vos échéances. Ne le partagez qu&apos;avec votre foyer.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="t-sauvegarde" id="importer" className="mb-8">
        <h2 id="t-sauvegarde" className="text-xl font-bold">
          4. Sauvegarde (export / import JSON)
        </h2>
        <p className="mt-2">
          Vos données sont enregistrées uniquement dans ce navigateur. Si vous videz ses données ou changez
          d&apos;appareil, elles sont perdues : gardez une sauvegarde.
        </p>
        <Bouton
          className="mt-3"
          onClick={() =>
            telecharger(`mes-delais-sauvegarde-${auj}.json`, JSON.stringify(etat, null, 2), "application/json;charset=utf-8")
          }
        >
          Télécharger la sauvegarde
        </Bouton>
        <fieldset className="mt-4">
          <legend className="font-medium">Importer une sauvegarde</legend>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" name="mode" checked={modeImport === "fusion"} onChange={() => setModeImport("fusion")} />
              Ajouter à mes échéances actuelles
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="mode" checked={modeImport === "remplacer"} onChange={() => setModeImport("remplacer")} />
              Remplacer mes échéances actuelles
            </label>
          </div>
          <label htmlFor={idFichier} className="mt-2 block text-sm font-medium">
            Fichier .json
          </label>
          <input
            id={idFichier}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importer(f);
              e.target.value = "";
            }}
            className="mt-1 block text-sm"
          />
          {messageImport && (
            <p role="status" className="mt-2 font-medium">
              {messageImport}
            </p>
          )}
        </fieldset>
      </section>
    </>
  );
}
