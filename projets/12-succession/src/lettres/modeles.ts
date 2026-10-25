// Modèles de courriers préremplis. Les textes sont volontairement simples et courtois.
import { dateLongue, isoVersDate } from "../lib/dates";
import type { Canal, Organisme, TypeLettre } from "../lib/donnees";
import type { Lien } from "../plan/profil";

export type InfosLettre = {
  expediteurNom: string;
  expediteurAdresse: string;
  expediteurContact: string;
  /** Votre qualité, ex. « fille de la personne décédée ». */
  qualite: string;
  defuntNom: string;
  defuntDateNaissance: string;
  /** AAAA-MM-JJ */
  dateDeces: string;
  defuntNumeroSecu: string;
  destinataireNom: string;
  destinataireAdresse: string;
  /** Numéro de contrat, de client, d'allocataire… */
  reference: string;
  ville: string;
  /** Coordonnées du notaire chargé de la succession, si connu. */
  notaire: string;
  /** Pour le bail : demander le transfert plutôt que la résiliation. */
  transfertBail: boolean;
};

export const INFOS_VIDES: InfosLettre = {
  expediteurNom: "",
  expediteurAdresse: "",
  expediteurContact: "",
  qualite: "",
  defuntNom: "",
  defuntDateNaissance: "",
  dateDeces: "",
  defuntNumeroSecu: "",
  destinataireNom: "",
  destinataireAdresse: "",
  reference: "",
  ville: "",
  notaire: "",
  transfertBail: false,
};

export const QUALITE_PAR_LIEN: Record<Lien, string> = {
  conjoint: "conjoint(e) de la personne décédée",
  enfant: "enfant de la personne décédée",
  parent: "parent de la personne décédée",
  frere_soeur: "frère ou sœur de la personne décédée",
  autre_famille: "membre de la famille de la personne décédée",
  sans_lien: "proche de la personne décédée",
};

export const TYPES_LETTRES: { id: TypeLettre; nom: string; description: string }[] = [
  {
    id: "information_deces",
    nom: "Information du décès",
    description: "Prévenir un organisme et demander la marche à suivre.",
  },
  {
    id: "resiliation",
    nom: "Résiliation d'un contrat",
    description: "Arrêter un abonnement, un bail, une assurance, une ligne.",
  },
  {
    id: "demande_cloture",
    nom: "Demande de clôture",
    description: "Clôturer un compte ou un contrat et verser le solde.",
  },
  {
    id: "demande_capital_deces",
    nom: "Demande de capital décès",
    description: "À l'Assurance maladie, avec le formulaire officiel.",
  },
  {
    id: "demande_reversion",
    nom: "Demande de réversion",
    description: "À la caisse de retraite, pour le conjoint marié.",
  },
  {
    id: "demande_inventaire_comptes",
    nom: "Demande d'inventaire des comptes",
    description: "Connaître tous les comptes et leurs soldes au jour du décès.",
  },
  {
    id: "remboursement_obseques",
    nom: "Remboursement des frais d'obsèques",
    description: "Se faire rembourser par la banque du défunt.",
  },
  {
    id: "demande_capital_assurance",
    nom: "Demande de versement d'une assurance-vie",
    description: "À l'assureur, en tant que bénéficiaire.",
  },
];

export type Lettre = {
  objet: string;
  texte: string;
  envoi: Canal;
  piecesJointes: string[];
};

const ou = (v: string, defaut: string) => (v.trim() ? v.trim() : defaut);

function dateDecesTexte(i: InfosLettre): string {
  const d = isoVersDate(i.dateDeces);
  return d ? dateLongue(d) : "[date du décès]";
}

