import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparateur de coûts selon le quotient familial",
  description: "Quotient familial CAF, coût annuel de la cantine, du périscolaire et de la crèche, comparaison entre communes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
