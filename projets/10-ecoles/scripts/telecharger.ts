// Étape 1 de l'import : téléchargement des jeux bruts dans scripts/brut/<code3>/<cle>.json.
// Usage : npm run donnees:telecharger [-- 54 75]   (sans argument : tous les départements de config.ts)
// Derrière un proxy d'entreprise : NODE_USE_ENV_PROXY=1 (Node ≥ 22.21) est positionné par le script npm.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_API, DEPARTEMENTS, JEUX, type Departement, type Jeu } from "./config.ts";

const ICI = dirname(fileURLToPath(import.meta.url));
const BRUT = join(ICI, "brut");
const forcer = process.argv.includes("--forcer");
const seulJeu = process.argv.find((a) => a.startsWith("--jeu="))?.slice(6);

export function urlExport(jeu: Jeu, dep: Departement | null): string {
  const p = new URLSearchParams();
  const where = dep ? jeu.where(dep) : "";
  if (where) p.set("where", where);
  if (jeu.select) p.set("select", jeu.select);
  return `${BASE_API}/${jeu.id}/exports/json?${p}`;
}

async function telechargerAvecReessais(url: string, essais = 40): Promise<unknown> {
  let derniere: unknown;
  for (let i = 1; i <= essais; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Requête refusée (${res.status}) : ${(await res.text()).slice(0, 300)}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      derniere = e;
      if (e instanceof Error && e.message.startsWith("Requête refusée")) throw e;
      await new Promise((r) => setTimeout(r, 1000 + 500 * i));
    }
  }
  throw derniere;
}

async function main() {
  const codes = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const deps = codes.length ? DEPARTEMENTS.filter((d) => codes.includes(d.code)) : DEPARTEMENTS;
  const taches: { jeu: Jeu; dep: Departement | null; fichier: string }[] = [];
  for (const jeu of JEUX.filter((j) => !seulJeu || j.cle === seulJeu)) {
    if (jeu.national) taches.push({ jeu, dep: null, fichier: join(BRUT, "national", `${jeu.cle}.json`) });
    else for (const dep of deps) taches.push({ jeu, dep, fichier: join(BRUT, dep.code3, `${jeu.cle}.json`) });
  }
  let echecs = 0;
  // 3 téléchargements en parallèle : assez pour aller vite, pas assez pour surcharger l'API publique.
  const file = [...taches];
  await Promise.all(
    [0, 1, 2].map(async () => {
      for (let t = file.shift(); t; t = file.shift()) {
        if (existsSync(t.fichier) && !forcer) continue;
        try {
          const lignes = await telechargerAvecReessais(urlExport(t.jeu, t.dep));
          mkdirSync(dirname(t.fichier), { recursive: true });
          writeFileSync(t.fichier, JSON.stringify({ telecharge_le: new Date().toISOString(), lignes }));
          console.log(`✔ ${t.dep?.code ?? "national"} ${t.jeu.cle} : ${(lignes as unknown[]).length} lignes`);
        } catch (e) {
          echecs++;
          console.error(`✘ ${t.dep?.code ?? "national"} ${t.jeu.cle} : ${e instanceof Error ? e.message : e}`);
        }
      }
    }),
  );
  if (echecs) {
    console.error(`${echecs} téléchargement(s) en échec : relancer la commande (les fichiers déjà obtenus sont conservés).`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) void main();
