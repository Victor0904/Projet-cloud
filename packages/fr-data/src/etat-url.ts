// État de l'appli dans l'URL (#...), pour partager sans serveur. JSON → UTF-8 → base64url.

export function encoderEtat(etat: unknown): string {
  const octets = new TextEncoder().encode(JSON.stringify(etat));
  let bin = "";
  for (const o of octets) bin += String.fromCharCode(o);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Renvoie null si la chaîne est vide ou corrompue (lien tronqué, copié à moitié…). */
export function decoderEtat<T>(s: string): T | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as T;
  } catch {
    return null;
  }
}
