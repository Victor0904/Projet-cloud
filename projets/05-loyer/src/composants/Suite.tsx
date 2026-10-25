import { euros } from "@vie-fr/fr-data";
import type { Analyse } from "../lib/analyse";
import { REGLES } from "../lib/analyse";

const dateFr = (iso: string) => iso.split("-").reverse().join("/");

/** Les étapes après la lettre : commission de conciliation, juge, signalement. */
export function Suite({ analyse: a }: { analyse: Analyse }) {
  const d = REGLES.depassement;
  return (
    <section aria-labelledby="titre-suite" className="mt-8">
      <h2 id="titre-suite" className="text-xl font-bold">
        Que faire maintenant ?
      </h2>
      <ol className="mt-3 space-y-4">
        <li className="border-l-4 border-blue-900 pl-3">
          <p className="font-medium">1. Envoyez la lettre de mise en demeure ci-dessous</p>
          <p className="text-sm">
            En recommandé avec avis de réception, gardez une copie. Elle laisse {d.delai_reponse_lettre_jours} jours au bailleur
            pour ramener le loyer au plafond et rembourser le trop-perçu. Ce délai n&apos;est pas fixé par la loi : c&apos;est un usage courant.
          </p>
        </li>
        <li className="border-l-4 border-blue-900 pl-3">
          <p className="font-medium">2. Sans réponse : saisissez la commission départementale de conciliation</p>
          <p className="text-sm">{REGLES.commission.texte}</p>
          {a.complement.present && a.complement.contestable && (
            <p className="mt-1 text-sm font-medium">
              Pour le complément de loyer, la commission doit être saisie avant le {dateFr(a.complement.dateLimite)}
              {a.complement.delaiDepasse ? " (délai dépassé)" : ""}.
            </p>
          )}
        </li>
        <li className="border-l-4 border-blue-900 pl-3">
          <p className="font-medium">3. En l&apos;absence d&apos;accord : le juge</p>
          <p className="text-sm">{REGLES.juge.texte}</p>
          <p className="mt-1 text-sm">
            {d.texte} Pour vous, les loyers versés en trop depuis le {dateFr(a.tropPercu.depuis)} représentent environ{" "}
            {euros(a.tropPercu.montant)} à ce jour.
          </p>
        </li>
        <li className="border-l-4 border-blue-900 pl-3">
          <p className="font-medium">4. Vous pouvez aussi signaler le bailleur</p>
          <p className="text-sm">{d.amende_texte}</p>
        </li>
      </ol>
      <p className="mt-3 text-sm text-gray-700">
        Besoin d&apos;aide ? L&apos;ADIL de votre département (Agence départementale d&apos;information sur le logement) et les
        associations de locataires conseillent gratuitement. Cet outil ne remplace pas un conseil juridique.{" "}
        <a href={d.source} className="underline" target="_blank" rel="noreferrer">
          Source
        </a>{" "}
        (vérifié le {dateFr(d.verifie_le)}, règles à confirmer sur le texte officiel).
      </p>
    </section>
  );
}
