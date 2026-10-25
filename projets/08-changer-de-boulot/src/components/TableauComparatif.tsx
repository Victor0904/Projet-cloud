import { euros } from "@vie-fr/fr-data";
import type { Resultat } from "@/paie/scenario";

type LigneTableau = {
  libelle: string;
  aide?: string;
  valeur: (r: Resultat) => string;
  /** Valeur numérique pour mettre en évidence le meilleur scénario. */
  score?: (r: Resultat) => number;
  fort?: boolean;
};

const e = (n: number) => euros(n, true);
const heures = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} h`;
const pc = (n: number) => `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

const LIGNES: LigneTableau[] = [
  { libelle: "Statut", valeur: (r) => r.libelleStatut },
  {
    libelle: "Rémunération de départ",
    valeur: (r) => (r.chiffreAffaires !== null ? `${e(r.chiffreAffaires)} de CA HT/an` : `${e(r.brutAnnuel ?? 0)} brut/an`),
  },
  {
    libelle: "Cotisations et charges",
    aide: "Cotisations sociales ; pour une société, impôt sur les sociétés et prélèvements sur dividendes ; pour le portage, part patronale et frais de gestion.",
    valeur: (r) => `${e(r.cotisations)}/an`,
  },
  {
    libelle: "Net mensuel avant impôt",
    aide: "Moyenne sur 12 mois, primes et participation comprises.",
    valeur: (r) =>
      r.netMensuelHorsTreizieme !== null
        ? `${e(r.netMensuel)} (fiche de paie : ${e(r.netMensuelHorsTreizieme)} × 13)`
        : e(r.netMensuel),
    score: (r) => r.netMensuel,
  },
  {
    libelle: "Impôt (part de ce revenu)",
    aide: "Impôt sur le revenu au prorata, versement libératoire et prélèvement forfaitaire sur dividendes.",
    valeur: (r) => `${e(r.impotTotal)}/an`,
  },
  {
    libelle: "Taux de prélèvement à la source estimé",
    valeur: (r) => `${pc(r.tauxPAS)} (≈ ${e(r.prelevementMensuel)}/mois)`,
  },
  {
    libelle: "Net mensuel après impôt",
    valeur: (r) => e(r.netApresImpotMensuel),
    score: (r) => r.netApresImpotMensuel,
    fort: true,
  },
  { libelle: "Avantages (titres-restaurant, remboursements)", valeur: (r) => `+ ${e(r.totalAvantages / 12)}/mois` },
  { libelle: "Frais pro (transport, mutuelle, matériel)", valeur: (r) => `− ${e(r.totalFrais / 12)}/mois` },
  {
    libelle: "Reste après frais pro",
    valeur: (r) => `${e(r.resteMensuel)}/mois`,
    score: (r) => r.resteMensuel,
    fort: true,
  },
  {
    libelle: "Temps de travail + trajet",
    valeur: (r) => `${heures(r.heuresTravail)} + ${heures(r.heuresTrajet)} /an`,
  },
  {
    libelle: "Salaire horaire réel",
    aide: "Net après impôt ÷ (heures travaillées + heures de trajet).",
    valeur: (r) => `${euros(r.horaireReel)}/h`,
    score: (r) => r.horaireReel,
    fort: true,
  },
  {
    libelle: "Reste horaire après frais",
    valeur: (r) => `${euros(r.horaireReste)}/h`,
    score: (r) => r.horaireReste,
  },
];

export function TableauComparatif({ resultats }: { resultats: Resultat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="sr-only">Comparaison des scénarios</caption>
        <thead>
          <tr className="border-b-2 border-blue-900 text-left">
            <th scope="col" className="p-2">
              Indicateur
            </th>
            {resultats.map((r, i) => (
              <th key={i} scope="col" className="p-2">
                {String.fromCharCode(65 + i)}. {r.nom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIGNES.map((l) => {
            const scores = l.score ? resultats.map(l.score) : [];
            const meilleur = scores.length > 1 ? Math.max(...scores) : null;
            return (
              <tr key={l.libelle} className={`border-b border-gray-200 ${l.fort ? "bg-blue-50" : ""}`}>
                <th scope="row" className="p-2 text-left align-top font-medium">
                  {l.libelle}
                  {l.aide && <span className="block text-xs font-normal text-gray-600">{l.aide}</span>}
                </th>
                {resultats.map((r, i) => {
                  const estMeilleur = meilleur !== null && scores[i] === meilleur;
                  return (
                    <td key={i} className={`p-2 align-top ${l.fort ? "font-bold" : ""} ${estMeilleur ? "text-green-800" : ""}`}>
                      {l.valeur(r)}
                      {estMeilleur && <span className="sr-only"> (le plus élevé)</span>}
                      {estMeilleur && <span aria-hidden="true"> ▲</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-gray-600">▲ = scénario le plus favorable sur la ligne.</p>
    </div>
  );
}
