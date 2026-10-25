"use client";

import { Champ, ChampSelect } from "@vie-fr/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { chargerMillesimes, chargerZones } from "../donnees/registre";
import { chargeurs as chargeursCarte } from "../donnees/carte-loyers-index";
import { analyser, REGLES } from "../lib/analyse";
import { estimerHorsZone, type CommuneCarte, type EstimationHorsZone } from "../lib/hors-zone";
import { decoderPartage } from "../lib/partage";
import { SAISIE_VIDE, validerSaisie, type Saisie, type SaisieValide } from "../lib/saisie";
import { departement, secteurDuPoint, territoireDeLaCommune, VILLES, villeParId } from "../lib/territoire";
import type { Millesime, TerritoireNonCouvert, Ville, Zones } from "../lib/types";
import { ChampAdresse } from "./ChampAdresse";
import { Donnees } from "./Donnees";
import { HorsZone } from "./HorsZone";
import { ResultatEncadre } from "./ResultatEncadre";

const CLE_STOCKAGE = "vie-fr/05-loyer/saisie";

/** Date du jour (fuseau de l'utilisateur), au format ISO. */
export function aujourdhuiIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type OptionSecteur = { secteur: string; libelle: string };

export type Contexte =
  | {
      type: "encadre";
      ville: Ville;
      millesimes: Millesime[];
      secteur: string | null;
      secteurNom?: string;
      options: OptionSecteur[];
      codeInsee: string;
    }
  | { type: "hors-zone"; estimation: EstimationHorsZone | null; nonCouvert?: TerritoireNonCouvert; codeInsee: string }
  | { type: "erreur"; message: string };

