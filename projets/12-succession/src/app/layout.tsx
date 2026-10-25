import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Après un décès : l'assistant des démarches",
  description:
    "Plan personnalisé des démarches après un décès, avec les dates limites, les organismes à prévenir et les courriers préremplis. Vos données restent sur votre appareil.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
