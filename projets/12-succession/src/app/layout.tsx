import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Après un décès : l'assistant des démarches",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
