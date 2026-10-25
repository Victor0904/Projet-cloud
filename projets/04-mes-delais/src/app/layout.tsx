import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mes délais : les échéances qu'on oublie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
