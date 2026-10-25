import { describe, expect, it } from "vitest";
import { avertissements, lignesIndicateurs } from "../src/lib/comparaison.ts";
import { assembler } from "../src/lib/import/assembler.ts";
import { attendu, indicateursPrincipaux, phraseIps, phraseVa, SEUIL_POINTS, signe, verdictVa } from "../src/lib/interpretation.ts";
import { CRITERES, redigerLettre } from "../src/lib/lettre.ts";
import { basculer, lireSelection, MAX_COMPARAISON } from "../src/lib/selection.ts";
import { echantillon } from "./aide.ts";

const { etablissements } = assembler(echantillon);

describe("valeur ajoutée en langage clair", () => {
  it("verdict selon le seuil", () => {
    expect(verdictVa(SEUIL_POINTS)).toBe("mieux");
    expect(verdictVa(-SEUIL_POINTS)).toBe("moins_bien");
    expect(verdictVa(0)).toBe("conforme");
    expect(verdictVa(null)).toBe("inconnu");
  });
  it("taux attendu = taux − VA", () => {
    expect(attendu(90, 5)).toBe(85);
    expect(attendu(90, null)).toBeNull();
  });
  it("phrase complète, qui avertit quand la VA manque", () => {
    expect(phraseVa(95, 6, "Réussite au bac")).toBe(
      "Réussite au bac : 95 %, pour 89 % attendus vu le profil des élèves (+6 pt) : l'établissement fait mieux que ce que son public laisserait attendre.",
    );
    expect(phraseVa(95, null, "Réussite")).toContain("ne dit rien");
    expect(signe(-2)).toBe("−2");
  });
  it("IPS comparé au département", () => {
    const ref = { departement: 100, academie: 100, national: 103 };
    expect(phraseIps({ rentree: "2025-2026", valeur: 125, ecartType: null, reference: ref })).toContain("plus favorisé");
    expect(phraseIps({ rentree: "2025-2026", valeur: 80, ecartType: null, reference: ref })).toContain("moins favorisé");
    expect(phraseIps(null)).toContain("non publié");
  });
  it("chaque indicateur principal porte sa valeur ajoutée", () => {
    const lycee = etablissements.find((e) => e.nom === "Lycée Henri Poincaré")!;
    const ind = indicateursPrincipaux(lycee);
    expect(ind.length).toBeGreaterThan(0);
    expect(ind.every((i) => "va" in i)).toBe(true);
    const ecole = etablissements.find((e) => e.niveau === "ecole")!;
    expect(indicateursPrincipaux(ecole)).toEqual([]);
  });
});

describe("comparaison", () => {
  const lycees = etablissements.filter((e) => e.niveau === "lycee" && e.bac.length).slice(0, 2);
  it("aligne les indicateurs de deux lycées", () => {
    const l = lignesIndicateurs(lycees);
    expect(l.length).toBeGreaterThan(0);
    expect(l.every((x) => x.valeurs.length === 2)).toBe(true);
  });
  it("avertit quand les niveaux diffèrent", () => {
    const college = etablissements.find((e) => e.niveau === "college")!;
    expect(avertissements([lycees[0], college]).join(" ")).toContain("niveaux différents");
  });
  it("limite la sélection à 4, en mémoire du navigateur", () => {
    const m = new Map<string, string>();
    const stockage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as Storage;
    for (const u of ["A", "B", "C", "D"]) expect(basculer(u, stockage).refuse).toBe(false);
    expect(basculer("E", stockage)).toEqual({ liste: ["A", "B", "C", "D"], refuse: true });
    expect(basculer("B", stockage).liste).toEqual(["A", "C", "D"]);
    expect(lireSelection(stockage)).toHaveLength(MAX_COMPARAISON - 1);
    expect(lireSelection({ getItem: () => "pas du json" })).toEqual([]);
  });
});

describe("lettre de dérogation", () => {
  it("reprend les motifs et les pièces, et laisse des pointillés pour les vides", () => {
    const l = redigerLettre({
      parent: "Camille Martin",
      adresse: "1 place Stanislas 54000 Nancy",
      enfant: "Léa Martin",
      dateNaissance: "",
      classeRentree: "6e",
      ecoleActuelle: "école Charles III",
      collegeSecteur: "Collège Guynemer",
      collegeDemande: "Collège Jean Lamour",
      motifs: ["fratrie"],
      precisions: "",
      ville: "Nancy",
      date: "",
    }).join("\n");
    expect(l).toContain("Léa Martin, né(e) le …………");
    expect(l).toContain(CRITERES.find((c) => c.code === "fratrie")!.libelle.toLowerCase());
    expect(l).toContain("Certificat de scolarité");
    expect(l).toContain("Collège Guynemer");
  });
});
