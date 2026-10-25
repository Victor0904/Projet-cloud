"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { genererIcs } from "@/lib/ics";
import { verifierEtNotifier } from "@/lib/notifications";
import { decoderLien, fusionner } from "@/lib/stockage";
import { evenementsAgenda, lignes } from "@/lib/vue";
import { CarteEcheance } from "./CarteEcheance";
import { modifierEtat, telecharger, useAujourdhui } from "./etat";
import { Bouton, Chargement, classeBouton, Encadre } from "./ui";

/** Page /rappel?data=… : lecture des échéances encodées dans le lien, recalculées à la date du jour. */
export function Rappel() {
  const data = useSearchParams().get("data") ?? "";
  const auj = useAujourdhui();
  const etat = useMemo(() => decoderLien(data), [data]);
  const [enregistre, setEnregistre] = useState(false);
  const ls = useMemo(() => (etat && auj ? lignes(etat, auj) : []), [etat, auj]);

  const verifie = useRef(false);
  useEffect(() => {
    if (verifie.current || !auj || !ls.length) return;
    verifie.current = true;
    verifierEtNotifier(ls, auj);
  });

  if (!auj) return <Chargement />;
  if (!etat) {
    return (
      <Encadre ton="alerte" titre="Lien illisible">
        Ce lien de rappel est vide ou incomplet (il a peut-être été coupé lors d&apos;un copier-coller).{" "}
        <Link href="/" className="underline">
          Ouvrir le tableau de bord
        </Link>
      </Encadre>
    );
  }

  return (
    <>
      <p className="mb-4">
        {ls.length} échéance(s) contenue(s) dans ce lien, recalculée(s) à la date d&apos;aujourd&apos;hui. Gardez cette
        page en favori pour vérifier vos délais d&apos;un coup d&apos;œil.
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <Bouton
          onClick={() => {
            modifierEtat((s) => fusionner(s, etat));
            setEnregistre(true);
          }}
        >
          {enregistre ? "Enregistré sur cet appareil ✓" : "Enregistrer sur cet appareil"}
        </Bouton>
        <Bouton
          variante="secondaire"
          onClick={() => telecharger("mes-delais.ics", genererIcs(evenementsAgenda(ls)), "text/calendar;charset=utf-8")}
        >
          Télécharger le calendrier (.ics)
        </Bouton>
        {enregistre && (
          <Link href="/" className={classeBouton.discret}>
            Aller au tableau de bord
          </Link>
        )}
      </div>
      {ls.map((l) => (
        <CarteEcheance key={l.echeance.id} ligne={l} auj={auj} lectureSeule />
      ))}
    </>
  );
}
