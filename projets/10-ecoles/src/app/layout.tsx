import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparateur d'écoles, collèges et lycées",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
