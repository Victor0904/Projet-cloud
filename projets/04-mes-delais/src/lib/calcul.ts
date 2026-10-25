// Moteur de calcul des échéances. Fonctions pures : la date du jour est toujours passée en paramètre.
import {
  ajouterJours,
  ajouterMois,
  annee,
  dateDansAnnee,
  dateMoyenne,
  ecartJours,
  finDeMois,
  type Iso,
} from "./dates";
import type { Echeance, Regle, Resultat, TypeEcheance } from "./types";

/** Règle du type, avec les valeurs de la variante choisie appliquées par-dessus. */
export function regleEffective(type: TypeEcheance, varianteId?: string): Regle {
  const v = type.variantes?.find((x) => x.id === varianteId) ?? type.variantes?.[0];
  return v ? ({ ...type.regle, ...v.regle } as Regle) : type.regle;
}

const max = (a: Iso, b: Iso) => (a > b ? a : b);

const plurielMois = (m: number) => {
  if (m === 0) return "0 mois";
  if (m % 12 === 0) return m === 12 ? "1 an" : `${m / 12} ans`;
  return `${m} mois`;
};

function suite(depart: Iso, pasMois: number, n: number): Iso[] {
  const r: Iso[] = [];
  for (let k = 1; k <= n; k++) r.push(ajouterMois(depart, pasMois * k));
  return r;
}

/** Retard rattrapable : l'échéance théorique est passée, on la ramène à aujourd'hui. */
function avecRattrapage(theo: Iso, auj: Iso, pasMois: number, n: number, explication: string): Resultat {
  if (theo < auj) {
    return {
      statut: "en_retard",
      date: auj,
      dateTheorique: theo,
      suivantes: suite(auj, pasMois, n),
      explication: `${explication} Échéance dépassée depuis le ${dateMoyenne(theo)} : à faire dès maintenant ; les suivantes sont recalculées à partir d'aujourd'hui.`,
    };
  }
  return { statut: "a_venir", date: theo, dateTheorique: theo, suivantes: suite(theo, pasMois, n), explication };
}

const incomplet = (msg: string): Resultat => ({
  statut: "incomplet",
  date: null,
  dateTheorique: null,
  suivantes: [],
  explication: msg,
});

const termine = (msg: string): Resultat => ({
  statut: "termine",
  date: null,
  dateTheorique: null,
  suivantes: [],
  explication: msg,
});

/**
 * Calcule la prochaine échéance et les suivantes.
 * @param auj date du jour (ISO)
 * @param n nombre d'échéances suivantes à calculer
 */
