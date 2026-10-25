import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vie-fr/ui", "@vie-fr/fr-data"],
  webpack: (config) => {
    // Modèles de lettres data/lettres/*.md importés comme texte brut.
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
