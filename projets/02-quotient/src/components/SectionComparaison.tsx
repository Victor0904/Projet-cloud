"use client";

import { BoutonExportPdf, ChampSelect } from "@vie-fr/ui";
import { montant, nombreFr } from "@/lib/affichage";
import { GRILLES, grilleParCode, nbPrestationsConnues } from "@/lib/catalogue";
import { comparer, libelleUnite, type ResultatCommune, type Usage } from "@/lib/cout";
import { LIBELLES_BASE, type Foyer } from "@/lib/quotient";
import { Alerte, Section, Source } from "./commun";

const OPTIONS: [string, string][] = [
  ["", "— Aucune —"],
  ...GRILLES.map((g): [string, string] => [g.code_insee, `${g.commune} (${nbPrestationsConnues(g)}/5 grilles connues)`]),
];

export function SectionComparaison({
  foyer,
  usage,
  communes,
  onCommunes,
}: {
  foyer: Foyer;
  usage: Usage;
  communes: string[];
  onCommunes: (c: string[]) => void;
}) {
  const grilles = communes.map(grilleParCode).filter((g) => g !== undefined);
  const c = comparer(grilles, foyer, usage);
  const choisir = (i: number, code: string) => {
    const suivant = [...communes];
    suivant[i] = code;
    onCommunes(suivant.filter((x, j) => x && suivant.indexOf(x) === j).slice(0, 3));
  };
  const plusieurs = c.resultats.length > 1;
  const moins = c.resultats[c.moinsChere];

  return (
    <Section
      id="comparaison"
      titre="3. Coût annuel et comparaison"
      intro="Choisissez jusqu'à trois communes. Le coût est recalculé avec votre quotient et vos besoins."
    >
      <div className="grid gap-x-4 sm:grid-cols-3 print:hidden">
        {[0, 1, 2].map((i) => (
          <ChampSelect key={i} label={`Commune ${i + 1}`} value={communes[i] ?? ""} onChange={(e) => choisir(i, e.target.value)} options={OPTIONS} />
        ))}
      </div>

      {c.resultats.length === 0 && <Alerte>Choisissez au moins une commune.</Alerte>}

      {plusieurs && moins && (
        <div className="my-4 border-l-4 border-green-700 bg-green-50 p-4" role="status">
          <p className="font-medium">Sur les prestations connues partout ({c.comparables.length ? c.comparables.map((k) => libelleCourt(k).toLowerCase()).join(", ") : "aucune"}) :</p>
          {c.comparables.length === 0 ? (
            <p>Aucune prestation n&apos;est comparable entre ces communes (grilles manquantes).</p>
          ) : (
            <ul className="mt-1">
              {c.resultats.map((r, i) =>
                i === c.moinsChere ? (
                  <li key={r.grille.code_insee}>
                    <strong>{r.grille.commune}</strong> est la moins chère : {montant(c.totauxComparables[i], true)} par an.
                  </li>
                ) : (
                  <li key={r.grille.code_insee} className="text-lg">
                    <strong>{r.grille.commune}</strong> : <strong className="text-2xl text-green-900">+{montant(c.ecarts[i], true)}</strong> par an
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}

      {c.resultats.length > 0 && (
        <div className="overflow-x-auto">
          <table className="my-4 w-full border-collapse text-sm">
            <caption className="sr-only">Coût annuel par prestation et par commune</caption>
            <thead>
              <tr className="border-b-2 border-gray-800 text-left">
                <th scope="col" className="p-2">Prestation</th>
                {c.resultats.map((r) => (
                  <th key={r.grille.code_insee} scope="col" className="p-2">
                    {r.grille.commune}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.resultats[0].lignes
                .filter((l) => l.utilisee)
                .map((l) => (
                  <tr key={l.cle} className="border-b">
                    <th scope="row" className="p-2 text-left font-normal">
                      {libelleCourt(l.cle)}
                    </th>
                    {c.resultats.map((r) => {
                      const x = r.lignes.find((y) => y.cle === l.cle)!;
                      return (
                        <td key={r.grille.code_insee} className="p-2">
                          {!x.disponible ? <span className="text-amber-800">grille inconnue</span> : x.inclusDans ? "inclus" : montant(x.annuel, true)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              <tr className="border-b-2 border-gray-800 font-bold">
                <th scope="row" className="p-2 text-left">Total par an</th>
                {c.resultats.map((r) => (
                  <td key={r.grille.code_insee} className="p-2">
                    {montant(r.annuel, true)}
                    {r.manquantes.length > 0 && <span className="block text-xs font-normal text-amber-800">incomplet</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-2 text-left font-normal">Moyenne par mois (sur 12 mois)</th>
                {c.resultats.map((r) => (
                  <td key={r.grille.code_insee} className="p-2">
                    {montant(r.mensuel, true)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {c.resultats.map((r) => (
        <DetailCommune key={r.grille.code_insee} r={r} />
      ))}

      {c.resultats.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 print:hidden">
          <BoutonExportPdf libelle="Imprimer / enregistrer en PDF" />
          <p className="text-sm text-gray-700">Estimation : elle ne remplace pas la facture ni le simulateur officiel de la commune.</p>
        </div>
      )}
    </Section>
  );
}

const COURTS: Record<string, string> = {
  cantine: "Cantine",
  garderie_matin: "Garderie du matin",
  garderie_soir: "Accueil du soir",
  alsh_journee: "Centre de loisirs (journées)",
  alsh_demi_journee: "Centre de loisirs (demi-journées)",
};
const libelleCourt = (cle: string) => COURTS[cle] ?? cle;

function DetailCommune({ r }: { r: ResultatCommune }) {
  const g = r.grille;
  const utilisees = r.lignes.filter((l) => l.utilisee);
  return (
    <details className="my-3 rounded border border-gray-300 p-3 print:border-0" open>
      <summary className="cursor-pointer font-bold">
        {g.commune} : {montant(r.annuel)} par an, soit {montant(r.mensuel)} par mois en moyenne
      </summary>
      <p className="mt-2 text-sm">
        {LIBELLES_BASE[g.base_calcul]} retenu : <strong>{nombreFr(r.valeurBase, 0)} €</strong>. {g.base_calcul_note}
      </p>
      {r.estFourchette && (
        <Alerte>Cette commune ne publie qu&apos;un tarif minimum et maximum pour certaines prestations : le résultat est une fourchette.</Alerte>
      )}
      {r.manquantes.length > 0 && (
        <Alerte ton="attention">
          Grille non trouvée pour : {r.manquantes.join(", ")}. Ces prestations ne sont pas comptées dans le total.{" "}
          <a href="#contribuer" className="underline">
            Proposer la grille
          </a>
          .
        </Alerte>
      )}
      <ul className="mt-2 space-y-2 text-sm">
        {utilisees.map((l) => (
          <li key={l.cle}>
            <strong>{l.libelle}</strong> :{" "}
            {!l.tarifUnitaire ? (
              <span className="text-amber-800">tarif inconnu{l.note ? ` (${l.note})` : ""}</span>
            ) : (
              <>
                {montant(l.tarifUnitaire)} par {libelleUnite(l.unite)} — {l.explication} → <strong>{montant(l.annuel)}</strong>
              </>
            )}
            {l.source && l.verifie_le && <Source url={l.source} date={l.verifie_le} />}
          </li>
        ))}
        {utilisees.length === 0 && <li>Aucune prestation sélectionnée dans « Vos besoins ».</li>}
      </ul>
      {(g.notes.length > 0 || g.a_verifier.length > 0) && (
        <div className="mt-3 text-sm">
          <p className="font-medium">À savoir ({g.periode}) :</p>
          <ul className="list-disc pl-5">
            {g.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            {g.a_verifier.map((n) => (
              <li key={n} className="text-amber-900">
                À vérifier : {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
