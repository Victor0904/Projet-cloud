#!/usr/bin/env bash
# Exporte les 8 applications en statique et les rassemble dans un seul dossier publiable (tableau de bord de démonstration).
# Usage : outils/demo/construire.sh <dossier de sortie>
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
sortie="$(mkdir -p "$1" && cd "$1" && pwd)"
rm -rf "${sortie:?}"/*
for dossier in "$racine"/projets/*/; do
  app="$(basename "$dossier")"
  echo "== $app"
  (cd "$dossier" && rm -rf out && VIEFR_EXPORT=1 VIEFR_BASE_PATH="/$app" npx next build > /dev/null)
  python3 -I "$racine/outils/demo/relocaliser.py" "$dossier/out" "$app" "$sortie/$app"
  rm -rf "$dossier/out"
done
cp "$racine/outils/demo/tableau-de-bord.html" "$sortie/index.html"
{ printf 'window.__VIEFR_GEO__='; cat "$racine/outils/demo/geocodage-demo.json"; printf ';\n'; cat "$racine/outils/demo/demo-hors-ligne.js"; } > "$sortie/demo-hors-ligne.js"
echo "Prêt : $sortie ($(find "$sortie" -type f | wc -l) fichiers, $(du -sh "$sortie" | cut -f1))"