function optionsSecteurs(ville: Ville, zones: Zones | null, millesimes: Millesime[]): OptionSecteur[] {
  if (zones) {
    return zones.features
      .map((f) => ({
        secteur: f.properties.secteur,
        libelle:
          ville.id === "lyon"
            ? `${f.properties.nom ?? ""} – IRIS ${f.properties.secteur.slice(-4)}`
            : f.properties.nom
              ? `${f.properties.nom}${ville.id === "paris" ? "" : ` (zone ${f.properties.secteur})`}`
              : `Secteur ${f.properties.secteur}`,
      }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  }
  const zonesConnues = [...new Set(millesimes.flatMap((m) => m.lignes.map((l) => l.zone)))].sort();
  return zonesConnues.map((z) => ({ secteur: z, libelle: `Secteur ${z}` }));
}

async function construireContexte(s: Saisie, secteurForce?: string): Promise<Contexte> {
  const codeInsee = s.adresse?.codeInsee ?? "";
  const villeManuelle = s.villeManuelle ? villeParId(s.villeManuelle) : undefined;
  const t = villeManuelle ? { type: "encadre" as const, ville: villeManuelle } : territoireDeLaCommune(codeInsee);

  if (t.type === "encadre") {
    const [zones, millesimes] = await Promise.all([chargerZones(t.ville.id), chargerMillesimes(t.ville.id)]);
    const options = optionsSecteurs(t.ville, zones, millesimes);
    let secteur: string | null = secteurForce ?? null;
    let secteurNom: string | undefined;
    if (!secteur && zones && s.adresse && !villeManuelle) {
      const p = secteurDuPoint(zones, s.adresse.lon, s.adresse.lat);
      secteur = p?.secteur ?? null;
      secteurNom = p?.nom;
    }
    if (secteur && !secteurNom) secteurNom = options.find((o) => o.secteur === secteur)?.libelle;
    return { type: "encadre", ville: t.ville, millesimes, secteur, secteurNom, options, codeInsee };
  }

  const nonCouvert = t.type === "non-couvert" ? t.territoire : undefined;
  const v = validerSaisie(s, aujourdhuiIso());
  const chargeur = chargeursCarte[departement(codeInsee)];
  if (!chargeur || !v.ok) return { type: "hors-zone", estimation: null, nonCouvert, codeInsee };
  const communes = (await chargeur()).default as Record<string, CommuneCarte>;
  const c = communes[codeInsee];
  const estimation = c
    ? estimerHorsZone(c, { pieces: v.valeurs.pieces, maison: v.valeurs.maison, surface: v.valeurs.surface })
    : null;
  return { type: "hors-zone", estimation, nonCouvert, codeInsee };
}

export function Application() {
  const [saisie, setSaisie] = useState<Saisie>(SAISIE_VIDE);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [contexte, setContexte] = useState<Contexte | null>(null);
  const [valeurs, setValeurs] = useState<SaisieValide | null>(null);
  const [interdictions, setInterdictions] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);
  const [aujourdhui, setAujourdhui] = useState("");
  const refResultat = useRef<HTMLDivElement>(null);
  const pret = useRef(false);

  const maj = <K extends keyof Saisie>(k: K, v: Saisie[K]) => setSaisie((s) => ({ ...s, [k]: v }));

  async function calculer(s: Saisie, secteurForce?: string) {
    const jour = aujourdhuiIso();
    setAujourdhui(jour);
    const v = validerSaisie(s, jour);
    if (!v.ok) {
      setErreurs(v.erreurs);
      return;
    }
    setErreurs([]);
    setChargement(true);
    try {
      setValeurs(v.valeurs);
      setContexte(await construireContexte(s, secteurForce));
    } catch {
      setContexte({ type: "erreur", message: "Impossible de charger les données. Rechargez la page et réessayez." });
    } finally {
      setChargement(false);
      setTimeout(() => refResultat.current?.focus(), 50);
    }
  }

  // Au chargement : lien de partage (#…) en priorité, sinon brouillon local.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const partage = hash ? decoderPartage(hash) : null;
    if (partage) {
      const s: Saisie = {
        ...SAISIE_VIDE,
        adresseTexte: partage.a,
        adresse: null,
        villeManuelle: partage.vi,
        surface: String(partage.sf),
        pieces: String(Math.min(4, partage.p)),
        type: partage.mai ? "maison" : "appartement",
        epoque: partage.e,
        meuble: partage.m ? "oui" : "non",
        loyer: String(partage.l),
        charges: partage.ch ? String(partage.ch) : "",
        complement: partage.co ? String(partage.co) : "",
        dateSignature: partage.d,
      };
      if (!partage.vi) {
        // Hors zone : on ne connaît que le code commune, suffisant pour l'estimation.
        s.adresse = { label: partage.a, codeInsee: partage.c, codePostal: "", ville: "", lon: 0, lat: 0, score: 0 };
      }
      setSaisie(s);
      void calculer(s, partage.s || undefined);
    } else {
      try {
        const brut = localStorage.getItem(CLE_STOCKAGE);
        if (brut) setSaisie({ ...SAISIE_VIDE, ...(JSON.parse(brut) as Partial<Saisie>) });
      } catch {
        /* stockage indisponible : on repart d'un formulaire vide */
      }
    }
    pret.current = true;
  }, []);

  useEffect(() => {
    if (!pret.current) return;
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(saisie));
    } catch {
      /* stockage indisponible */
    }
  }, [saisie]);

  const analyse = useMemo(() => {
    if (contexte?.type !== "encadre" || !contexte.secteur || !valeurs) return null;
    return analyser({
      ville: contexte.ville,
      millesimes: contexte.millesimes,
      secteur: contexte.secteur,
      logement: {
        pieces: valeurs.pieces,
        epoque: valeurs.epoque,
        meuble: valeurs.meuble,
        maison: valeurs.maison,
        surface: valeurs.surface,
      },
      bail: { loyerHorsCharges: valeurs.loyer, complement: valeurs.complement, dateSignature: valeurs.dateSignature },
      aujourdhui,
      interdictions,
    });
  }, [contexte, valeurs, aujourdhui, interdictions]);

  return (
    <div>
      <p className="mb-4 text-lg print:hidden">
        Votre loyer respecte-t-il l&apos;encadrement des loyers ? Saisissez votre adresse et votre bail : vous saurez en
        30 secondes si vous payez trop, de combien, et quoi envoyer à votre propriétaire.
      </p>
      <p className="mb-6 border-l-4 border-green-700 bg-green-50 p-3 text-sm print:hidden">
        <strong>Confidentialité :</strong> tout est calculé dans votre navigateur. Seule l&apos;adresse tapée est envoyée
        au service public d&apos;adresses (IGN) pour la localiser ; rien d&apos;autre ne quitte votre appareil.
      </p>

      <form
        data-imprimable="non"
        className="print:hidden"
        onSubmit={(e) => {
          e.preventDefault();
          void calculer(saisie);
        }}
        noValidate
      >
        <fieldset className="mb-6 border border-gray-300 p-4">
          <legend className="px-1 text-lg font-bold">1. Le logement</legend>
          <ChampAdresse
            valeur={saisie.adresseTexte}
            choisie={saisie.adresse}
            onTexte={(t) => setSaisie((s) => ({ ...s, adresseTexte: t, adresse: s.adresse?.label === t ? s.adresse : null }))}
            onChoix={(a) => setSaisie((s) => ({ ...s, adresseTexte: a.label, adresse: a, villeManuelle: "" }))}
          />
          <ChampSelect
            label="Adresse introuvable ? Choisissez votre ville (facultatif)"
            aide="Vous choisirez ensuite votre secteur dans une liste."
            value={saisie.villeManuelle}
            onChange={(e) => maj("villeManuelle", e.target.value)}
            options={[["", "— Je passe par l'adresse —"], ...VILLES.map((v) => [v.id, v.nom] as [string, string])]}
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Champ
              label="Surface habitable (m²)"
              aide="Indiquée dans le bail (loi Boutin)."
              inputMode="decimal"
              value={saisie.surface}
              onChange={(e) => maj("surface", e.target.value)}
            />
            <ChampSelect
              label="Nombre de pièces principales"
              aide="Séjour et chambres, hors cuisine et salle d'eau."
              value={saisie.pieces}
              onChange={(e) => maj("pieces", e.target.value)}
              options={[
                ["1", "1 pièce (studio)"],
                ["2", "2 pièces"],
                ["3", "3 pièces"],
                ["4", "4 pièces et plus"],
              ]}
            />
            <ChampSelect
              label="Époque de construction de l'immeuble"
              aide="Souvent dans le bail ou le diagnostic (DPE)."
              value={saisie.epoque}
              onChange={(e) => maj("epoque", e.target.value as Saisie["epoque"])}
              options={[
                ["inconnue", "Je ne sais pas"],
                ["avant-1946", "Avant 1946"],
                ["1946-1970", "1946 à 1970"],
                ["1971-1990", "1971 à 1990"],
                ["1991-2005", "1991 à 2005"],
                ["apres-2005", "Après 2005"],
              ]}
            />
            <ChampSelect
              label="Type de location"
              value={saisie.meuble}
              onChange={(e) => maj("meuble", e.target.value as Saisie["meuble"])}
              options={[
                ["non", "Vide (non meublé)"],
                ["oui", "Meublé"],
              ]}
            />
            <ChampSelect
              label="Type de logement"
              value={saisie.type}
              onChange={(e) => maj("type", e.target.value as Saisie["type"])}
              options={[
                ["appartement", "Appartement"],
                ["maison", "Maison"],
              ]}
            />
          </div>
        </fieldset>

        <fieldset className="mb-6 border border-gray-300 p-4">
          <legend className="px-1 text-lg font-bold">2. Le bail</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Champ
              label="Loyer mensuel hors charges (€)"
              aide="Complément de loyer compris s'il y en a un."
              inputMode="decimal"
              value={saisie.loyer}
              onChange={(e) => maj("loyer", e.target.value)}
            />
            <Champ
              label="Charges mensuelles (€, facultatif)"
              aide="Provisions pour charges indiquées dans le bail."
              inputMode="decimal"
              value={saisie.charges}
              onChange={(e) => maj("charges", e.target.value)}
            />
            <Champ
              label="Date de signature du bail"
              type="date"
              value={saisie.dateSignature}
              onChange={(e) => maj("dateSignature", e.target.value)}
            />
            <Champ
              label="Dont complément de loyer (€, facultatif)"
              aide="Montant écrit à part dans le bail sous ce nom."
              inputMode="decimal"
              value={saisie.complement}
              onChange={(e) => maj("complement", e.target.value)}
            />
          </div>
        </fieldset>

        {erreurs.length > 0 && (
          <div role="alert" className="mb-4 border-l-4 border-red-700 bg-red-50 p-3">
            <p className="font-medium">Il manque des informations :</p>
            <ul className="list-disc pl-5">
              {erreurs.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="submit"
          disabled={chargement}
          className="rounded bg-blue-900 px-6 py-3 text-lg font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 disabled:opacity-60"
        >
          {chargement ? "Calcul en cours…" : "Vérifier mon loyer"}
        </button>
      </form>

      <div ref={refResultat} tabIndex={-1} aria-live="polite" className="mt-8 outline-none">
        {contexte?.type === "erreur" && (
          <p role="alert" className="border-l-4 border-red-700 bg-red-50 p-3">
            {contexte.message}
          </p>
        )}

        {contexte?.type === "encadre" && !contexte.secteur && (
          <section className="border-l-4 border-amber-600 bg-amber-50 p-4 print:hidden" aria-label="Choix du secteur">
            <h2 className="text-xl font-bold">Dans quel secteur se trouve votre logement ?</h2>
            <p className="my-2">
              {contexte.ville.geolocalisation === "manuelle"
                ? `Pour ${contexte.ville.nom}, nous n'avons pas pu récupérer la carte des secteurs. `
                : "Nous n'avons pas pu situer l'adresse dans un secteur (adresse en limite, ou choisie sans adresse). "}
              Consultez la{" "}
              <a href={contexte.ville.lien_officiel} target="_blank" rel="noreferrer" className="underline">
                carte officielle
              </a>{" "}
              puis choisissez votre secteur :
            </p>
            <ChampSelect
              label="Secteur"
              defaultValue=""
              onChange={(e) => {
                const sct = e.target.value;
                if (!sct) return;
                setContexte({
                  ...contexte,
                  secteur: sct,
                  secteurNom: contexte.options.find((o) => o.secteur === sct)?.libelle,
                });
              }}
              options={[["", "— Choisir —"], ...contexte.options.map((o) => [o.secteur, o.libelle] as [string, string])]}
            />
          </section>
        )}

        {contexte?.type === "encadre" && contexte.secteur && valeurs && !analyse && (
          <p role="alert" className="border-l-4 border-red-700 bg-red-50 p-3">
            Pas de loyer de référence pour cette combinaison dans nos données. Vérifiez sur{" "}
            <a href={contexte.ville.lien_officiel} className="underline">
              le site officiel
            </a>
            .
          </p>
        )}

        {contexte?.type === "encadre" && analyse && valeurs && (
          <ResultatEncadre
            analyse={analyse}
            saisie={saisie}
            valeurs={valeurs}
            secteurNom={contexte.secteurNom}
            codeInsee={contexte.codeInsee}
            aujourdhui={aujourdhui}
            interdictions={interdictions}
            setInterdictions={setInterdictions}
            changerSecteur={() => setContexte({ ...contexte, secteur: null })}
          />
        )}

        {contexte?.type === "hors-zone" && valeurs && (
          <HorsZone
            estimation={contexte.estimation}
            nonCouvert={contexte.nonCouvert}
            valeurs={valeurs}
            saisie={saisie}
            codeInsee={contexte.codeInsee}
          />
        )}
      </div>

      <Donnees saisie={saisie} setSaisie={setSaisie} cle={CLE_STOCKAGE} />
      <p className="mt-6 text-xs text-gray-600 print:hidden">
        Règles reformulées d&apos;après la loi du 6 juillet 1989 et la loi ELAN (art. 140) —{" "}
        <a href={REGLES.plafond.source} className="underline">
          source
        </a>
        , vérifié le {REGLES.plafond.verifie_le.split("-").reverse().join("/")}.
      </p>
    </div>
  );
}
