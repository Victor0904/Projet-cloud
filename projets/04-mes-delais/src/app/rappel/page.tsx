import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/Page";
import { Rappel } from "@/components/Rappel";
import { Chargement } from "@/components/ui";

export const metadata: Metadata = { title: "Mon lien de rappel — Mes délais" };

export default function PageRappel() {
  return (
    <Page actif="/rappel" titre="Mon lien de rappel">
      <Suspense fallback={<Chargement />}>
        <Rappel />
      </Suspense>
    </Page>
  );
}
