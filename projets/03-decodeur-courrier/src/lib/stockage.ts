// localStorage protégé : navigation privée ou stockage bloqué ne doivent pas casser la page.

export function lire<T>(cle: string, defaut: T): T {
  try {
    const v = window.localStorage.getItem(cle);
    return v ? (JSON.parse(v) as T) : defaut;
  } catch {
    return defaut;
  }
}

export function ecrire(cle: string, valeur: unknown): void {
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage indisponible : on continue sans mémoriser
  }
}

export function effacer(cle: string): void {
  try {
    window.localStorage.removeItem(cle);
  } catch {
    // idem
  }
}

/** Propose le téléchargement d'un fichier généré localement. */
export function telecharger(nom: string, contenu: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
