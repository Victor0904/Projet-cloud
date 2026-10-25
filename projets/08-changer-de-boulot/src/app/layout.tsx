import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Et si je change de boulot ? — comparateur de rémunération réelle",
  description:
    "Comparez CDI, micro-entreprise, portage salarial ou société : net après impôt, frais professionnels, temps de trajet et salaire horaire réel. Calcul local, sans envoi de données.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
