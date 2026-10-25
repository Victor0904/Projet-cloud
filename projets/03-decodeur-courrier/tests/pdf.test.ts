import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { extraireTextePdf } from "@/lib/pdf";
import { decoder } from "@/decodeur";

describe("import PDF (pdfjs-dist)", () => {
  it("extrait le texte d'un PDF puis le décode", async () => {
    const octets = readFileSync(join(__dirname, "fixtures", "caf-indu.pdf"));
    const fichier = new File([octets], "caf-indu.pdf", { type: "application/pdf" });
    const worker = pathToFileURL(createRequire(import.meta.url).resolve("pdfjs-dist/build/pdf.worker.min.mjs")).href;
    const texte = await extraireTextePdf(fichier, worker);
    expect(texte).toContain("Notification d'indu");
    const { classification, extraction } = decoder(texte);
    expect(classification.meilleur?.type.id).toBe("caf-indu");
    expect(extraction.montantPrincipal?.valeur).toBe(742.18);
  });
});
