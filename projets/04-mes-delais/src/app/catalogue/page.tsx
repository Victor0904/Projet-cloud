import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { BadgeStatut, Encadre } from "@/components/ui";
import { catalogue, TYPE_LIBRE, typesParCategorie } from "@/lib/catalogue";
import { dateMoyenne } from "@/lib/dates";
import type { TypeEcheance } from "@/lib/types";

export const metadata: Metadata = { title: "Catalogue des règles — Mes délais" };

const mois = (m: number) => (m % 12 === 0 ? (m === 12 ? "1 an" : `${m / 12} ans`) : `${m} mois`);

function resumeRegle(t: TypeEcheance): string {
  const r = t.regle;
  switch (r.type) {
    case "periodique":
      return r.premier_mois === r.intervalle_mois || r.premier_mois === 0
        ? `Tous les ${mois(r.intervalle_mois)}.`
        : `Première fois ${mois(r.premier_mois)} après la date de référence, puis tous les ${mois(r.intervalle_mois)}.`;
    case "validite":
      return `Valable ${mois(r.duree_mois)} à partir de la délivrance.`;
    case "annuel":
      return `Chaque année, le ${r.jour}/${String(r.mois).padStart(2, "0")}.`;
    case "anniversaire":
      return r.preavis_jours ? `Chaque année, ${r.preavis_jours} jours avant la date anniversaire.` : "Chaque année, à la date anniversaire.";
    case "ponctuel": {
      const d = [r.mois ? mois(Math.abs(r.mois)) : "", r.jours ? `${Math.abs(r.jours)} jours` : ""].filter(Boolean).join(" et ");
      return `Une seule fois : ${d} ${r.mois < 0 || r.jours < 0 ? "avant" : "après"} la date de référence${r.fin_de_mois ? " (fin du mois)" : ""}.`;
    }
    case "ages":
      return `Aux âges de ${r.ages.join(", ")} ans.`;
    case "fixe":
      return `Date fixe : ${dateMoyenne(r.date)}.`;
    case "libre":
      return "Date et répétition choisies par vous.";
  }
}

export default function Catalogue() {
  const aVerifier = catalogue.types.filter((t) => t.statut === "A_VERIFIER").length;
  return (
    <Page actif="/catalogue" titre="Catalogue des règles">
      <p>
        {catalogue.types.length - 1} types d&apos;échéances. Pour chacun : la règle de calcul, ce que vous risquez en cas
        d&apos;oubli, le lien vers la démarche et la source.
      </p>
      <Encadre titre="Comment ces règles ont été vérifiées">
        {catalogue.avertissement} {aVerifier} règle(s) portent la mention « À vérifier ». Dernière vérification
        générale : {dateMoyenne(catalogue.verifie_le)}.
      </Encadre>
      {typesParCategorie().map((g) => (
        <section key={g.id} className="mb-8" aria-labelledby={`cat-${g.id}`}>
          <h2 id={`cat-${g.id}`} className="mb-3 text-xl font-bold">
            {g.libelle}
          </h2>
          {g.types.map((t) => (
            <article key={t.id} id={t.id} className="mb-4 border-l-4 border-gray-300 pl-4">
              <h3 className="font-bold">
                {t.libelle}
                <BadgeStatut statut={t.statut} />
              </h3>
              <p className="text-sm">{t.description}</p>
              <p className="mt-1 text-sm">
                <strong>Règle :</strong> {resumeRegle(t)}
                {t.variantes ? ` Variantes : ${t.variantes.map((v) => v.libelle).join(" ; ")}.` : ""}
              </p>
              {t.consequences && (
                <p className="mt-1 text-sm">
                  <strong>En cas d&apos;oubli :</strong> {t.consequences}
                </p>
              )}
              {t.note && <p className="mt-1 text-sm text-gray-700">{t.note}</p>}
              <p className="mt-1 text-sm">
                {t.demarche.url && (
                  <a href={t.demarche.url} target="_blank" rel="noreferrer" className="text-blue-900 underline">
                    {t.demarche.libelle}
                  </a>
                )}
                {t.demarche.url && " · "}
                <Link href={`/ajouter?type=${t.id}`} className="text-blue-900 underline">
                  {t.id === TYPE_LIBRE ? "Créer une échéance libre" : "Suivre cette échéance"}
                </Link>
              </p>
              {t.source && (
                <p className="mt-1 text-xs text-gray-600">
                  Source : <a href={t.source} className="break-all underline" target="_blank" rel="noreferrer">{t.source}</a> — vérifié le{" "}
                  {dateMoyenne(t.verifie_le)}
                </p>
              )}
            </article>
          ))}
        </section>
      ))}
    </Page>
  );
}
