// Extraction du texte d'un PDF dans le navigateur avec pdfjs-dist (aucun envoi réseau).
// Pas d'OCR : un PDF scanné (image) ne contient pas de texte exploitable.

type ItemTexte = { str: string; hasEOL?: boolean };

/** `workerSrc` n'est à fournir que hors navigateur (tests) ; dans l'application, webpack résout l'URL du worker. */
export async function extraireTextePdf(fichier: File, workerSrc?: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc =
    workerSrc ?? new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const contenu = await page.getTextContent();
    let texte = "";
    for (const it of contenu.items as ItemTexte[]) {
      if (typeof it.str !== "string") continue;
      texte += it.str + (it.hasEOL ? "\n" : " ");
    }
    pages.push(texte.replace(/[ \t]+\n/g, "\n").trim());
  }
  await doc.destroy();
  return pages.join("\n\n");
}
