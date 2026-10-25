import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mes délais : les échéances qu'on oublie",
  description:
    "Contrôle technique, carte d'identité, impôts, bail, assurances : calculez vos échéances et recevez des rappels dans votre agenda. Données gardées dans votre navigateur.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
