// Règles de lecture d'une comparaison (pure, testée).
import type { Etablissement } from "./types";
import { dernier, indicateursPrincipaux, SEUIL_IPS, type IndicateurPrincipal } from "./interpretation";

/** Mises en garde à afficher au-dessus du tableau. */
export function avertissements(etabs: Etablissement[]): string[] {
  const a: string[] = [];
  const niveaux = new Set(etabs.map((e) => e.niveau));
  if (niveaux.size > 1) a.push("Vous comparez des établissements de niveaux différents : leurs indicateurs ne sont pas comparables entre eux.");
  const ips = etabs.map((e) => dernier(e.ips)?.valeur).filter((v): v is number => v !== undefined);
  if (ips.length > 1 && Math.max(...ips) - Math.min(...ips) >= SEUIL_IPS) {
    a.push(
      "Les publics accueillis sont très différents (écart d'IPS important) : comparez la valeur ajoutée plutôt que le taux de réussite brut.",
    );
  }
  if (etabs.some((e) => e.statut === "prive") && etabs.some((e) => e.statut === "public")) {
    a.push("Public et privé ne recrutent pas de la même façon (le privé peut choisir ses élèves) : la valeur ajoutée en tient compte en partie seulement.");
  }
  return a;
}

/** Libellés de tous les indicateurs présents, dans l'ordre, pour aligner les lignes du tableau. */
export function lignesIndicateurs(etabs: Etablissement[]): { libelle: string; valeurs: (IndicateurPrincipal | null)[] }[] {
  const parEtab = etabs.map(indicateursPrincipaux);
  const libelles = [...new Set(parEtab.flat().map((i) => i.libelle))];
  return libelles.map((libelle) => ({ libelle, valeurs: parEtab.map((l) => l.find((i) => i.libelle === libelle) ?? null) }));
}