export function calculer(type: TypeEcheance, e: Echeance, auj: Iso, n = 3): Resultat {
  const r = regleEffective(type, e.varianteId);
  const champ = (id: string) => type.champs.find((c) => c.id === id);
  const valeur = (id?: string) => (id ? e.dates[id] : undefined);

  switch (r.type) {
    case "periodique": {
      const ref = valeur(r.champ);
      const dernier = valeur(r.champ_dernier);
      let theo: Iso;
      let expl: string;
      if (e.derniere) {
        theo = ajouterMois(e.derniere.faitLe, r.intervalle_mois);
        expl = `Fait le ${dateMoyenne(e.derniere.faitLe)}, à refaire ${plurielMois(r.intervalle_mois)} après.`;
      } else if (dernier) {
        theo = ajouterMois(dernier, r.intervalle_mois);
        expl = `Dernière fois le ${dateMoyenne(dernier)}, à refaire ${plurielMois(r.intervalle_mois)} après.`;
      } else if (ref) {
        theo = ajouterMois(ref, r.premier_mois);
        expl =
          r.premier_mois === 0
            ? `Première échéance le ${dateMoyenne(ref)}, puis tous les ${plurielMois(r.intervalle_mois)}.`
            : `${champ(r.champ)?.libelle ?? "Date de référence"} : ${dateMoyenne(ref)}, première échéance ${plurielMois(r.premier_mois)} après, puis tous les ${plurielMois(r.intervalle_mois)}.`;
      } else if (champ(r.champ)?.obligatoire) {
        return incomplet(`Il manque : ${champ(r.champ)?.libelle ?? r.champ}.`);
      } else {
        theo = e.creeLe;
        expl = `Date du dernier passage inconnue : à faire dès que possible, puis tous les ${plurielMois(r.intervalle_mois)}.`;
      }
      return avecRattrapage(theo, auj, r.intervalle_mois, n, expl);
    }

    case "validite": {
      const ref = e.derniere?.faitLe ?? valeur(r.champ);
      if (!ref) return incomplet(`Il manque : ${champ(r.champ)?.libelle ?? r.champ}.`);
      const theo = ajouterMois(ref, r.duree_mois);
      const expl = `${e.derniere ? "Renouvelé" : "Délivré ou réalisé"} le ${dateMoyenne(ref)}, valable ${plurielMois(r.duree_mois)}.`;
      // Après renouvellement, la durée peut changer (ancienne CNI 15 ans → format carte 10 ans).
      const apres = type.variantes?.find((v) => v.id === e.varianteId)?.apres_renouvellement;
      const regleApres = apres ? regleEffective(type, apres) : r;
      const pas = regleApres.type === "validite" ? regleApres.duree_mois : r.duree_mois;
      const res = avecRattrapage(theo, auj, r.duree_mois, n, expl);
      return res.date ? { ...res, suivantes: suite(res.date, pas, n) } : res;
    }

    case "annuel": {
      const depuis = e.derniere ? ajouterJours(e.derniere.echeance, 1) : e.creeLe;
      let theo = dateDansAnnee(annee(depuis), r.mois, r.jour);
      if (theo < depuis) theo = dateDansAnnee(annee(depuis) + 1, r.mois, r.jour);
      const suivantes = Array.from({ length: n }, (_, k) => dateDansAnnee(annee(theo) + k + 1, r.mois, r.jour));
      const expl = `Chaque année au ${dateMoyenne(theo).replace(/ \d{4}$/, "")}.`;
      if (theo < auj) {
        return {
          statut: "en_retard",
          date: auj,
          dateTheorique: theo,
          suivantes: suivantes.filter((d) => d > auj),
          explication: `${expl} La date du ${dateMoyenne(theo)} est passée : à régulariser dès maintenant.`,
        };
      }
      return { statut: "a_venir", date: theo, dateTheorique: theo, suivantes, explication: expl };
    }

    case "anniversaire": {
      const ref = valeur(r.champ);
      if (!ref) return incomplet(`Il manque : ${champ(r.champ)?.libelle ?? r.champ}.`);
      const preavis = e.parametres?.preavis_jours ?? r.preavis_jours;
      const occ = (k: number) => ajouterJours(ajouterMois(ref, 12 * k), -preavis);
      const depuis = max(e.derniere ? ajouterJours(e.derniere.echeance, 1) : auj, auj);
      // Une date de référence future est une échéance à venir (k = 0) ; sinon c'est la souscription.
      let k = ref > auj ? 0 : 1;
      while (occ(k) < depuis) k++;
      const theo = occ(k);
      const expl =
        preavis > 0
          ? `Échéance annuelle le ${dateMoyenne(ajouterMois(ref, 12 * k))} ; date limite pour résilier ${preavis} jours avant.`
          : `Échéance annuelle le ${dateMoyenne(theo)}.`;
      return {
        statut: "a_venir",
        date: theo,
        dateTheorique: theo,
        suivantes: Array.from({ length: n }, (_, i) => occ(k + i + 1)),
        explication: expl,
      };
    }

    case "ponctuel": {
      const ref = valeur(r.champ);
      if (!ref) return incomplet(`Il manque : ${champ(r.champ)?.libelle ?? r.champ}.`);
      if (e.derniere) return termine(`Fait le ${dateMoyenne(e.derniere.faitLe)}.`);
      let theo = ajouterJours(ajouterMois(ref, r.mois), r.jours);
      if (r.fin_de_mois) theo = finDeMois(theo);
      const expl = `Calculé à partir du ${dateMoyenne(ref)}.`;
      if (theo < auj) {
        return r.rattrapable
          ? {
              statut: "en_retard",
              date: auj,
              dateTheorique: theo,
              suivantes: [],
              explication: `${expl} Date limite dépassée le ${dateMoyenne(theo)} : régularisez au plus vite.`,
            }
          : {
              statut: "depasse",
              date: theo,
              dateTheorique: theo,
              suivantes: [],
              explication: `${expl} Délai expiré le ${dateMoyenne(theo)}.`,
            };
      }
      return { statut: "a_venir", date: theo, dateTheorique: theo, suivantes: [], explication: expl };
    }

    case "ages": {
      const naissance = valeur(r.champ);
      if (!naissance) return incomplet(`Il manque : ${champ(r.champ)?.libelle ?? r.champ}.`);
      const occ = r.ages.map((a) => ajouterMois(naissance, 12 * a));
      const fait = e.derniere?.faitLe ?? valeur(r.champ_dernier);
      let idx: number;
      if (fait) {
        idx = occ.findIndex((d) => d > fait);
      } else {
        // Dernier rappel inconnu : le plus récent âge déjà atteint est considéré comme manqué.
        const passes = occ.filter((d) => d <= auj).length;
        idx = passes > 0 ? passes - 1 : 0;
      }
      if (idx < 0) return termine("Plus de rappel prévu par le calendrier.");
      const theo = occ[idx];
      const ageTxt = `rappel des ${r.ages[idx]} ans`;
      const suivantes = occ.slice(idx + 1, idx + 1 + n);
      if (theo < auj) {
        return {
          statut: "en_retard",
          date: auj,
          dateTheorique: theo,
          suivantes,
          explication: `${ageTxt[0].toUpperCase()}${ageTxt.slice(1)} prévu le ${dateMoyenne(theo)} : à rattraper dès maintenant.`,
        };
      }
      return { statut: "a_venir", date: theo, dateTheorique: theo, suivantes, explication: `Prochain : ${ageTxt}.` };
    }

    case "fixe": {
      if (e.derniere) return termine(`Fait le ${dateMoyenne(e.derniere.faitLe)}.`);
      const theo = r.date;
      return {
        statut: theo < auj ? "depasse" : "a_venir",
        date: theo,
        dateTheorique: theo,
        suivantes: [],
        explication: `Date fixée par la réglementation : ${dateMoyenne(theo)}.`,
      };
    }

    case "libre": {
      if (!e.libre) return incomplet("Il manque la date de l'échéance.");
      const { date, recurrenceMois: rec } = e.libre;
      if (!rec) {
        if (e.derniere) return termine(`Fait le ${dateMoyenne(e.derniere.faitLe)}.`);
        return {
          statut: date < auj ? "depasse" : "a_venir",
          date,
          dateTheorique: date,
          suivantes: [],
          explication: "Échéance unique.",
        };
      }
      let theo = date;
      if (e.derniere) while (theo <= e.derniere.echeance) theo = ajouterMois(theo, rec);
      return avecRattrapage(theo, auj, rec, n, `Tous les ${plurielMois(rec)}.`);
    }
  }
}