function corps(
  type: TypeLettre,
  i: InfosLettre,
  org?: Organisme,
): { objet: string; paragraphes: string[]; pieces: string[]; envoi: Canal } {
  const defunt = ou(i.defuntNom, "[nom et prénom de la personne décédée]");
  const ne = i.defuntDateNaissance.trim() ? `, né(e) le ${i.defuntDateNaissance.trim()}` : "";
  const deces = dateDecesTexte(i);
  const ref = i.reference.trim() ? ` (référence : ${i.reference.trim()})` : "";
  const qualite = ou(i.qualite, "proche de la personne décédée");
  const contactSuite = i.notaire.trim()
    ? `Pour la suite du dossier, vous pouvez également vous adresser au notaire chargé de la succession : ${i.notaire.trim()}.`
    : "Pour la suite du dossier, je reste votre interlocuteur à l'adresse ci-dessus.";
  const annonce = `J'ai la tristesse de vous informer du décès de ${defunt}${ne}, survenu le ${deces}.`;

  switch (type) {
    case "information_deces":
      return {
        objet: `Information du décès de ${defunt}${ref}`,
        paragraphes: [
          annonce,
          `En ma qualité de ${qualite}, je vous remercie de bien vouloir enregistrer ce décès dans votre dossier${ref}, de mettre fin aux versements ou prélèvements qui n'ont plus lieu d'être, et de m'indiquer les démarches à suivre ainsi que les sommes éventuellement dues ou à percevoir.`,
          contactSuite,
        ],
        pieces: ["Copie de l'acte de décès"],
        envoi: org?.canal_conseille === "lrar" ? "lrar" : "courrier",
      };
    case "resiliation":
      if (org?.id === "bailleur" && i.transfertBail)
        return {
          objet: `Décès de ${defunt} – demande de transfert du bail${ref}`,
          paragraphes: [
            annonce,
            `Je vivais avec ${defunt} dans le logement loué et je vous demande, en ma qualité de ${qualite}, le transfert du bail à mon nom, conformément à l'article 14 de la loi du 6 juillet 1989.`,
            "Je vous remercie de me confirmer ce transfert par écrit.",
          ],
          pieces: [
            "Copie de l'acte de décès",
            "Justificatif de vie commune (livret de famille, Pacs, ou attestations et factures)",
          ],
          envoi: "lrar",
        };
      return {
        objet: `Résiliation suite au décès de ${defunt}${ref}`,
        paragraphes: [
          annonce,
          `En ma qualité de ${qualite}, je vous demande de résilier le contrat${ref} à compter de la date du décès, sans frais compte tenu du motif. Je vous remercie de cesser tout prélèvement, de rembourser les sommes éventuellement perçues après cette date et de m'adresser un décompte final.`,
          org?.id === "bailleur"
            ? "Je vous propose de convenir rapidement d'une date pour l'état des lieux de sortie et la remise des clés, en vue de la restitution du dépôt de garantie."
            : "S'il y a du matériel à restituer, merci de m'indiquer la marche à suivre.",
          contactSuite,
        ],
        pieces: ["Copie de l'acte de décès"],
        envoi: "lrar",
      };
    case "demande_cloture":
      return {
        objet: `Demande de clôture – décès de ${defunt}${ref}`,
        paragraphes: [
          annonce,
          `En ma qualité de ${qualite}, je vous demande de procéder à la clôture des comptes et contrats ouverts à son nom${ref}, et de verser les soldes selon les instructions jointes (ou au notaire chargé de la succession).`,
          "Je vous remercie de m'adresser un relevé de clôture et le détail des éventuels frais appliqués.",
          contactSuite,
        ],
        pieces: [
          "Copie de l'acte de décès",
          "Attestation signée par tous les héritiers ou acte de notoriété",
          "RIB du compte destinataire",
        ],
        envoi: "lrar",
      };
    case "demande_capital_deces":
      return {
        objet: `Demande de capital décès – ${defunt}${i.defuntNumeroSecu.trim() ? ` (n° de sécurité sociale : ${i.defuntNumeroSecu.trim()})` : ""}`,
        paragraphes: [
          annonce,
          `En ma qualité de ${qualite}, je sollicite le versement du capital décès. Vous trouverez ci-joint le formulaire de demande complété ainsi que les pièces justificatives.`,
          "Je vous remercie de m'informer de la suite donnée à ma demande et de me signaler toute pièce manquante.",
        ],
        pieces: [
          "Formulaire de demande de capital décès (cerfa S3180) complété",
          "Copie de l'acte de décès",
          "Justificatif du lien avec le défunt (livret de famille, Pacs)",
          "RIB",
        ],
        envoi: "lrar",
      };
    case "demande_reversion":
      return {
        objet: `Demande de pension de réversion – ${defunt}${i.defuntNumeroSecu.trim() ? ` (n° de sécurité sociale : ${i.defuntNumeroSecu.trim()})` : ""}`,
        paragraphes: [
          annonce,
          `En ma qualité de conjoint(e) survivant(e), je vous demande l'attribution de la pension de réversion à laquelle je peux prétendre ou, si je n'en remplis pas encore les conditions, de l'allocation de veuvage.`,
          "Je vous remercie de m'adresser le formulaire à compléter si nécessaire, et de m'indiquer la date à partir de laquelle cette pension pourra être versée.",
        ],
        pieces: ["Copie de l'acte de décès", "Copie de l'acte de mariage", "Dernier avis d'imposition", "RIB"],
        envoi: "lrar",
      };
    case "demande_inventaire_comptes":
      return {
        objet: `Demande d'inventaire des avoirs – décès de ${defunt}${ref}`,
        paragraphes: [
          annonce,
          `En ma qualité de ${qualite}, je vous demande de bien vouloir m'adresser la liste de l'ensemble des comptes, livrets, placements, crédits, coffres et contrats d'assurance détenus par ${defunt} dans votre établissement, avec leurs soldes au jour du décès.`,
          "Je vous remercie également de m'indiquer les opérations éventuellement présentées après la date du décès.",
          contactSuite,
        ],
        pieces: [
          "Copie de l'acte de décès",
          "Justificatif de votre qualité d'héritier (attestation ou acte de notoriété)",
        ],
        envoi: "lrar",
      };
    case "remboursement_obseques":
      return {
        objet: `Demande de remboursement des frais d'obsèques – ${defunt}${ref}`,
        paragraphes: [
          annonce,
          `J'ai réglé les frais d'obsèques, dont vous trouverez la facture acquittée ci-jointe. Conformément à l'article L312-1-4 du Code monétaire et financier, je vous demande de m'en rembourser le montant en débitant les comptes de ${defunt}, dans la limite du plafond réglementaire et des sommes disponibles.`,
          "Je vous remercie de procéder au virement sur le compte dont je joins le RIB.",
        ],
        pieces: [
          "Facture acquittée des obsèques",
          "Copie de l'acte de décès",
          "Copie de votre pièce d'identité",
          "RIB",
        ],
        envoi: "lrar",
      };
    case "demande_capital_assurance":
      return {
        objet: `Demande de versement du capital – contrat${ref || " [numéro du contrat]"} – ${defunt}`,
        paragraphes: [
          annonce,
          `Je pense être bénéficiaire du contrat d'assurance-vie souscrit par ${defunt}${ref}. Je vous demande de bien vouloir me confirmer ma qualité de bénéficiaire, de m'indiquer les pièces nécessaires et de procéder au versement du capital.`,
          "Je vous rappelle que le versement doit intervenir dans le mois qui suit la réception de l'ensemble des pièces.",
        ],
        pieces: ["Copie de l'acte de décès", "Copie de votre pièce d'identité", "RIB"],
        envoi: "lrar",
      };
  }
}

