// Lettre type de demande de dérogation à la carte scolaire (collège public).
import derogations from "../../data/derogations.json";

export type DemandeDerogation = {
  parent: string;
  adresse: string;
  enfant: string;
  dateNaissance: string;
  classeRentree: string;
  ecoleActuelle: string;
  collegeSecteur: string;
  collegeDemande: string;
  motifs: string[];
  precisions: string;
  ville: string;
  date: string;
};

export const CRITERES = derogations.criteres;

/** Texte de la lettre, en paragraphes. Les champs vides sont remplacés par des pointillés à compléter à la main. */
export function redigerLettre(d: DemandeDerogation): string[] {
  const v = (s: string) => (s.trim() ? s.trim() : "…………………………");
  const motifs = CRITERES.filter((c) => d.motifs.includes(c.code));
  const pieces = motifs.map((c) => c.justificatif);
  return [
    `${v(d.parent)}\n${v(d.adresse)}`,
    `À l'attention de Madame ou Monsieur le directeur académique des services de l'Éducation nationale`,
    `${v(d.ville)}, le ${v(d.date)}`,
    `Objet : demande de dérogation à la carte scolaire pour l'entrée en ${v(d.classeRentree)}`,
    `Madame, Monsieur,`,
    `Je sollicite une dérogation à la carte scolaire pour mon enfant ${v(d.enfant)}, né(e) le ${v(d.dateNaissance)}, actuellement scolarisé(e) à ${v(d.ecoleActuelle)}. Son collège de secteur est ${v(d.collegeSecteur)} ; je souhaite son inscription au ${v(d.collegeDemande)}.`,
    motifs.length
      ? `Ma demande repose sur ${motifs.length > 1 ? "les motifs suivants" : "le motif suivant"} : ${motifs.map((c) => c.libelle.toLowerCase()).join(" ; ")}.`
      : `Ma demande repose sur le motif suivant : …………………………`,
    d.precisions.trim() ? d.precisions.trim() : "",
    pieces.length ? `Vous trouverez ci-joint : ${pieces.join(" ; ")}.` : "",
    `Je vous remercie par avance de l'attention que vous porterez à cette demande et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`,
    `Signature :`,
  ].filter(Boolean);
}
