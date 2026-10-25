import { euros } from "@vie-fr/fr-data";
import { CarteResultat } from "@vie-fr/ui";
import { META_CARTE, type EstimationHorsZone } from "../lib/hors-zone";
import type { Saisie, SaisieValide } from "../lib/saisie";
import { adresseApproximative } from "../lib/territoire";
import type { TerritoireNonCouvert } from "../lib/types";
import { Partage } from "./Partage";

const dateFr = (iso: string) => iso.split("-").reverse().join("/");

export function HorsZone({
  estimation: e,
  nonCouvert,
  valeurs,
  saisie,
  codeInsee,
}: {
  estimation: EstimationHorsZone | null;
  nonCouvert?: TerritoireNonCouvert;
  valeurs: SaisieValide;
  saisie: Saisie;
  codeInsee: string;
}) {
  const cc = valeurs.loyer + valeurs.charges;
  return (
    <div data-imprimable="synthese">
      {nonCouvert ? (
        <section className="border-l-8 border-amber-600 bg-amber-50 p-4" aria-label="Territoire encadré non couvert">
          <h2 className="text-2xl font-bold">Votre commune applique l&apos;encadrement, mais nous n&apos;avons pas ses données</h2>
          <p className="mt-2">
            {nonCouvert.nom} : {nonCouvert.raison} Vérifiez votre plafond sur{" "}
            <a href={nonCouvert.lien_officiel} className="underline" target="_blank" rel="noreferrer">
              le site officiel
            </a>
            . En attendant, voici le niveau des loyers d&apos;annonce dans votre commune.
          </p>
        </section>
      ) : (
        <section className="border-l-8 border-gray-500 bg-gray-50 p-4" aria-label="Hors zone encadrée">
          <h2 className="text-2xl font-bold">Votre logement n&apos;est pas dans une zone d&apos;encadrement des loyers</h2>
          <p className="mt-2">
            Il n&apos;y a donc pas de plafond légal au m². Le loyer reste libre à la signature (en zone tendue, sa hausse entre
            deux locataires est toutefois limitée). Voici une estimation indicative du niveau des loyers autour de chez vous.
          </p>
        </section>
      )}

      {e ? (
        <>
          <CarteResultat
            titre={`Loyer d'annonce estimé – ${e.typologie}, ${e.commune}`}
            valeur={`${euros(e.mensuel, true)} / mois`}
            source={META_CARTE.source}
            verifieLe={dateFr(META_CARTE.verifie_le)}
          >
            <p className="text-sm">
              {euros(e.m2)} / m² charges comprises × {valeurs.surface} m². Fourchette probable : {euros(e.mensuelBas, true)} à{" "}
              {euros(e.mensuelHaut, true)}. {e.precisionCommune ? "Estimé sur la commune." : "Estimé sur un groupe de communes voisines (peu d'annonces)."}
            </p>
          </CarteResultat>
          <p className="text-lg">
            Votre loyer charges comprises : <strong>{euros(cc)}</strong>
            {valeurs.charges === 0 && " (charges non renseignées)"} —{" "}
            {cc > e.mensuelHaut
              ? "au-dessus de la fourchette habituelle des annonces."
              : cc < e.mensuelBas
                ? "en dessous de la fourchette habituelle des annonces."
                : "dans la fourchette habituelle des annonces."}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            ⚠ Estimation indicative (« Carte des loyers » {META_CARTE.millesime}) : {META_CARTE.note} Elle ne permet pas de
            contester un loyer.
          </p>
        </>
      ) : (
        <p className="mt-4">Pas d&apos;indicateur de loyer disponible pour cette commune.</p>
      )}

      <Partage
        etat={{
          v: 1,
          a: adresseApproximative(saisie.adresseTexte),
          c: codeInsee,
          vi: "",
          s: "",
          p: valeurs.pieces,
          e: valeurs.epoque,
          m: valeurs.meuble,
          mai: valeurs.maison,
          sf: valeurs.surface,
          l: valeurs.loyer,
          ch: valeurs.charges,
          co: valeurs.complement,
          d: valeurs.dateSignature,
        }}
      />
    </div>
  );
}
