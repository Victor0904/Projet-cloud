import { euros } from "@vie-fr/fr-data";
import type { Resultat } from "@/paie/scenario";

const SERIES: { cle: "netMensuel" | "netApresImpotMensuel" | "resteMensuel"; libelle: string; classe: string }[] = [
  { cle: "netMensuel", libelle: "Net avant impôt", classe: "fill-blue-200" },
  { cle: "netApresImpotMensuel", libelle: "Net après impôt", classe: "fill-blue-500" },
  { cle: "resteMensuel", libelle: "Reste après frais pro", classe: "fill-blue-900" },
];

/** Barres horizontales simples en SVG (aucune bibliothèque). Les mêmes chiffres sont dans le tableau. */
export function Graphique({ resultats }: { resultats: Resultat[] }) {
  const max = Math.max(1, ...resultats.flatMap((r) => SERIES.map((s) => r[s.cle])));
  const hBarre = 16;
  const hGroupe = SERIES.length * (hBarre + 4) + 28;
  const largeur = 640;
  const gauche = 8;
  const zone = largeur - gauche - 110;
  const hauteur = resultats.length * hGroupe + 30;
  return (
    <figure className="my-6 break-inside-avoid">
      <figcaption className="mb-2 font-bold">Par mois, en moyenne sur l&apos;année</figcaption>
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="h-auto w-full"
        role="img"
        aria-label={resultats
          .map((r) => `${r.nom} : reste après frais ${euros(r.resteMensuel, true)} par mois`)
          .join(" ; ")}
      >
        {resultats.map((r, i) => {
          const y0 = i * hGroupe;
          return (
            <g key={i}>
              <text x={gauche} y={y0 + 14} className="fill-gray-900 text-[13px] font-bold">
                {r.nom}
              </text>
              {SERIES.map((s, j) => {
                const v = Math.max(r[s.cle], 0);
                const w = (v / max) * zone;
                const y = y0 + 22 + j * (hBarre + 4);
                return (
                  <g key={s.cle}>
                    <rect x={gauche} y={y} width={w} height={hBarre} className={s.classe} />
                    <text x={gauche + w + 6} y={y + 12} className="fill-gray-800 text-[12px]">
                      {euros(r[s.cle], true)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <g transform={`translate(${gauche}, ${hauteur - 12})`}>
          {SERIES.map((s, j) => (
            <g key={s.cle} transform={`translate(${j * 190}, 0)`}>
              <rect x={0} y={-10} width={12} height={12} className={s.classe} />
              <text x={18} y={0} className="fill-gray-800 text-[12px]">
                {s.libelle}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </figure>
  );
}
