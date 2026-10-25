import type { Metadata } from "next";
import { Foyer } from "@/components/Foyer";
import { Page } from "@/components/Page";

export const metadata: Metadata = { title: "Mon foyer — Mes délais" };

export default function PageFoyer() {
  return (
    <Page actif="/foyer" titre="Mon foyer">
      <Foyer />
    </Page>
  );
}
