// Liste des établissements à comparer (4 au maximum), gardée dans le navigateur (localStorage).
export const MAX_COMPARAISON = 4;
const CLE = "10-ecoles:comparaison";

export function lireSelection(stockage: Pick<Storage, "getItem"> | null = navigateur()): string[] {
  try {
    const v = JSON.parse(stockage?.getItem(CLE) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_COMPARAISON) : [];
  } catch {
    return [];
  }
}

function ecrire(liste: string[], stockage: Pick<Storage, "setItem"> | null) {
  try {
    stockage?.setItem(CLE, JSON.stringify(liste));
  } catch {
    /* stockage indisponible (navigation privée) : la sélection n'est pas mémorisée */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("selection-modifiee"));
}

/** Ajoute ou retire un UAI. Renvoie la nouvelle liste ; refuse d'ajouter au-delà de 4. */
export function basculer(uai: string, stockage: Storage | null = navigateur()): { liste: string[]; refuse: boolean } {
  const liste = lireSelection(stockage);
  if (liste.includes(uai)) {
    const nouvelle = liste.filter((u) => u !== uai);
    ecrire(nouvelle, stockage);
    return { liste: nouvelle, refuse: false };
  }
  if (liste.length >= MAX_COMPARAISON) return { liste, refuse: true };
  const nouvelle = [...liste, uai];
  ecrire(nouvelle, stockage);
  return { liste: nouvelle, refuse: false };
}

export function remplacerSelection(liste: string[], stockage: Storage | null = navigateur()) {
  ecrire([...new Set(liste)].slice(0, MAX_COMPARAISON), stockage);
}

function navigateur(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
