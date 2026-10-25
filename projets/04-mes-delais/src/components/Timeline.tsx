import { occurrencesSurPeriode, urgence } from "@/lib/calcul";
import { ajouterMois, libelleMois, versDate } from "@/lib/dates";
import type { Ligne } from "@/lib/vue";

const PASTILLE = {
  depasse: "bg-red-700",
  moins30: "bg-orange-500",
  moins90: "bg-yellow-500",
  plus_tard: "bg-blue-900",
  aucune: "bg-gray-400",
};

/** Frise des 12 prochains mois : chaque mois liste ses échéances (prochaines et suivantes). */
export function Timeline({ lignes, auj }: { lignes: Ligne[]; auj: string }) {
  const debut = `${auj.slice(0, 7)}-01`;
  const mois = Array.from({ length: 12 }, (_, i) => ajouterMois(debut, i));
  const items = lignes.flatMap((l) =>
    occurrencesSurPeriode(l.res, auj, 12).map((date, i) => ({
      l,
      date,
      principale: i === 0 && date === l.res.date,
      u: i === 0 ? l.urgence : urgence({ ...l.res, statut: "a_venir", date }, auj),
    })),
  );

  return (
    <ol className="relative ml-2 border-l-2 border-blue-900" aria-label="Échéances des 12 prochains mois">
      {mois.map((m) => {
        const duMois = items
          .filter((x) => x.date.slice(0, 7) === m.slice(0, 7))
          .sort((a, b) => a.date.localeCompare(b.date));
        return (
          <li key={m} className="mb-3 ml-4">
            <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-900" aria-hidden />
            <h3 className="font-bold capitalize">{libelleMois(m)}</h3>
            {duMois.length === 0 ? (
              <p className="text-sm text-gray-600">Rien de prévu.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {duMois.map(({ l, date, principale, u }) => (
                  <li key={`${l.echeance.id}-${date}`} className="flex items-start gap-2 text-sm">
                    <span className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${PASTILLE[u]}`} aria-hidden />
                    <span>
                      <span className="font-medium tabular-nums">{versDate(date).getUTCDate()}</span> —{" "}
                      {l.res.statut === "en_retard" && principale ? <strong className="text-red-800">En retard : </strong> : null}
                      {l.titre}
                      {l.membre ? <span className="text-gray-700"> ({l.membre.nom})</span> : null}
                      {!principale && <span className="text-gray-600"> — estimation si la précédente est faite à temps</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
