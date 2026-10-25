import type { Metadata } from "next";
import { Suspense } from "react";
import { Assistant } from "@/components/Assistant";
import { Page } from "@/components/Page";
import { Chargement } from "@/components/ui";

export const metadata: Metadata = { title: "Ajouter une échéance — Mes délais" };

export default function Ajouter() {
  return (
    <Page actif="/ajouter">
      <Suspense fallback={<Chargement />}>
        <Assistant />
      </Suspense>
    </Page>
  );
}
