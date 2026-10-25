// Étape 2 de l'import : nettoyage + jointure → public/donnees/<code3>/etablissements.json et secteurs.json,
// plus public/donnees/index.json (liste des départements disponibles). Fichiers chargés à la demande par l'appli.
// Usage : npm run donnees:construire
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEPARTEMENTS, JEUX, pageJeu } from "./config.ts";
import { assembler, SEUIL_PERTE, type Brut } from "../src/lib/import/assembler.ts";
import { lireCarteScolaire } from "../src/lib/import/secteurs.ts";
import type { FichierDepartement, IndexDepartement, IndexDonnees, SourceImport } from "../src/lib/types.ts";

const ICI = dirname(fileURLToPath(import.meta.url));
const BRUT = join(ICI, "brut");
const SORTIE = join(ICI, "..", "public", "donnees");

type FichierBrut = { telecharge_le: string; lignes: Record<string, unknown>[] };

function lire(dossier: string, cle: string): FichierBrut | null {
  const f = join(BRUT, dossier, `${cle}.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as FichierBrut) : null;
}

function ecrire(chemin: string, donnees: unknown) {
  mkdirSync(dirname(chemin), { recursive: true });
  const texte = JSON.stringify(donnees);
  writeFileSync(chemin, texte);
  return texte.length;
}

const index: IndexDepartement[] = [];
const national = lire("national", "sections_internationales");

for (const dep of DEPARTEMENTS) {
  const annuaire = lire(dep.code3, "annuaire");
  if (!annuaire) {
    console.warn(`⚠ ${dep.code} : annuaire absent, département ignoré (lancer d'abord donnees:telecharger).`);
    continue;
  }
  const brut: Record<string, Record<string, unknown>[]> = {};
  const sources: SourceImport[] = [];
  for (const jeu of JEUX) {
    if (jeu.cle === "carte_scolaire") continue;
    const f = jeu.national ? national : lire(dep.code3, jeu.cle);
    if (!f) continue;
    brut[jeu.cle] = f.lignes;
    sources.push({ cle: jeu.cle, titre: jeu.titre, url: pageJeu(jeu.id), telecharge_le: f.telecharge_le.slice(0, 10), lignes: f.lignes.length });
  }
  const { etablissements, jointures } = assembler(brut as Brut, (uai) => uai.startsWith(dep.prefixeUai));
  const fichier: FichierDepartement = {
    departement: { code: dep.code, code3: dep.code3, nom: dep.nom },
    genere_le: new Date().toISOString().slice(0, 10),
    sources,
    jointures: jointures.map((j) => ({ ...j, absents: j.absents.slice(0, 50) })),
    etablissements,
  };
  const taille = ecrire(join(SORTIE, dep.code3, "etablissements.json"), fichier);

  const carte = lire(dep.code3, "carte_scolaire");
  const jeuCarte = JEUX.find((j) => j.cle === "carte_scolaire")!;
  const avecCarte = !!carte && carte.lignes.length > 0;
  let tailleSecteurs = 0;
  if (avecCarte) {
    tailleSecteurs = ecrire(
      join(SORTIE, dep.code3, "secteurs.json"),
      lireCarteScolaire(carte.lignes, {
        departement: dep.code,
        source: { titre: jeuCarte.titre, url: pageJeu(jeuCarte.id), telecharge_le: carte.telecharge_le.slice(0, 10) },
      }),
    );
  }
  const n = etablissements.length;
  index.push({
    code: dep.code,
    code3: dep.code3,
    nom: dep.nom,
    prefixeUai: dep.prefixeUai,
    etablissements: n,
    carteScolaireColleges: avecCarte,
    centre: [
      Math.round((etablissements.reduce((s, e) => s + e.lat, 0) / n) * 1e4) / 1e4,
      Math.round((etablissements.reduce((s, e) => s + e.lon, 0) / n) * 1e4) / 1e4,
    ],
  });
  console.log(
    `✔ ${dep.code} ${dep.nom} : ${n} établissements (${(taille / 1e6).toFixed(2)} Mo)` +
      (avecCarte ? `, carte scolaire ${(tailleSecteurs / 1e6).toFixed(2)} Mo` : ", pas de carte scolaire publiée"),
  );
  for (const j of jointures) {
    const alerte = j.perte > SEUIL_PERTE ? "  ⚠ perte > 5 %" : "";
    console.log(`    jointure ${j.jeu} : ${j.uaiRetrouvesDansAnnuaire}/${j.uaiDansLeJeu} (perte ${(j.perte * 100).toFixed(1)} %)${alerte}`);
  }
}

const sortie: IndexDonnees = { genere_le: new Date().toISOString().slice(0, 10), departements: index };
ecrire(join(SORTIE, "index.json"), sortie);
console.log(`Index écrit : ${index.length} département(s).`);
