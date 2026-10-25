"use client";

import { CarteResultat } from "@vie-fr/ui";
import { euros } from "@vie-fr/fr-data";
import { dateFr, lireEntree, nombreFr, pourcent } from "@/lib/affichage";
import { grilleParCode } from "@/lib/catalogue";
import type { ParamsGarde } from "@/lib/etat";
import { coutAssistanteMaternelle, coutCrechePsu, creditImpot, PARAMS_GARDE, SOURCES_GARDE, tarifAssmatDepartement } from "@/lib/garde";
import { nbEnfantsTotal, type Foyer } from "@/lib/quotient";
import { Alerte, ChampNombre, Section, Source } from "./commun";

export function SectionGarde({
  foyer,
  garde,
  communePrincipale,
  onChange,
}: {
  foyer: Foyer;
  garde: ParamsGarde;
  communePrincipale?: string;
  onChange: (g: ParamsGarde) => void;
}) {
  const maj = (p: Partial<ParamsGarde>) => onChange({ ...garde, ...p });
  const g = communePrincipale ? grilleParCode(communePrincipale) : undefined;
  const dep = g ? tarifAssmatDepartement(g.departement) : tarifAssmatDepartement("");
  const tarif = garde.tarifAssmat ?? dep.tarif;
  const besoin = {
    heuresParSemaine: garde.heuresParSemaine,
    semainesParAn: garde.semainesParAn,
    enfantsACharge: Math.max(1, nbEnfantsTotal(foyer)),
    handicap: garde.handicap || foyer.enfantsAeeh > 0,
    ressourcesAnnuelles: foyer.revenusAnnuels,
  };
  const creche = coutCrechePsu(besoin);
  const am = coutAssistanteMaternelle(besoin, tarif);
  const ciCreche = creditImpot(creche.coutAnnuel);
  const ciAm = creditImpot(am.resteAnnuel);
  const netCreche = creche.coutAnnuel - ciCreche;
  const netAm = am.resteAnnuel - ciAm;
  const ecart = Math.abs(netAm - netCreche);

  return (
    <Section
      id="creche"
      titre="4. Crèche ou assistante maternelle (moins de 6 ans)"
      intro="Les crèches conventionnées par la CAF appliquent toutes le même barème national. Pour une assistante maternelle, la CAF verse le complément de libre choix du mode de garde (CMG). Les revenus pris en compte sont ceux saisis à l'étape 1."
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        <ChampNombre label="Heures de garde par semaine" valeur={garde.heuresParSemaine} max={60} pas={0.5} onChange={(v) => maj({ heuresParSemaine: Math.min(60, lireEntree(v)) })} />
        <ChampNombre
          label="Semaines de garde par an"
          aide="52 semaines moins vos congés."
          valeur={garde.semainesParAn}
          max={52}
          onChange={(v) => maj({ semainesParAn: Math.min(52, lireEntree(v)) })}
        />
        <ChampNombre
          label="Tarif horaire de l'assistante maternelle"
          suffixe="€ net"
          aide={`Par défaut : ${euros(dep.tarif)} (${dep.nom ? `référence retenue pour ${dep.nom}` : "référence nationale"}, à vérifier). Remplacez par le tarif réel.`}
          valeur={garde.tarifAssmat ?? ""}
          pas={0.01}
          onChange={(v) => maj({ tarifAssmat: v === "" ? null : lireEntree(v) })}
        />
        <div className="mb-4 flex items-center gap-2 pt-6">
          <input id="handicap" type="checkbox" checked={besoin.handicap} onChange={(e) => maj({ handicap: e.target.checked })} className="h-5 w-5" />
          <label htmlFor="handicap">Un enfant du foyer bénéficie de l&apos;AEEH</label>
        </div>
      </div>

      <div className="grid gap-x-6 md:grid-cols-2">
        <CarteResultat titre="Crèche conventionnée CAF" valeur={`${euros(creche.coutMensuel)} / mois`} source={SOURCES_GARDE.psu.source} verifieLe={dateFr(SOURCES_GARDE.psu.verifie_le)}>
          <ul className="text-sm">
            <li>
              Ressources retenues : {euros(creche.ressourcesMensuelles)} par mois (plancher {euros(PARAMS_GARDE.plancherPsu)}, plafond{" "}
              {euros(PARAMS_GARDE.plafondPsu, true)})
            </li>
            <li>
              Taux d&apos;effort : {pourcent(creche.tauxEffort)} → <strong>{euros(creche.tarifHoraire)} de l&apos;heure</strong>
            </li>
            <li>
              {nombreFr(creche.heuresMensuelles)} h par mois → {euros(creche.coutAnnuel)} par an
            </li>
            <li>
              Crédit d&apos;impôt estimé : − {euros(ciCreche)} → <strong>{euros(netCreche)} par an</strong> après impôt
            </li>
          </ul>
        </CarteResultat>
        <CarteResultat titre="Assistante maternelle (avec CMG)" valeur={`${euros(am.resteMensuel)} / mois`} source={SOURCES_GARDE.cmg.source} verifieLe={dateFr(SOURCES_GARDE.cmg.verifie_le)}>
          <ul className="text-sm">
            <li>
              Salaire : {euros(tarif)} x {nombreFr(am.heuresMensuelles)} h = {euros(am.coutMensuel)} par mois
            </li>
            <li>CMG estimé : − {euros(am.cmgMensuel)} par mois (cotisations sociales prises en charge en plus)</li>
            <li>
              Reste à charge : {euros(am.resteAnnuel)} par an ; crédit d&apos;impôt − {euros(ciAm)} → <strong>{euros(netAm)} par an</strong>
            </li>
          </ul>
          {am.depassementPlafond && (
            <p className="mt-1 text-sm text-amber-900">
              Ce tarif dépasse le plafond de {euros(PARAMS_GARDE.plafondCmg)} de l&apos;heure : la part au-delà n&apos;est pas aidée.
            </p>
          )}
        </CarteResultat>
      </div>

      <p className="my-3 text-lg" role="status">
        {ecart < 1 ? (
          <>Les deux solutions reviennent au même prix.</>
        ) : (
          <>
            <strong>{netCreche < netAm ? "La crèche" : "L'assistante maternelle"}</strong> revient <strong>{euros(ecart, true)} moins cher par an</strong>, crédit
            d&apos;impôt compris.
          </>
        )}
      </p>

      <Alerte ton="attention">
        Paramètres du CMG 2026 (coût de référence {euros(PARAMS_GARDE.refCmg)}/h, plafond {euros(PARAMS_GARDE.plafondCmg)}/h) et tarif horaire
        départemental : à vérifier, issus de sources non officielles. Crédit d&apos;impôt : {Math.round(PARAMS_GARDE.tauxCredit * 100)} % des frais dans
        la limite de {euros(PARAMS_GARDE.plafondCredit, true)} par enfant (à vérifier). Hors indemnités d&apos;entretien et de repas, hors complément
        transitoire. Pour un montant officiel, utilisez le simulateur de l&apos;Urssaf (Pajemploi) et de monenfant.fr.
      </Alerte>
      <Source url={SOURCES_GARDE.cmg.ref} date={SOURCES_GARDE.cmg.verifie_le} libelle="Coût de référence et plafond du CMG 2026" />
      <Source url={SOURCES_GARDE.credit.source} date={SOURCES_GARDE.credit.verifie_le} libelle="Crédit d'impôt" />
    </Section>
  );
}
