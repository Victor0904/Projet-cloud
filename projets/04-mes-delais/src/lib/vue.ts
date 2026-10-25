// Assemble l'état stocké, le catalogue et le moteur de calcul pour l'affichage et les exports.
import { calculer, comparerUrgence, urgence, type Urgence } from "./calcul";
import { typeParId } from "./catalogue";
import { dateMoyenne, type Iso } from "./dates";
import type { EvenementIcs } from "./ics";
import type { Echeance, Etat, Membre, Resultat, TypeEcheance } from "./types";

export type Ligne = {
  echeance: Echeance;
  type: TypeEcheance;
  membre?: Membre;
  res: Resultat;
  urgence: Urgence;
  titre: string;
};

export function titreEcheance(type: TypeEcheance, e: Echeance): string {
  const base = e.libelle?.trim() || type.libelle;
  const variante = type.variantes?.find((v) => v.id === e.varianteId);
  return variante && !e.libelle ? `${base} (${variante.libelle.split(" — ")[0]})` : base;
}

export function lignes(etat: Etat, auj: Iso, opts: { archivees?: boolean } = {}): Ligne[] {
  const out: Ligne[] = [];
  for (const e of etat.echeances) {
    if (e.archivee && !opts.archivees) continue;
    const type = typeParId(e.typeId);
    if (!type) continue;
    const res = calculer(type, e, auj);
    out.push({
      echeance: e,
      type,
      membre: etat.membres.find((m) => m.id === e.membreId),
      res,
      urgence: urgence(res, auj),
      titre: titreEcheance(type, e),
    });
  }
  return out.sort((a, b) => comparerUrgence(a.res, b.res, auj));
}

const titreAvecMembre = (l: Ligne) => (l.membre ? `${l.titre} — ${l.membre.nom}` : l.titre);

/** Événements d'agenda : la prochaine échéance et jusqu'à 3 suivantes. */
export function evenementsAgenda(ls: Ligne[]): EvenementIcs[] {
  const evs: EvenementIcs[] = [];
  for (const l of ls) {
    if (!l.res.date || l.res.statut === "termine" || l.res.statut === "depasse") continue;
    const dates = [l.res.date, ...l.res.suivantes.slice(0, 3)];
    dates.forEach((date, i) => {
      const enRetard = i === 0 && l.res.statut === "en_retard";
      const description = [
        enRetard && l.res.dateTheorique ? `En retard : prévu le ${dateMoyenne(l.res.dateTheorique)}.` : "",
        i === 0 ? l.res.explication : "Date estimée si l'échéance précédente est faite à temps.",
        l.type.consequences ? `Si vous oubliez : ${l.type.consequences}` : "",
        l.type.demarche.url ? `Démarche : ${l.type.demarche.url}` : "",
        l.type.source ? `Source : ${l.type.source} (vérifié le ${l.type.verifie_le}).` : "",
        "Rappel généré par Mes délais (Vie FR) — estimation qui ne remplace pas la démarche officielle.",
      ]
        .filter(Boolean)
        .join("\n");
      evs.push({
        uid: `${l.echeance.id}-${date}@mes-delais.vie-fr`,
        titre: `${enRetard ? "EN RETARD — " : ""}${titreAvecMembre(l)}`,
        date,
        description,
        url: l.type.demarche.url || undefined,
      });
    });
  }
  return evs;
}
