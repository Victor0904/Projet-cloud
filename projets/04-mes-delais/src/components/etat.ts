"use client";

// Petit magasin d'état côté client : localStorage + abonnement (synchronisé entre onglets).
import { useSyncExternalStore } from "react";
import { aujourdhui } from "@/lib/dates";
import { CLE_STOCKAGE, chargerLocal, sauverLocal } from "@/lib/stockage";
import type { Etat } from "@/lib/types";

let cache: Etat | null = null;
const abonnes = new Set<() => void>();

function lire(): Etat {
  if (cache === null) cache = chargerLocal();
  return cache;
}

function abonner(cb: () => void) {
  abonnes.add(cb);
  const surStockage = (ev: StorageEvent) => {
    if (ev.key === CLE_STOCKAGE) {
      cache = chargerLocal();
      cb();
    }
  };
  window.addEventListener("storage", surStockage);
  return () => {
    abonnes.delete(cb);
    window.removeEventListener("storage", surStockage);
  };
}

/** Modifie l'état et l'enregistre. Renvoie false si le navigateur refuse l'enregistrement. */
export function modifierEtat(f: (e: Etat) => Etat): boolean {
  cache = f(lire());
  const ok = sauverLocal(cache);
  abonnes.forEach((a) => a());
  return ok;
}

/** null pendant le rendu serveur / avant hydratation. */
export function useEtat(): Etat | null {
  return useSyncExternalStore(abonner, lire, () => null);
}

const rien = () => () => {};

/** Date du jour côté client (null au rendu serveur, pour éviter un décalage d'hydratation). */
export function useAujourdhui(): string | null {
  return useSyncExternalStore(rien, aujourdhui, () => null);
}

export function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
