import type { Metadata } from "next";
import { OutilsRappels } from "@/components/OutilsRappels";
import { Page } from "@/components/Page";

export const metadata: Metadata = { title: "Rappels et sauvegarde — Mes délais" };

export default function PageRappels() {
  return (
    <Page actif="/rappels" titre="Rappels et sauvegarde">
      <OutilsRappels />
    </Page>
  );
}
