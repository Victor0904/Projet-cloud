import { attendu, LIBELLE_VERDICT, signe, verdictVa, type IndicateurPrincipal, type Verdict } from "@/lib/interpretation";

const STYLE_VERDICT: Record<Verdict, string> = {
  mieux: "bg-green-100 text-green-900 border-green-800",
  conforme: "bg-gray-100 text-gray-900 border-gray-600",
  moins_bien: "bg-orange-100 text-orange-950 border-orange-800",
  inconnu: "bg-white text-gray-700 border-gray-400 border-dashed",
};

const COURT: Record<Verdict, string> = {
  mieux: "Mieux qu'attendu",
  conforme: "Conforme à l'attendu",
  moins_bien: "Moins bien qu'attendu",
  inconnu: "Valeur ajoutée non publiée",
};

export function BadgeVerdict({ va, seuil }: { va: number | null; seuil: number }) {
  const v = verdictVa(va, seuil);
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${STYLE_VERDICT[v]}`} title={LIBELLE_VERDICT[v]}>
      {COURT[v]}
    </span>
  );
}

const fmt = (n: number | null, unite: string) =>
  n === null ? "—" : `${(Math.round(n * 10) / 10).toString().replace(".", ",")}${unite === " %" ? " %" : unite}`;

/**
 * Un taux n'est jamais affiché seul : il est toujours accompagné du taux attendu et de la valeur ajoutée
 * (règle du cahier des charges : pas de classement brut).
 */
export function IndicateurVa({ ind, compact = false }: { ind: IndicateurPrincipal; compact?: boolean }) {
  const att = attendu(ind.taux, ind.va);
  if (compact) {
    return (
      <span>
        {fmt(ind.taux, ind.unite)}{" "}
        <span className="text-gray-700">
          (VA {ind.va === null ? "non publiée" : signe(ind.va, ind.unite === " %" ? " pt" : "")})
        </span>{" "}
        <BadgeVerdict va={ind.va} seuil={ind.seuil} />
      </span>
    );
  }
  return (
    <div className="rounded border p-3 break-inside-avoid">
      <p className="text-sm font-medium">
        {ind.libelle} <span className="font-normal text-gray-600">— session {ind.session}</span>
      </p>
      <dl className="mt-1 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-gray-600">Réel</dt>
          <dd className="text-lg font-bold">{fmt(ind.taux, ind.unite)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Attendu</dt>
          <dd className="text-lg">{fmt(att, ind.unite)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Valeur ajoutée</dt>
          <dd className="text-lg">{ind.va === null ? "—" : signe(ind.va, ind.unite === " %" ? " pt" : "")}</dd>
        </div>
      </dl>
      <p className="mt-2">
        <BadgeVerdict va={ind.va} seuil={ind.seuil} />
      </p>
    </div>
  );
}
