import type { NextConfig } from "next";

// Export statique optionnel (tableau de bord de démonstration) : VIEFR_EXPORT=1 VIEFR_BASE_PATH=/<dossier>.
const exportStatique = process.env.VIEFR_EXPORT === "1";
const basePath = process.env.VIEFR_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  transpilePackages: ["@vie-fr/ui", "@vie-fr/fr-data"],
  ...(exportStatique
    ? { output: "export", basePath, images: { unoptimized: true }, env: { NEXT_PUBLIC_BASE_PATH: basePath } }
    : {}),
};

export default nextConfig;
