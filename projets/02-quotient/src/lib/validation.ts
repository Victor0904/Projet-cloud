import { CLES_PRESTATIONS, type Grille, type Prestation, type Tranche } from "./types";

const UNITES = ["repas", "seance", "heure", "jour", "demi_journee", "mois", "an", "psu"];
const BASES = ["qf_caf", "qf_fiscal", "qf_municipal", "revenus_mensuels"];
const estNombre = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const estDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const estUrl = (s: unknown) => typeof s === "string" && /^https?:\/\/\S+$/.test(s);

/** Vérifie qu'une liste de tranches est ordonnée, sans trou ni chevauchement. */
export function erreursTranches(tranches: Tranche[], prefixe = ""): string[] {
  const e: string[] = [];
  if (tranches.length === 0) return [`${prefixe}aucune tranche`];
  if (tranches[0].de !== 0) e.push(`${prefixe}la première tranche doit commencer à 0`);
  tranches.forEach((t, i) => {
    const nom = `${prefixe}tranche ${i + 1}`;
    if (!estNombre(t.de)) e.push(`${nom} : « de » manquant`);
    const derniere = i === tranches.length - 1;
    if (derniere && t.a !== null) e.push(`${nom} : la dernière tranche doit être sans limite haute (a = null)`);
    if (!derniere && !estNombre(t.a)) e.push(`${nom} : seule la dernière tranche peut être sans limite haute`);
    if (estNombre(t.a) && t.a <= t.de) e.push(`${nom} : la borne haute (${t.a}) doit dépasser la borne basse (${t.de})`);
    if (i > 0) {
      const prec = tranches[i - 1].a;
      if (prec !== t.de) e.push(`${nom} : commence à ${t.de} alors que la précédente finit à ${prec} (trou ou chevauchement)`);
    }
    const modes = [t.tarif, t.tarifs_par_nb_enfants, t.formule, t.interpolation, t.fourchette].filter((x) => x !== undefined);
    if (modes.length !== 1) e.push(`${nom} : il faut exactement un tarif (tarif, tarifs_par_nb_enfants, formule, interpolation ou fourchette)`);
    const valeurs = [t.tarif, ...(t.tarifs_par_nb_enfants ?? []), ...(t.interpolation ?? []), ...(t.fourchette ?? [])].filter((x) => x !== undefined);
    if (valeurs.some((v) => !estNombre(v) || v < 0)) e.push(`${nom} : tarif négatif ou invalide`);
    if (t.fourchette && t.fourchette[0] > t.fourchette[1]) e.push(`${nom} : fourchette inversée`);
    if (t.formule && (!estNombre(t.formule.x0) || !t.formule.coef.every(estNombre))) e.push(`${nom} : formule invalide`);
  });
  return e;
}

function erreursPrestation(cle: string, p: Prestation): string[] {
  const e: string[] = [];
  if (!p || typeof p !== "object") return [`${cle} : prestation manquante`];
  if (!p.libelle) e.push(`${cle} : libellé manquant`);
  if (!UNITES.includes(p.unite)) e.push(`${cle} : unité inconnue « ${p.unite} »`);
  if (!["ok", "fourchette", "A_VERIFIER"].includes(p.statut)) e.push(`${cle} : statut inconnu`);
  if (p.unite === "psu" || p.statut === "A_VERIFIER") return e;
  e.push(...erreursTranches(p.tranches, `${cle}, `));
  if (p.source !== undefined && !estUrl(p.source)) e.push(`${cle} : source invalide`);
  return e;
}

/** Liste des problèmes d'une grille ; tableau vide si elle est valide. */
export function validerGrille(g: Grille): string[] {
  const e: string[] = [];
  if (!/^(\d{5}|2[AB]\d{3})$/.test(g.code_insee ?? "")) e.push("code INSEE invalide (5 caractères)");
  if (!g.commune) e.push("nom de commune manquant");
  if (!estUrl(g.source)) e.push("source manquante ou invalide (URL)");
  if (!estDate(g.verifie_le)) e.push("verifie_le manquant (format AAAA-MM-JJ)");
  if (!BASES.includes(g.base_calcul)) e.push("base_calcul inconnue");
  if (!g.prestations) return [...e, "prestations manquantes"];
  for (const cle of CLES_PRESTATIONS) e.push(...erreursPrestation(cle, g.prestations[cle]));
  return e;
}
