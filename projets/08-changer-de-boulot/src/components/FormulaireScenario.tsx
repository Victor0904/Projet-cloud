"use client";

import { Champ, ChampSelect } from "@vie-fr/ui";
import { TAUX } from "@/paie/taux";
import { HYPOTHESES, LIBELLES_STATUT, estSalarie, type Scenario, type TypeStatut } from "@/paie/scenario";
import type { ModeTransport } from "@/paie/frais";
import { CaseACocher, ChampNombre, Rubrique } from "./champs";

const OPTIONS_STATUT = Object.entries(LIBELLES_STATUT) as [TypeStatut, string][];

export function FormulaireScenario({ s, onChange }: { s: Scenario; onChange: (patch: Partial<Scenario>) => void }) {
  const salarie = estSalarie(s.statut);
  const micro = s.statut === "micro_bnc" || s.statut === "micro_bic";
  const tr = s.transport;
  const majTransport = (p: Partial<Scenario["transport"]>) => onChange({ transport: { ...tr, ...p } });
  const tickets = s.ticketsResto;
  const majTickets = (p: Partial<Scenario["ticketsResto"]>) => onChange({ ticketsResto: { ...tickets, ...p } });
  const a = TAUX.avantages;
  const plafondTR = a.titre_restaurant_exoneration_max.valeur;
  const pc = (x: number) => `${Math.round(x * 100)} %`;
  const minMutuelle = `${pc(a.mutuelle_part_employeur_min.valeur)} minimum légal.`;
  const minTransport = `${pc(a.transport_prise_en_charge_obligatoire.valeur)} minimum légal.`;

  return (
    <div>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Champ label="Nom du scénario" value={s.nom} maxLength={60} onChange={(e) => onChange({ nom: e.target.value })} />
        <ChampSelect
          label="Statut"
          options={OPTIONS_STATUT}
          value={s.statut}
          onChange={(e) => onChange({ statut: e.target.value as TypeStatut })}
        />
      </div>

      {salarie && (
        <Rubrique titre="Rémunération" ouvert>
          <ChampNombre
            label="Salaire brut annuel fixe"
            suffixe="€"
            aide="Le chiffre de l'offre, 13e mois compris s'il y en a un."
            valeur={s.brutAnnuel}
            onChange={(n) => onChange({ brutAnnuel: n })}
          />
          <CaseACocher
            label="Versé sur 13 mois"
            aide="Ne change pas le total annuel, seulement le montant de chaque fiche de paie."
            coche={s.surTreizeMois}
            onChange={(b) => onChange({ surTreizeMois: b })}
          />
          <ChampNombre
            label="Variable / primes brutes attendues"
            suffixe="€/an"
            valeur={s.variableAnnuel}
            onChange={(n) => onChange({ variableAnnuel: n })}
          />
          <ChampNombre
            label="Participation et intéressement"
            suffixe="€/an"
            valeur={s.participationAnnuelle}
            onChange={(n) => onChange({ participationAnnuelle: n })}
          />
          {s.participationAnnuelle > 0 && (
            <CaseACocher
              label="Placés sur le plan d'épargne salariale"
              aide="Exonérés d'impôt, mais bloqués plusieurs années (sauf cas de déblocage anticipé)."
              coche={s.participationPEE}
              onChange={(b) => onChange({ participationPEE: b })}
            />
          )}
          <ChampNombre
            label="Mutuelle d'entreprise (cotisation totale)"
            suffixe="€/mois"
            valeur={s.mutuelleMensuelle}
            onChange={(n) => onChange({ mutuelleMensuelle: n })}
          />
          <ChampNombre
            label="Part payée par l'employeur"
            suffixe="%"
            pourcent
            pas={0.1}
            max={100}
            aide={minMutuelle}
            valeur={s.mutuellePartEmployeur}
            onChange={(n) => onChange({ mutuellePartEmployeur: n })}
          />
        </Rubrique>
      )}

      {!salarie && (
        <Rubrique titre="Activité" ouvert>
          <ChampNombre label="Taux journalier (TJM)" suffixe="€ HT" valeur={s.tjm} onChange={(n) => onChange({ tjm: n })} />
          <ChampNombre
            label="Jours facturés par an"
            valeur={s.joursFactures}
            max={366}
            onChange={(n) => onChange({ joursFactures: n })}
          />
          <ChampNombre
            label="Jours travaillés non facturés"
            aide="Prospection, administratif, formation, intercontrats."
            valeur={s.joursNonFactures}
            max={366}
            onChange={(n) => onChange({ joursNonFactures: n })}
          />
          <ChampNombre
            label={s.statut === "portage" ? "Frais professionnels remboursés" : "Frais d'activité"}
            suffixe="€/an"
            aide={
              s.statut === "portage"
                ? "Remboursés sur votre chiffre d'affaires, sans cotisations."
                : s.statut === "societe"
                  ? "Payés par la société (comptable, banque, assurance, logiciels)."
                  : "Matériel, logiciels, assurance, banque : non déductibles en micro."
            }
            valeur={s.fraisActiviteAnnuels}
            onChange={(n) => onChange({ fraisActiviteAnnuels: n })}
          />
          {s.statut !== "portage" && (
            <ChampNombre
              label="Mutuelle individuelle"
              suffixe="€/mois"
              valeur={s.mutuelleIndividuelleMensuelle}
              onChange={(n) => onChange({ mutuelleIndividuelleMensuelle: n })}
            />
          )}
          {micro && (
            <>
              <CaseACocher
                label="ACRE (première année)"
                aide="Réduction de cotisations, sous conditions."
                coche={s.acre}
                onChange={(b) => onChange({ acre: b })}
              />
              <CaseACocher
                label="Versement libératoire de l'impôt"
                aide="Impôt payé avec les cotisations, en % du chiffre d'affaires."
                coche={s.versementLiberatoire}
                onChange={(b) => onChange({ versementLiberatoire: b })}
              />
              <CaseACocher
                label="Mes clients sont des particuliers"
                aide="Si la TVA s'applique, elle est alors prise sur votre prix."
                coche={s.clientsParticuliers}
                onChange={(b) => onChange({ clientsParticuliers: b })}
              />
            </>
          )}
          {s.statut === "portage" && (
            <>
              <ChampNombre
                label="Frais de gestion de la société de portage"
                suffixe="%"
                pourcent
                pas={0.1}
                max={30}
                valeur={s.fraisGestionPortage}
                onChange={(n) => onChange({ fraisGestionPortage: n })}
              />
              <ChampNombre
                label="Mutuelle (cotisation totale)"
                suffixe="€/mois"
                valeur={s.mutuelleMensuelle}
                onChange={(n) => onChange({ mutuelleMensuelle: n })}
              />
            </>
          )}
          {s.statut === "societe" && (
            <>
              <ChampSelect
                label="Forme"
                options={[
                  ["sasu", "SASU (président assimilé salarié)"],
                  ["eurl", "EURL (gérant non salarié, approximation)"],
                ]}
                value={s.formeSociete}
                onChange={(e) => onChange({ formeSociete: e.target.value as Scenario["formeSociete"] })}
              />
              <CaseACocher
                label="Arbitrage rémunération / dividendes automatique"
                aide="Cherche la répartition qui laisse le plus après impôt."
                coche={s.arbitrageAuto}
                onChange={(b) => onChange({ arbitrageAuto: b })}
              />
              {!s.arbitrageAuto && (
                <ChampNombre
                  label="Part du disponible versée en rémunération"
                  suffixe="%"
                  pourcent
                  pas={1}
                  max={100}
                  valeur={s.partRemuneration}
                  onChange={(n) => onChange({ partRemuneration: n })}
                />
              )}
              <ChampNombre
                label="Part du bénéfice distribuée en dividendes"
                suffixe="%"
                pourcent
                pas={1}
                max={100}
                valeur={s.partDistribuee}
                onChange={(n) => onChange({ partDistribuee: n })}
              />
              {s.formeSociete === "eurl" && (
                <ChampNombre
                  label="Capital social"
                  suffixe="€"
                  valeur={s.capitalSocial}
                  onChange={(n) => onChange({ capitalSocial: n })}
                />
              )}
            </>
          )}
        </Rubrique>
      )}

      <Rubrique titre="Trajets et télétravail">
        {salarie && (
          <ChampNombre
            label="Jours travaillés par an"
            aide={`${HYPOTHESES.jours_travailles_salarie.valeur} pour un cadre au forfait jours (maximum légal).`}
            valeur={s.joursTravailles}
            max={366}
            onChange={(n) => onChange({ joursTravailles: n })}
          />
        )}
        <ChampNombre
          label="Heures travaillées par jour"
          pas={0.1}
          max={24}
          valeur={s.heuresParJour}
          onChange={(n) => onChange({ heuresParJour: n })}
        />
        <ChampNombre
          label="Jours de télétravail par semaine"
          pas={0.5}
          max={5}
          valeur={s.teletravailJoursSemaine}
          onChange={(n) => onChange({ teletravailJoursSemaine: n })}
        />
        <ChampNombre
          label="Temps de trajet aller-retour"
          suffixe="minutes par jour sur site"
          valeur={s.trajetMinutesAllerRetour}
          max={600}
          onChange={(n) => onChange({ trajetMinutesAllerRetour: n })}
        />
        <ChampSelect
          label="Moyen de transport"
          options={[
            ["aucun", "Aucun coût (à pied, télétravail complet)"],
            ["transports", "Transports en commun"],
            ["voiture", "Voiture"],
            ["velo", "Vélo"],
          ]}
          value={tr.mode}
          onChange={(e) => majTransport({ mode: e.target.value as ModeTransport })}
        />
        {tr.mode === "transports" && (
          <>
            <ChampNombre
              label="Abonnement"
              suffixe="€/mois"
              pas={0.01}
              valeur={tr.abonnementMensuel}
              onChange={(n) => majTransport({ abonnementMensuel: n })}
            />
            {salarie && (
              <ChampNombre
                label="Part remboursée par l'employeur"
                suffixe="%"
                pourcent
                pas={1}
                max={100}
                aide={minTransport}
                valeur={s.partEmployeurTransport}
                onChange={(n) => onChange({ partEmployeurTransport: n })}
              />
            )}
          </>
        )}
        {tr.mode === "voiture" && (
          <>
            <ChampNombre
              label="Distance domicile-travail (aller)"
              suffixe="km"
              pas={0.1}
              valeur={tr.kmAller}
              onChange={(n) => majTransport({ kmAller: n })}
            />
            <ChampNombre
              label="Puissance fiscale"
              suffixe="CV"
              min={3}
              max={20}
              valeur={tr.chevauxFiscaux}
              onChange={(n) => majTransport({ chevauxFiscaux: n })}
            />
            <CaseACocher label="Voiture électrique" coche={tr.electrique} onChange={(b) => majTransport({ electrique: b })} />
            {salarie && (
              <ChampNombre
                label="Prime de transport / forfait mobilités versé"
                suffixe="€/an"
                valeur={s.primeTransportAnnuelle}
                onChange={(n) => onChange({ primeTransportAnnuelle: n })}
              />
            )}
          </>
        )}
      </Rubrique>

      {salarie && (
        <Rubrique titre="Avantages et frais professionnels">
          <CaseACocher
            label="Titres-restaurant"
            coche={tickets.actif}
            onChange={(b) => majTickets({ actif: b })}
          />
          {tickets.actif && (
            <>
              <ChampNombre
                label="Valeur d'un titre"
                suffixe="€"
                pas={0.01}
                valeur={tickets.valeurFaciale}
                onChange={(n) => majTickets({ valeurFaciale: n })}
              />
              <ChampNombre
                label="Part employeur"
                suffixe="%"
                pourcent
                pas={1}
                max={100}
                aide={`Entre ${pc(a.titre_restaurant_part_employeur_min.valeur)} et ${pc(a.titre_restaurant_part_employeur_max.valeur)}, et ${plafondTR.toLocaleString("fr-FR")} € maximum par titre pour être exonérée.`}
                valeur={tickets.partEmployeur}
                onChange={(n) => majTickets({ partEmployeur: n })}
              />
              <ChampNombre
                label="Titres par mois"
                max={31}
                valeur={tickets.nombreParMois}
                onChange={(n) => majTickets({ nombreParMois: n })}
              />
            </>
          )}
          <ChampNombre
            label="Indemnité de télétravail"
            suffixe="€/mois"
            pas={0.01}
            valeur={s.indemniteTeletravailMensuelle}
            onChange={(n) => onChange({ indemniteTeletravailMensuelle: n })}
          />
          <ChampNombre
            label="Autres frais pro non remboursés"
            suffixe="€/an"
            valeur={s.autresFraisAnnuels}
            onChange={(n) => onChange({ autresFraisAnnuels: n })}
          />
          <ChampSelect
            label="Déduction des frais pour l'impôt"
            options={[
              ["auto", "La plus favorable (automatique)"],
              ["forfait", "Abattement forfaitaire de 10 %"],
              ["reels", "Frais réels"],
            ]}
            value={s.deduction}
            onChange={(e) => onChange({ deduction: e.target.value as Scenario["deduction"] })}
          />
        </Rubrique>
      )}
    </div>
  );
}
