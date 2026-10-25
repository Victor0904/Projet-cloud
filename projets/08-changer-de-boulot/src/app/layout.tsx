import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Et si je change de boulot ? (comparateur de rémunération réelle)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
