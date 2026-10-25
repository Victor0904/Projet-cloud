// Lettre de mise en demeure au bailleur (texte généré, aucune donnée envoyée).
import { dateLongue, euros } from "@vie-fr/fr-data";

export type DonneesLettre = {
  locataireNom: string;
  locataireAdresse: string;
  bailleurNom: string;
  bailleurAdresse: string;
  adresseLogement: string;
  ville: string;
  dateSignature: string;
  dateLettre: string;
  surface: number;
  loyerBase: number;
  plafond: number;
  /** Loyer hors charges demandé : le plus bas entre le loyer de base et le plafond. */
  loyerDemande: number;
  loyerReferenceMajoreM2: number;
  depassementMensuel: number;
  complement: number;
  complementContestable: boolean;
  raisonsComplement: string[];
  tropPercu: number;
  tropPercuDepuis: string;
  delaiReponseJours: number;
  arrete: string;
};

export type Lettre = { expediteur: string[]; destinataire: string[]; lieuDate: string; objet: string; corps: string[] };

const date = (iso: string) => dateLongue(new Date(`${iso}T00:00:00Z`)).replace(/^1 /, "1er ");
const ou = (s: string, defaut: string) => (s.trim() ? s.trim() : defaut);

export function genererLettre(d: DonneesLettre): Lettre {
  const corps: string[] = [];
  const montantReclame = d.tropPercu;
  corps.push(d.bailleurNom.trim() ? `${d.bailleurNom.trim()},` : "Madame, Monsieur,");
  corps.push(
    `Je suis locataire du logement situé ${ou(d.adresseLogement, "[adresse du logement]")}, d'une surface habitable de ${d.surface} m², ` +
      `en vertu d'un bail signé le ${date(d.dateSignature)}.`,
  );
  corps.push(
    `Ce logement se trouve dans une zone où les loyers sont encadrés (${d.ville}). En application de l'article 140 de la loi n° 2018-1021 du 23 novembre 2018 (loi ELAN) ` +
      `et de l'arrêté préfectoral en vigueur à la date de signature du bail (${d.arrete}), le loyer de base ne peut pas dépasser ` +
      `le loyer de référence majoré, soit ${euros(d.loyerReferenceMajoreM2)} par m², c'est-à-dire ${euros(d.plafond)} par mois pour ce logement.`,
  );
  if (d.depassementMensuel > 0) {
    corps.push(
      `Or le loyer de base prévu par le bail est de ${euros(d.loyerBase)} par mois hors charges, ce qui dépasse ce plafond de ` +
        `${euros(d.depassementMensuel)} par mois.`,
    );
  }
  if (d.complement > 0 && d.complementContestable) {
    corps.push(
      `Le bail prévoit en outre un complément de loyer de ${euros(d.complement)} par mois, que je conteste pour les raisons suivantes : ` +
        d.raisonsComplement.map((r) => r.replace(/\.$/, "").toLowerCase()).join(" ; ") +
        ".",
    );
  }
  const demandes: string[] = [];
  demandes.push(
    `ramener le loyer à ${euros(d.loyerDemande)} par mois hors charges` +
      (d.complement > 0 && d.complementContestable ? ", sans complément de loyer," : "") +
      " à compter de la prochaine échéance, par la signature d'un avenant au bail",
  );
  if (montantReclame > 0) {
    demandes.push(
      `me rembourser les sommes perçues au-delà du loyer autorisé depuis le ${date(d.tropPercuDepuis)}, soit ${euros(montantReclame)} à ce jour (montant à actualiser jusqu'à la mise en conformité)`,
    );
  }
  corps.push(
    `Je vous mets donc en demeure, dans un délai de ${d.delaiReponseJours} jours à compter de la réception de ce courrier, de :`,
  );
  corps.push(...demandes.map((x, i) => `– ${x}${i === demandes.length - 1 ? "." : " ;"}`));
  corps.push(
    "À défaut de réponse satisfaisante dans ce délai, je saisirai la commission départementale de conciliation, puis, si nécessaire, " +
      "le juge des contentieux de la protection. Je me réserve également la possibilité de signaler la situation au préfet, " +
      "qui peut prononcer une amende administrative à l'encontre du bailleur.",
  );
  corps.push("Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.");
  corps.push(ou(d.locataireNom, "[Votre nom et signature]"));

  return {
    expediteur: [ou(d.locataireNom, "[Votre nom]"), ou(d.locataireAdresse, "[Votre adresse]")],
    destinataire: [ou(d.bailleurNom, "[Nom du bailleur ou de l'agence]"), ou(d.bailleurAdresse, "[Adresse du bailleur]")],
    lieuDate: `Le ${date(d.dateLettre)}`,
    objet: "Mise en demeure – loyer supérieur au plafond de l'encadrement des loyers. Lettre recommandée avec avis de réception.",
    corps,
  };
}

export const lettreEnTexte = (l: Lettre) =>
  [...l.expediteur, "", ...l.destinataire, "", l.lieuDate, "", `Objet : ${l.objet}`, "", ...l.corps].join("\n");
