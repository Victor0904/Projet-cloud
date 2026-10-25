"use client";

import { euros } from "@vie-fr/fr-data";
import { CarteResultat } from "@vie-fr/ui";
import type { Analyse } from "../lib/analyse";
import { REGLES } from "../lib/analyse";
import { LIBELLES_EPOQUE } from "../lib/reference";
import type { Saisie, SaisieValide } from "../lib/saisie";
import { adresseApproximative } from "../lib/territoire";
import { LettreMiseEnDemeure } from "./LettreMiseEnDemeure";
import { Partage } from "./Partage";
import { Suite } from "./Suite";

const dateFr = (iso: string) => iso.split("-").reverse().join("/");

export function ResultatEncadre({
  analyse: a,
  saisie,
  valeurs,
  secteurNom,
  codeInsee,
  aujourdhui,
  interdictions,
  setInterdictions,
  changerSecteur,
}: {
  analyse: Analyse;
  saisie: Saisie;
  valeurs: SaisieValide;
  secteurNom?: string;
  codeInsee: string;
  aujourdhui: string;
  interdictions: string[];
  setInterdictions: (i: string[]) => void;
  changerSecteur: () => void;
}) {
  const v = a.verdict;
  const m = a.millesime;
  const verifie = dateFr(m.verifie_le);
  const r = a.reference;
  const categorie = `${r.pieces === 4 ? "4 pièces et plus" : `${r.pieces} pièce${r.pieces > 1 ? "s" : ""}`}, ${
    r.meuble ? "meublé" : "non meublé"
  }, construit ${LIBELLES_EPOQUE[r.epoque]}${r.maison === undefined ? "" : r.maison ? ", maison" : ", appartement"}`;

  return (
    <div data-imprimable="synthese">
      <section
        aria-label="Verdict"
        className={`border-l-8 p-4 ${a.action ? "border-red-700 bg-red-50" : "border-green-700 bg-green-50"}`}
      >
        <p className="text-sm font-bold uppercase tracking-wide">{a.ville.nom} — zone encadrée</p>
        {a.action ? (
          <>
            <h2 className="text-2xl font-bold text-red-900">
              {v.depassementMensuel > 0 ? "Votre loyer dépasse le plafond légal" : "Votre complément de loyer semble contestable"}
            </h2>
            <p className="mt-2 text-lg">
              Vous payez <strong>{euros(a.contestableMensuel)} de trop par mois</strong>, soit{" "}
              <strong>{euros(a.contestableMensuel * 12)} par an</strong>.
            </p>
            {a.tropPercu.montant > 0 && (
              <p className="mt-1">
                Depuis le {dateFr(a.tropPercu.depuis)}, cela représente environ{" "}
                <strong>{euros(a.tropPercu.montant)}</strong> ({a.tropPercu.mois} mois)
                {a.tropPercu.limiteParPrescription ? ", dans la limite des 3 ans récupérables" : ""}.
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-green-900">Votre loyer respecte le plafond</h2>
            <p className="mt-2 text-lg">
              Marge sous le plafond : <strong>{euros(v.plafond - v.loyerBase)} par mois</strong>.
            </p>
          </>
        )}
        <p className="mt-2 text-sm">
          Secteur : {secteurNom ?? a.secteur} (zone {a.zone}) —{" "}
          <button type="button" onClick={changerSecteur} className="underline print:hidden">
            ce n&apos;est pas le bon secteur ?
          </button>
        </p>
      </section>

      {a.avertissements.length > 0 && (
        <ul className="mt-4 space-y-1 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm">
          {a.avertissements.map((x) => (
            <li key={x}>⚠ {x}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CarteResultat titre="Plafond légal (loyer de référence majoré)" valeur={`${euros(v.plafond)} / mois`} source={m.source} verifieLe={verifie}>
          <p className="text-sm">
            {euros(r.majore)} / m² × {v.surface} m², hors charges. Catégorie : {categorie}.
          </p>
        </CarteResultat>
        <CarteResultat titre="Votre loyer de base" valeur={`${euros(v.loyerBase)} / mois`} source={m.source} verifieLe={verifie}>
          <p className="text-sm">
            soit {euros(v.loyerBaseM2)} / m²{v.complement > 0 ? `, hors complément de ${euros(v.complement)}` : ""}.
          </p>
        </CarteResultat>
        <CarteResultat titre="Loyer de référence (médian)" valeur={`${euros(v.loyerReference)} / mois`} source={m.source} verifieLe={verifie}>
          <p className="text-sm">{euros(r.ref)} / m². Le plafond est ce montant + 20 %.</p>
        </CarteResultat>
        <CarteResultat titre="Écart avec le plafond" valeur={`${v.depassementMensuel > 0 ? "+" : ""}${euros(v.loyerBase - v.plafond)} / mois`} source={m.source} verifieLe={verifie}>
          <p className="text-sm">
            {v.depassementMensuel > 0 ? `${euros(v.depassementAnnuel)} de dépassement par an.` : "Pas de dépassement du loyer de base."}
          </p>
        </CarteResultat>
      </div>
      <p className="text-sm text-gray-700">
        Arrêté utilisé : {m.arrete} (du {dateFr(m.debut)} au {dateFr(m.fin)}).
        {m.statut === "A_VERIFIER" && <strong> Données à vérifier sur le site officiel.</strong>}{" "}
        <a href={a.ville.lien_officiel} target="_blank" rel="noreferrer" className="underline print:hidden">
          Vérifier sur le site officiel
        </a>
        .
      </p>
      {v.sousMinore && (
        <p className="mt-2 text-sm">
          Votre loyer est sous le loyer de référence minoré ({euros(v.plancher)}) : au renouvellement du bail, le bailleur peut
          proposer une hausse, selon une procédure stricte.
        </p>
      )}

      <section aria-labelledby="titre-complement" className="mt-8">
        <h2 id="titre-complement" className="text-xl font-bold">
          Le complément de loyer, c&apos;est quoi ?
        </h2>
        <p className="mt-2">{REGLES.complement.texte}</p>
        {v.complement > 0 ? (
          <fieldset className="mt-4 border border-gray-300 p-4 print:hidden">
            <legend className="px-1 font-medium">
              Votre bail prévoit un complément de {euros(v.complement)}. Le logement présente-t-il l&apos;un de ces défauts ?
            </legend>
            {REGLES.complement.interdit_si.map((c) => (
              <label key={c} className="mt-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={interdictions.includes(c)}
                  onChange={(e) => setInterdictions(e.target.checked ? [...interdictions, c] : interdictions.filter((x) => x !== c))}
                />
                <span>{c.charAt(0).toUpperCase() + c.slice(1)}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="mt-2 text-sm text-gray-700">
            Il est interdit notamment si {REGLES.complement.interdit_si.slice(0, 3).join(", ")}.
          </p>
        )}
        {a.complement.present && (
          <div className={`mt-4 border-l-4 p-3 ${a.complement.contestable ? "border-red-700 bg-red-50" : "border-gray-400 bg-gray-50"}`}>
            {a.complement.contestable ? (
              <>
                <p className="font-medium">Ce complément de loyer semble contestable :</p>
                <ul className="list-disc pl-5">
                  {a.complement.raisons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                Rien n&apos;indique que ce complément soit illégal d&apos;après vos réponses. Il doit toutefois être justifié par des
                caractéristiques vraiment exceptionnelles : vous pouvez le contester si ce n&apos;est pas le cas.
              </p>
            )}
            <p className="mt-2 text-sm">
              {REGLES.complement.delai_contestation_texte}{" "}
              {a.complement.delaiDepasse ? (
                <strong>Pour votre bail, ce délai s&apos;est terminé le {dateFr(a.complement.dateLimite)}.</strong>
              ) : (
                <strong>Pour votre bail : jusqu&apos;au {dateFr(a.complement.dateLimite)}.</strong>
              )}
            </p>
          </div>
        )}
      </section>

      {a.action && (
        <>
          <Suite analyse={a} />
          <LettreMiseEnDemeure analyse={a} saisie={saisie} aujourdhui={aujourdhui} />
        </>
      )}

      <Partage
        etat={{
          v: 1,
          a: adresseApproximative(saisie.adresseTexte),
          c: codeInsee,
          vi: a.ville.id,
          s: a.secteur,
          p: valeurs.pieces,
          e: valeurs.epoque,
          m: valeurs.meuble,
          mai: valeurs.maison,
          sf: valeurs.surface,
          l: valeurs.loyer,
          ch: valeurs.charges,
          co: valeurs.complement,
          d: valeurs.dateSignature,
          r: { plafond: v.plafond, depassement: a.contestableMensuel },
        }}
      />
    </div>
  );
}
