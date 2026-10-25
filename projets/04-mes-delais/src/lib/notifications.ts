// Notifications navigateur : vérification au chargement de la page, au plus une fois par jour.
import { ecartJours, type Iso } from "./dates";
import type { Ligne } from "./vue";

export const CLE_DERNIERE_NOTIF = "vie-fr:mes-delais:derniere-notification";
export const SEUIL_NOTIF_JOURS = 7;

/** Échéances qui justifient une notification : en retard, dépassées ou dans les 7 jours. */
export function aNotifier(ls: Ligne[], auj: Iso): Ligne[] {
  return ls.filter(
    (l) =>
      l.res.date &&
      (l.res.statut === "en_retard" ||
        (l.res.statut === "a_venir" && ecartJours(auj, l.res.date) <= SEUIL_NOTIF_JOURS)),
  );
}

export function texteNotification(ls: Ligne[], auj: Iso): { titre: string; corps: string } | null {
  if (ls.length === 0) return null;
  const elems = ls.slice(0, 4).map((l) => {
    if (l.res.statut === "en_retard") return `• ${l.titre} : en retard`;
    const j = ecartJours(auj, l.res.date!);
    return `• ${l.titre} : ${j === 0 ? "aujourd'hui" : `dans ${j} j`}`;
  });
  if (ls.length > 4) elems.push(`… et ${ls.length - 4} autre(s)`);
  return {
    titre: ls.length === 1 ? "Mes délais : 1 échéance proche" : `Mes délais : ${ls.length} échéances proches`,
    corps: elems.join("\n"),
  };
}

/** À appeler au chargement : affiche la notification si l'utilisateur l'a autorisée. */
export function verifierEtNotifier(ls: Ligne[], auj: Iso): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    if (localStorage.getItem(CLE_DERNIERE_NOTIF) === auj) return;
    const t = texteNotification(aNotifier(ls, auj), auj);
    if (!t) return;
    new Notification(t.titre, { body: t.corps, tag: "mes-delais" });
    localStorage.setItem(CLE_DERNIERE_NOTIF, auj);
  } catch {
    // Certains navigateurs mobiles refusent `new Notification` hors service worker : on ignore.
  }
}
