"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { Champ, ChampSelect } from "@vie-fr/ui";
import { calculer, urgence } from "@/lib/calcul";
import { catalogue, TYPE_LIBRE, typeParId, typesParCategorie } from "@/lib/catalogue";
import { dateAvecJour, dateMoyenne, estIso, relatif } from "@/lib/dates";
import { nouvelId } from "@/lib/stockage";
import type { Echeance, Etat, GenreMembre, TypeEcheance } from "@/lib/types";
import { modifierEtat, useAujourdhui, useEtat } from "./etat";
import { BadgeStatut, BadgeUrgence, Bouton, Chargement, classeBouton, Encadre } from "./ui";

const GENRE_PAR_CIBLE: Record<TypeEcheance["cible"], GenreMembre> = {
  personne: "personne",
  vehicule: "vehicule",
  logement: "logement",
  contrat: "autre",
  autre: "autre",
};

export const LIBELLES_GENRE: Record<GenreMembre, string> = {
  personne: "Personne",
  vehicule: "Véhicule",
  logement: "Logement",
  autre: "Autre (contrat, objet…)",
};

const RECURRENCES: [string, string][] = [
  ["0", "Une seule fois"],
  ["1", "Tous les mois"],
  ["3", "Tous les 3 mois"],
  ["6", "Tous les 6 mois"],
  ["12", "Tous les ans"],
  ["24", "Tous les 2 ans"],
  ["36", "Tous les 3 ans"],
  ["60", "Tous les 5 ans"],
  ["120", "Tous les 10 ans"],
];

export function Assistant() {
  const params = useSearchParams();
  const etat = useEtat();
  const auj = useAujourdhui();
  const idModif = params.get("modifier");
  const existante = idModif ? etat?.echeances.find((e) => e.id === idModif) : undefined;
  const typeId = existante?.typeId ?? params.get("type");
  const type = typeId ? typeParId(typeId) : undefined;

  if (!etat || !auj) return <Chargement />;
  if (idModif && !existante) {
    return (
      <Encadre ton="alerte" titre="Échéance introuvable">
        Elle a peut-être été supprimée. <Link href="/" className="underline">Retour au tableau de bord</Link>
      </Encadre>
    );
  }
  if (!type) return <ChoixType />;
  return <Formulaire key={`${type.id}-${idModif ?? "nouveau"}`} type={type} etat={etat} auj={auj} existante={existante} />;
}