export function genererLettre(type: TypeLettre, i: InfosLettre, org?: Organisme, aujourdhui = new Date()): Lettre {
  const c = corps(type, i, org);
  const destinataire = [
    ou(i.destinataireNom, org?.nom ?? "[destinataire]"),
    ou(i.destinataireAdresse, "[adresse du destinataire]"),
  ];
  const lignes = [
    ou(i.expediteurNom, "[vos nom et prénom]"),
    ou(i.expediteurAdresse, "[votre adresse]"),
    ...(i.expediteurContact.trim() ? [i.expediteurContact.trim()] : []),
    "",
    ...destinataire,
    "",
    `${ou(i.ville, "[ville]")}, le ${dateLongue(new Date(Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())))}`,
    "",
    ...(c.envoi === "lrar" ? ["Lettre recommandée avec accusé de réception", ""] : []),
    `Objet : ${c.objet}`,
    "",
    "Madame, Monsieur,",
    "",
    ...c.paragraphes.flatMap((p) => [p, ""]),
    "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
    "",
    ou(i.expediteurNom, "[vos nom et prénom]"),
    "",
    "Pièces jointes :",
    ...c.pieces.map((p) => `– ${p}`),
  ];
  return { objet: c.objet, texte: lignes.join("\n"), envoi: c.envoi, piecesJointes: c.pieces };
}
