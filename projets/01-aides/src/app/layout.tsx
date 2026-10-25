import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulateur d'aides unifié — Vie FR",
  description:
    "Estimez en 5 minutes vos droits aux principales aides (APL, prime d'activité, RSA, allocations familiales, chèque énergie, CSS…). Calcul dans votre navigateur, aucune donnée envoyée.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