function ChoixType() {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const groupes = typesParCategorie()
    .map((g) => ({ ...g, types: g.types.filter((t) => !q || norm(`${t.libelle} ${t.description}`).includes(norm(q))) }))
    .filter((g) => g.types.length);

  return (
    <>
      <h2 className="text-xl font-bold">1. Que voulez-vous suivre ?</h2>
      <p className="mb-4 text-gray-800">
        {catalogue.types.length - 1} types d&apos;échéances avec leur règle de calcul, ou une échéance libre.
      </p>
      <Champ label="Rechercher" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="carte, voiture, bail…" />
      {groupes.map((g) => (
        <section key={g.id} className="mb-4">
          <h3 className="mb-2 font-bold">{g.libelle}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.types.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/ajouter?type=${t.id}`}
                  className="block h-full rounded border border-gray-300 p-3 hover:border-blue-900 hover:bg-blue-50 focus:outline-2 focus:outline-blue-700"
                >
                  <span className="font-medium text-blue-900">{t.libelle}</span>
                  <BadgeStatut statut={t.statut} />
                  <span className="mt-1 block text-sm text-gray-700">{t.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groupes.length === 0 && (
        <p>
          Rien ne correspond.{" "}
          <Link href={`/ajouter?type=${TYPE_LIBRE}`} className="text-blue-900 underline">
            Créer une échéance libre
          </Link>
        </p>
      )}
    </>
  );
}

function Formulaire({ type, etat, auj, existante }: { type: TypeEcheance; etat: Etat; auj: string; existante?: Echeance }) {
  const router = useRouter();
  const estLibre = type.id === TYPE_LIBRE;
  const genreSuggere = GENRE_PAR_CIBLE[type.cible];
  const [varianteId, setVarianteId] = useState(existante?.varianteId ?? type.variantes?.[0]?.id);
  const [dates, setDates] = useState<Record<string, string>>(existante?.dates ?? {});
  const [parametres, setParametres] = useState<Record<string, number>>(
    existante?.parametres ?? Object.fromEntries((type.parametres ?? []).map((p) => [p.id, p.defaut])),
  );
  const [membreChoix, setMembreChoix] = useState(
    existante ? (existante.membreId ?? "") : (etat.membres.find((m) => m.genre === genreSuggere)?.id ?? ""),
  );
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauGenre, setNouveauGenre] = useState<GenreMembre>(genreSuggere);
  const [libelle, setLibelle] = useState(existante?.libelle ?? "");
  const [libreDate, setLibreDate] = useState(existante?.libre?.date ?? "");
  const [recurrence, setRecurrence] = useState(String(existante?.libre?.recurrenceMois ?? 0));
  const [note, setNote] = useState(existante?.note ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const idNote = useId();

  const brouillon: Echeance = useMemo(
    () => ({
      id: existante?.id ?? "brouillon",
      typeId: type.id,
      varianteId,
      dates: Object.fromEntries(Object.entries(dates).filter(([, v]) => estIso(v))),
      parametres: type.parametres?.length ? parametres : undefined,
      libre: estLibre && estIso(libreDate) ? { date: libreDate, recurrenceMois: Number(recurrence) } : undefined,
      creeLe: existante?.creeLe ?? auj,
      derniere: existante?.derniere,
    }),
    [existante, type, varianteId, dates, parametres, estLibre, libreDate, recurrence, auj],
  );

  const manquants = [
    ...type.champs.filter((c) => c.obligatoire && !estIso(dates[c.id] ?? "")).map((c) => c.libelle),
    ...(estLibre && !estIso(libreDate) ? ["Date de l'échéance"] : []),
    ...(estLibre && !libelle.trim() ? ["Intitulé"] : []),
    ...(membreChoix === "__nouveau" && !nouveauNom.trim() ? ["Nom de la personne ou du bien"] : []),
  ];
  const apercu = calculer(type, brouillon, auj);

  const enregistrer = () => {
    if (manquants.length) {
      setErreur(`Complétez : ${manquants.join(", ")}.`);
      return;
    }
    let membreId: string | undefined = membreChoix || undefined;
    const ok = modifierEtat((s) => {
      const membres = [...s.membres];
      if (membreChoix === "__nouveau") {
        membreId = nouvelId();
        membres.push({ id: membreId, nom: nouveauNom.trim(), genre: nouveauGenre });
      }
      const datesModifiees =
        existante && (JSON.stringify(existante.dates) !== JSON.stringify(brouillon.dates) || existante.varianteId !== varianteId);
      const e: Echeance = {
        ...brouillon,
        id: existante?.id ?? nouvelId(),
        membreId,
        libelle: libelle.trim() || undefined,
        note: note.trim() || undefined,
        derniere: datesModifiees ? undefined : existante?.derniere,
      };
      const echeances = existante ? s.echeances.map((x) => (x.id === e.id ? e : x)) : [...s.echeances, e];
      return { ...s, membres, echeances };
    });
    if (!ok) {
      setErreur("Votre navigateur a refusé l'enregistrement (navigation privée ?). Exportez vos données pour ne rien perdre.");
      return;
    }
    router.push("/");
  };

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        enregistrer();
      }}
      noValidate
    >
      <p className="mb-2 text-sm">
        <Link href="/ajouter" className="text-blue-900 underline">
          ← Choisir un autre type
        </Link>
      </p>
      <h2 className="text-xl font-bold">
        {existante ? "Modifier : " : "2. "}
        {type.libelle}
        <BadgeStatut statut={type.statut} />
      </h2>
      <p className="mb-4 text-gray-800">{type.description}</p>

      {type.variantes && (
        <ChampSelect
          label="Votre cas"
          value={varianteId}
          onChange={(e) => setVarianteId(e.target.value)}
          options={type.variantes.map((v) => [v.id, v.libelle])}
        />
      )}

      {estLibre && (
        <>
          <Champ label="Intitulé (obligatoire)" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Fin d'engagement box internet" maxLength={120} required />
          <Champ label="Date de l'échéance (obligatoire)" type="date" value={libreDate} onChange={(e) => setLibreDate(e.target.value)} required />
          <ChampSelect label="Répétition" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} options={RECURRENCES} />
        </>
      )}

      {type.champs.map((c) => (
        <Champ
          key={c.id}
          label={`${c.libelle}${c.obligatoire ? " (obligatoire)" : " (facultatif)"}`}
          aide={c.aide}
          type="date"
          value={dates[c.id] ?? ""}
          onChange={(e) => setDates((d) => ({ ...d, [c.id]: e.target.value }))}
          required={c.obligatoire}
        />
      ))}

      {type.parametres?.map((p) => (
        <Champ
          key={p.id}
          label={p.libelle}
          aide={p.aide}
          type="number"
          min={0}
          max={365}
          value={String(parametres[p.id] ?? p.defaut)}
          onChange={(e) => setParametres((x) => ({ ...x, [p.id]: Math.max(0, Math.min(365, Number(e.target.value) || 0)) }))}
        />
      ))}

      <fieldset className="mb-4 border border-gray-300 p-3">
        <legend className="px-1 font-medium">Pour qui ou pour quoi ? (mode foyer)</legend>
        <ChampSelect
          label="Étiquette"
          value={membreChoix}
          onChange={(e) => setMembreChoix(e.target.value)}
          options={[
            ["", "Aucune étiquette"],
            ...etat.membres.map((m): [string, string] => [m.id, `${m.nom} (${LIBELLES_GENRE[m.genre].toLowerCase()})`]),
            ["__nouveau", "+ Nouvelle personne ou nouveau bien…"],
          ]}
        />
        {membreChoix === "__nouveau" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Champ label="Nom" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder="Léa, Clio, Appartement Lyon…" maxLength={80} />
            <ChampSelect
              label="C'est…"
              value={nouveauGenre}
              onChange={(e) => setNouveauGenre(e.target.value as GenreMembre)}
              options={Object.entries(LIBELLES_GENRE) as [string, string][]}
            />
          </div>
        )}
      </fieldset>

      {!estLibre && (
        <Champ label="Nom personnalisé (facultatif)" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder={type.libelle} maxLength={120} />
      )}

      <div className="mb-4">
        <label htmlFor={idNote} className="block font-medium">
          Note (facultatif)
        </label>
        <textarea
          id={idNote}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="mt-1 block w-full rounded-t border-b-2 border-gray-800 bg-gray-100 px-3 py-2 focus:outline-2 focus:outline-blue-700"
        />
      </div>

      <section aria-live="polite" className="my-6 border-l-4 border-blue-900 bg-blue-50 p-4">
        <h3 className="font-bold">Résultat</h3>
        {apercu.date ? (
          <>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-blue-900">
              {apercu.statut === "en_retard" ? "À faire dès maintenant" : dateAvecJour(apercu.date)}
              <BadgeUrgence urgence={urgence(apercu, auj)} />
            </p>
            {apercu.statut !== "en_retard" && <p className="text-gray-800">{relatif(auj, apercu.date)}</p>}
            <p className="mt-2 text-sm">{apercu.explication}</p>
            {apercu.suivantes.length > 0 && (
              <p className="mt-1 text-sm">Échéances suivantes : {apercu.suivantes.map(dateMoyenne).join(", ")}.</p>
            )}
            {type.consequences && (
              <p className="mt-2 text-sm">
                <strong>En cas d&apos;oubli :</strong> {type.consequences}
              </p>
            )}
            {type.source && (
              <p className="mt-2 text-xs text-gray-700">
                Source : <a href={type.source} target="_blank" rel="noreferrer" className="break-all underline">{type.source}</a> — vérifié le{" "}
                {dateMoyenne(type.verifie_le)}
                {type.statut === "A_VERIFIER" ? " (règle à vérifier)" : ""}. Estimation : ne remplace pas la démarche officielle.
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-gray-800">
            {estLibre && !apercu.date ? "Saisissez la date de l'échéance." : apercu.explication}
          </p>
        )}
      </section>

      {erreur && (
        <p role="alert" className="mb-4 font-medium text-red-800">
          {erreur}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={classeBouton.primaire}>
          {existante ? "Enregistrer les modifications" : "Ajouter à mon tableau de bord"}
        </button>
        <Bouton variante="discret" onClick={() => router.push("/")}>
          Annuler
        </Bouton>
      </div>
    </form>
  );
}
