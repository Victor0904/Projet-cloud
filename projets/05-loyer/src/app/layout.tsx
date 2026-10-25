import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mon loyer est-il trop cher ? — Encadrement des loyers",
  description:
    "Vérifiez si votre loyer dépasse le plafond de l'encadrement (Paris, Lyon, Lille, Montpellier, Bordeaux, Plaine Commune, Est Ensemble) et générez la lettre de mise en demeure.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
