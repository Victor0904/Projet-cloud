"use client";

import { CarteResultat, ChampSelect } from "@vie-fr/ui";
import { dateFr, lireEntree, nombreFr } from "@/lib/affichage";
import { partsCaf, quotientCaf, SOURCE_QF, type Foyer } from "@/lib/quotient";
import { ChampNombre, Section } from "./commun";

export function SectionFoyer({ foyer, onChange }: { foyer: Foyer; onChange: (f: Foyer) => void }) {
  const maj = (p: Partial<Foyer>) => onChange({ ...foyer, ...p });
  const { total, detail } = partsCaf(foyer);
  const qf = quotientCaf(foyer);
  const calcule = foyer.qfConnu === undefined;

  return (
    <Section
      id="foyer"
      titre="1. Votre foyer et votre quotient familial"
      intro="La plupart des communes fixent leurs tarifs selon votre quotient familial (QF). Si vous connaissez le vôtre (il figure sur votre espace CAF), saisissez-le ; sinon, il est calculé à partir de vos revenus."
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        <ChampSelect
          label="Situation"
          value={foyer.situation}
          onChange={(e) => maj({ situation: e.target.value as Foyer["situation"] })}
          options={[
            ["couple", "En couple"],
            ["seul", "Parent seul"],
          ]}
        />
        <ChampNombre label="Enfants à charge vivant avec vous" valeur={foyer.enfants} max={12} onChange={(v) => maj({ enfants: Math.floor(lireEntree(v)) })} />
        <ChampNombre
          label="Enfants en résidence alternée"
          aide="En plus des précédents."
          valeur={foyer.enfantsAlternes}
          max={12}
          onChange={(v) => maj({ enfantsAlternes: Math.floor(lireEntree(v)) })}
        />
        <ChampNombre
          label="Dont enfants bénéficiaires de l'AEEH"
          aide="Allocation d'éducation de l'enfant handicapé."
          valeur={foyer.enfantsAeeh}
          max={12}
          onChange={(v) => maj({ enfantsAeeh: Math.floor(lireEntree(v)) })}
        />
        <ChampNombre
          label="Revenus annuels du foyer"
          suffixe="€"
          aide="Revenus imposables avant abattement (salaires, chômage, pensions…), tels que déclarés il y a deux ans."
          valeur={foyer.revenusAnnuels}
          pas={100}
          onChange={(v) => maj({ revenusAnnuels: lireEntree(v) })}
        />
        <ChampNombre
          label="Prestations familiales par mois"
          suffixe="€"
          aide="Allocations familiales, aide au logement, AAH, RSA… versées chaque mois."
          valeur={foyer.prestationsMensuelles}
          pas={10}
          onChange={(v) => maj({ prestationsMensuelles: lireEntree(v) })}
        />
        <ChampNombre
          label="Revenu fiscal de référence (facultatif)"
          suffixe="€"
          aide="Sur votre avis d'imposition. Utilisé par les villes qui calculent elles-mêmes votre quotient (Bordeaux, Lyon, Strasbourg, Toulouse). À défaut, on reprend vos revenus annuels."
          valeur={foyer.revenuFiscalReference ?? ""}
          pas={100}
          onChange={(v) => maj({ revenuFiscalReference: v === "" ? undefined : lireEntree(v) })}
        />
        <ChampNombre
          label="Votre QF CAF, si vous le connaissez (facultatif)"
          suffixe="€"
          aide="Il remplace alors le calcul ci-dessous."
          valeur={foyer.qfConnu ?? ""}
          onChange={(v) => maj({ qfConnu: v === "" ? undefined : lireEntree(v) })}
        />
      </div>

      <CarteResultat titre="Votre quotient familial CAF" valeur={`${nombreFr(qf, 0)} €`} source={SOURCE_QF.source} verifieLe={dateFr(SOURCE_QF.verifie_le)}>
        {calcule ? (
          <>
            <p>
              ({nombreFr(foyer.revenusAnnuels, 0)} € / 12 + {nombreFr(foyer.prestationsMensuelles, 0)} €) / {nombreFr(total)} parts ={" "}
              <strong>{nombreFr(qf, 0)} €</strong>
            </p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {detail.map((d) => (
                <li key={d.libelle}>
                  {d.libelle} : {nombreFr(d.parts)} part{d.parts > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
            {foyer.enfantsAlternes > 0 && (
              <p className="mt-1 text-sm">
                Résidence alternée : la CAF peut compter l&apos;enfant chez chacun des deux parents. C&apos;est l&apos;hypothèse retenue ;
                vérifiez sur votre attestation CAF.
              </p>
            )}
          </>
        ) : (
          <p>Valeur saisie (attestation CAF).</p>
        )}
      </CarteResultat>
    </Section>
  );
}
