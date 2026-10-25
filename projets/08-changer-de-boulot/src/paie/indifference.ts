// Point d'indifférence : montant (brut annuel ou TJM) à partir duquel le scénario B rapporte autant que A.
import { TAUX, type Taux2026 } from "./taux";
import { avecMontant, calculerScenario, montantPrincipal, type Contexte, type Resultat, type Scenario } from "./scenario";

export type Indicateur = "resteAnnuel" | "netApresImpotAnnuel";

export interface PointIndifference {
  /** Montant de B qui égale A, ou null si introuvable dans la plage explorée. */
  montant: number | null;
  unite: "brut" | "tjm";
  /** Chiffre d'affaires annuel correspondant (indépendants). */
  chiffreAffaires: number | null;
  cible: number;
}

export function pointIndifference(
  a: Scenario,
  b: Scenario,
  ctx: Contexte,
  indicateur: Indicateur = "resteAnnuel",
  t: Taux2026 = TAUX,
  resultatA?: Resultat,
): PointIndifference {
  const cible = (resultatA ?? calculerScenario(a, ctx, t))[indicateur];
  const { unite, valeur } = montantPrincipal(b);
  const f = (x: number) => calculerScenario(avecMontant(b, x), ctx, t)[indicateur] - cible;
  const max = Math.max(valeur * 4, unite === "brut" ? 300000 : 2500);
  const pas = 80;
  let bas = 0;
  let fBas = f(0);
  let trouve = fBas >= 0;
  if (trouve) return { montant: 0, unite, chiffreAffaires: unite === "tjm" ? 0 : null, cible };
  let haut = 0;
  for (let i = 1; i <= pas; i++) {
    const x = (max * i) / pas;
    const fx = f(x);
    if (fx >= 0) {
      haut = x;
      trouve = true;
      break;
    }
    bas = x;
    fBas = fx;
  }
  if (!trouve) return { montant: null, unite, chiffreAffaires: null, cible };
  for (let i = 0; i < 30 && haut - bas > 0.5; i++) {
    const m = (bas + haut) / 2;
    if (f(m) >= 0) haut = m;
    else bas = m;
  }
  const montant = Math.ceil(haut);
  return {
    montant,
    unite,
    chiffreAffaires: unite === "tjm" ? montant * Math.max(b.joursFactures, 0) : null,
    cible,
  };
}
