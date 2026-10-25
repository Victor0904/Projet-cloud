import { euros } from "@vie-fr/fr-data";
import type { Resultat } from "@/paie/scenario";
import { TAUX, toutesLesValeurs } from "@/paie/taux";
import { HYPOTHESES } from "@/paie/scenario";

const pc = (n: number) => `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %`;

/** Hypothèses, alertes et détail des cotisations d'un scénario. */
export function DetailScenario({ r, lettre }: { r: Resultat; lettre: string }) {
  return (
    <section className="mb-6 break-inside-avoid border-l-4 border-gray-300 pl-4" aria-labelledby={`detail-${lettre}`}>
      <h3 id={`detail-${lettre}`} className="text-lg font-bold">
        {lettre}. {r.nom} — {r.libelleStatut}
      </h3>
      {r.alertes.length > 0 && (
        <div className="my-2 border-l-4 border-orange-600 bg-orange-50 p-3" role="note">
          <p className="font-bold text-orange-900">Points d&apos;attention</p>
          <ul className="list-disc pl-5">
            {r.alertes.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 font-medium">Hypothèses retenues</p>
      <ul className="list-disc pl-5 text-sm">
        {r.hypotheses.map((h) => (
          <li key={h}>{h}</li>
        ))}
        {r.deduction && (
          <li>
            Impôt : {r.deduction.mode === "reels" ? "frais réels" : "abattement forfaitaire de 10 %"} retenu (
            {euros(r.deduction.montant, true)}).
          </li>
        )}
        <li>
          Impôt du foyer : {euros(r.impotFoyer.impot, true)} pour {r.impotFoyer.parts.toLocaleString("fr-FR")} part
          {r.impotFoyer.parts > 1 ? "s" : ""}
          {r.impotFoyer.decote > 0 ? `, après une décote de ${euros(r.impotFoyer.decote, true)}` : ""}
          {r.impotFoyer.avantagePlafonne > 0 ? ", quotient familial plafonné" : ""}
          {r.impotFoyer.cehr > 0 ? `, dont ${euros(r.impotFoyer.cehr, true)} de contribution sur les hauts revenus` : ""}.
        </li>
        {r.tauxNeutre !== null && (
          <li>
            Si vous choisissez le taux non personnalisé, l&apos;employeur appliquerait {pc(r.tauxNeutre)} (vous régularisez
            ensuite avec l&apos;administration fiscale).
          </li>
        )}
        <li>
          {Math.round(r.jours)} jours travaillés dont {Math.round(r.joursSurSite)} sur site.
        </li>
      </ul>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium text-blue-900">Détail des cotisations et charges</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th scope="col" className="p-1">
                Ligne
              </th>
              <th scope="col" className="p-1 text-right">
                Base
              </th>
              <th scope="col" className="p-1 text-right">
                Taux
              </th>
              <th scope="col" className="p-1 text-right">
                Montant annuel
              </th>
            </tr>
          </thead>
          <tbody>
            {r.lignes
              .filter((l) => l.montant !== 0)
              .map((l, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <td className="p-1">{l.libelle}</td>
                  <td className="p-1 text-right">{euros(l.base, true)}</td>
                  <td className="p-1 text-right">{l.taux === null ? "—" : pc(l.taux)}</td>
                  <td className="p-1 text-right">{euros(l.montant, true)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

/** Liste de toutes les données utilisées, avec source, date de vérification et statut. */
export function Sources() {
  const valeurs = toutesLesValeurs();
  const aVerifier = valeurs.filter((x) => x.v.statut === "A_VERIFIER");
  return (
    <details className="my-6">
      <summary className="cursor-pointer font-bold text-blue-900">
        Sources des taux et barèmes ({valeurs.length} valeurs, dont {aVerifier.length} à vérifier)
      </summary>
      <p className="mt-2 text-sm">{TAUX.meta.methode}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {valeurs.map(({ cle, v }) => (
          <li key={cle}>
            <span className={v.statut === "A_VERIFIER" ? "font-bold text-orange-900" : ""}>
              {v.statut === "A_VERIFIER" ? "À VÉRIFIER — " : ""}
              {cle}
            </span>{" "}
            : {Array.isArray(v.valeur) ? "barème" : String(v.valeur)} ({v.unite}) —{" "}
            <a href={v.source} className="underline" target="_blank" rel="noreferrer">
              source
            </a>
            , vérifié le {v.verifie_le}
          </li>
        ))}
      </ul>
      <p className="mt-4 font-medium">Hypothèses par défaut des formulaires</p>
      <ul className="mt-1 space-y-1 text-sm">
        {Object.entries(HYPOTHESES).map(([cle, v]) => (
          <li key={cle}>
            {cle} : {String(v.valeur)} ({v.unite}) —{" "}
            <a href={v.source} className="underline" target="_blank" rel="noreferrer">
              référence
            </a>
            {v.statut === "A_VERIFIER" ? " — à vérifier" : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}