export type Urgence = "depasse" | "moins30" | "moins90" | "plus_tard" | "aucune";

export const ORDRE_URGENCE: Record<Urgence, number> = { depasse: 0, moins30: 1, moins90: 2, plus_tard: 3, aucune: 4 };

export const LIBELLE_URGENCE: Record<Urgence, string> = {
  depasse: "Dépassé",
  moins30: "Moins de 30 jours",
  moins90: "Moins de 90 jours",
  plus_tard: "Plus tard",
  aucune: "—",
};

export function urgence(res: Resultat, auj: Iso): Urgence {
  if (res.statut === "en_retard" || res.statut === "depasse") return "depasse";
  if (!res.date) return "aucune";
  const j = ecartJours(auj, res.date);
  if (j < 30) return "moins30";
  if (j < 90) return "moins90";
  return "plus_tard";
}

/** Tri par urgence, puis par date théorique (la plus ancienne d'abord). */
export function comparerUrgence(a: Resultat, b: Resultat, auj: Iso): number {
  const d = ORDRE_URGENCE[urgence(a, auj)] - ORDRE_URGENCE[urgence(b, auj)];
  if (d !== 0) return d;
  return (a.dateTheorique ?? "9999").localeCompare(b.dateTheorique ?? "9999");
}

/** Marque « c'est fait » : renvoie l'échéance mise à jour (et archivée si elle ne se répète pas). */
export function marquerFait(type: TypeEcheance, e: Echeance, faitLe: Iso, auj: Iso): Echeance {
  const res = calculer(type, e, auj);
  if (!res.dateTheorique) return e;
  const variante = type.variantes?.find((v) => v.id === e.varianteId);
  const maj: Echeance = { ...e, derniere: { echeance: res.dateTheorique, faitLe } };
  if (variante?.apres_renouvellement) maj.varianteId = variante.apres_renouvellement;
  const apres = calculer(type, maj, auj);
  return apres.statut === "termine" ? { ...maj, archivee: true } : maj;
}

/** Dates (prochaine + suivantes) comprises entre auj et auj + mois. Un retard est placé à aujourd'hui. */
export function occurrencesSurPeriode(res: Resultat, auj: Iso, mois = 12): Iso[] {
  if (!res.date) return [];
  const fin = ajouterMois(auj, mois);
  return [res.date, ...res.suivantes].filter((d) => d >= auj && d < fin);
}

/** Date à laquelle il est conseillé de commencer la démarche (délais de rendez-vous…). */
export function dateConseillee(type: TypeEcheance, res: Resultat, auj: Iso): Iso | null {
  if (!res.date || !type.anticiper_jours || res.statut !== "a_venir") return null;
  const d = ajouterJours(res.date, -type.anticiper_jours);
  return d > auj ? d : null;
}
