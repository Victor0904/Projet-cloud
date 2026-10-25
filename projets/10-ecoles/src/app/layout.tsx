import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparateur d'écoles, collèges et lycées",
  description:
    "Trouver les établissements autour d'une adresse, connaître son collège de secteur et comparer des établissements avec des indicateurs expliqués (valeur ajoutée, IPS).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
