import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Décodeur de courrier administratif",
  description:
    "Comprendre un courrier de la CAF, des impôts, de l'URSSAF, de France Travail, de l'ANTAI, d'un commissaire de justice, d'un bailleur, d'une banque ou d'une assurance, connaître le délai et préparer la réponse. Tout reste dans votre navigateur.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
