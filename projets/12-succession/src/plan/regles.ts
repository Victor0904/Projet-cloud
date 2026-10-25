// Règles du plan : chaque règle dit QUAND une démarche s'applique et la décrit en langage clair.
// Les délais et montants ne sont jamais écrits ici : ils viennent de data/delais.json et data/droits.json.
import { euros } from "@vie-fr/fr-data";
import { valeurDroit, type TypeLettre } from "../lib/donnees";
import { estConjointMarie, type Profil } from "./profil";

export type Phase = "premiers_jours" | "premier_mois" | "six_mois" | "apres";

export const PHASES: { id: Phase; titre: string; intro: string }[] = [
  {
    id: "premiers_jours",
    titre: "Les premiers jours",
    intro: "Le strict nécessaire. Beaucoup de ces démarches peuvent être confiées aux pompes funèbres.",
  },
  {
    id: "premier_mois",
    titre: "Le premier mois",
    intro: "Prévenir les organismes et arrêter ce qui doit l'être. Rien ne presse à l'heure près.",
  },
  {
    id: "six_mois",
    titre: "Les six premiers mois",
    intro: "La succession et les droits du conjoint. Le notaire vous accompagne sur l'essentiel.",
  },
  {
    id: "apres",
    titre: "Après",
    intro: "Ce qui vient plus tard, à garder en tête.",
  },
];

export type Regle = {
  id: string;
  phase: Phase;
  titre: string;
  pourquoi: (p: Profil) => string;
  /** Identifiants dans data/organismes.json. */
  organismes: string[];
  /** Interlocuteur hors catalogue (médecin…), en texte libre. */
  contact?: string;
  /** Pièces à fournir ; si absent, on reprend celles du premier organisme. */
  pieces?: string[];
  /** Identifiant dans data/delais.json. */
  delai: (p: Profil) => string;
  lettre?: { type: TypeLettre; organisme: string };
  /** La démarche concerne aussi un proche sans lien familial. */
  toutProche?: boolean;
  /** Démarche qui revient aux héritiers : signalée comme telle à un proche sans lien familial. */
  heritiers?: boolean;
  condition: (p: Profil) => boolean;
};

const fixe = (id: string) => () => id;
const toujours = () => true;
const famille = (p: Profil) => p.lien !== "sans_lien";
const vitDansSonLogement = (p: Profil) => p.logement === "proprietaire" || p.logement === "locataire";
const plafondObseques = () => euros(valeurDroit("obseques_prelevement_banque").valeur, true);

export const REGLES: Regle[] = [
  // ——— Les premiers jours ———
  {
    id: "certificat_deces",
    phase: "premiers_jours",
    titre: "Faire constater le décès par un médecin",
    pourquoi: () =>
      "Le certificat de décès est le premier document : sans lui, rien d'autre n'est possible. À l'hôpital ou en Ehpad, l'équipe s'en charge.",
    organismes: [],
    contact: "Un médecin : médecin traitant, SOS Médecins, ou le 15 la nuit et le week-end.",
    pieces: ["Aucune : le médecin remplit le certificat."],
    delai: fixe("immediat"),
    toutProche: true,
    condition: toujours,
  },
  {
    id: "declaration_deces",
    phase: "premiers_jours",
    titre: "Déclarer le décès à la mairie",
    pourquoi: () =>
      "La mairie établit l'acte de décès, indispensable pour toutes les autres démarches. Les pompes funèbres ou l'établissement de santé le font souvent à votre place : demandez-leur.",
    organismes: ["mairie"],
    delai: fixe("declaration_deces"),
    toutProche: true,
    condition: toujours,
  },
  {
    id: "obseques",
    phase: "premiers_jours",
    titre: "Organiser les obsèques",
    pourquoi: () =>
      `Cherchez d'abord si le défunt avait laissé des volontés ou un contrat obsèques (l'Agira peut le rechercher en quelques jours). La banque peut payer la facture sur les comptes du défunt, jusqu'à ${plafondObseques()}.`,
    organismes: ["pompes_funebres", "agira"],
    delai: fixe("obseques"),
    toutProche: true,
    condition: toujours,
  },
  {
    id: "actes_deces",
    phase: "premiers_jours",
    titre: "Demander plusieurs copies de l'acte de décès",
    pourquoi: () =>
      "Presque chaque organisme en demande une. Les copies sont gratuites ; mieux vaut en demander plusieurs d'un coup. Gardez-en une dans le dossier de suivi.",
    organismes: ["mairie"],
    pieces: ["Votre pièce d'identité", "Les nom, prénoms et date du décès"],
    delai: fixe("des_que_possible"),
    toutProche: true,
    condition: toujours,
  },
  {
    id: "employeur_defunt",
    phase: "premiers_jours",
    titre: "Prévenir l'employeur du défunt",
    pourquoi: (p) =>
      p.activite === "fonctionnaire"
        ? "L'administration employeur verse le dernier traitement et, pour un agent public, c'est elle qui verse le capital décès : demandez-le en même temps."
        : "L'employeur arrête le contrat, verse le dernier salaire et les congés non pris, et vous dit s'il existe une prévoyance d'entreprise ou une épargne salariale.",
    organismes: ["employeur"],
    delai: fixe("des_que_possible"),
    lettre: { type: "information_deces", organisme: "employeur" },
    condition: (p) => famille(p) && (p.activite === "salarie" || p.activite === "fonctionnaire"),
  },
  {
    id: "france_travail",
    phase: "premiers_jours",
    titre: "Prévenir France Travail",
    pourquoi: () =>
      "Les allocations chômage s'arrêtent au décès ; un trop-perçu serait réclamé. Un capital décès peut être dû par l'Assurance maladie.",
    organismes: ["france_travail"],
    delai: fixe("premiere_semaine"),
    lettre: { type: "information_deces", organisme: "france_travail" },
    condition: (p) => famille(p) && p.activite === "demandeur_emploi",
  },
  {
    id: "conge_proche",
    phase: "premiers_jours",
    titre: "Demander votre congé pour décès",
    pourquoi: (p) => {
      if (p.lien === "conjoint")
        return `Vous avez droit à au moins ${valeurDroit("conge_conjoint").valeur} jours ouvrables de congé payé, au moment du décès. Votre convention collective peut prévoir plus.`;
      if (p.lien === "parent")
        return p.defuntJeuneOuParent
          ? `Vous avez droit à au moins ${valeurDroit("conge_enfant_moins_25").valeur} jours ouvrables de congé payé, puis à ${valeurDroit("conge_deuil").valeur} jours de congé de deuil à prendre dans l'année.`
          : `Vous avez droit à au moins ${valeurDroit("conge_enfant").valeur} jours ouvrables de congé payé.`;
      return `Vous avez droit à au moins ${valeurDroit("conge_parent_ou_fratrie").valeur} jours ouvrables de congé payé, au moment du décès. Votre convention collective peut prévoir plus.`;
    },
    organismes: [],
    contact: "Votre propre employeur (service RH ou responsable).",
    pieces: ["Acte de décès", "Justificatif du lien de parenté (livret de famille)"],
    delai: fixe("des_que_possible"),
    condition: (p) => p.procheSalarie && ["conjoint", "enfant", "parent", "frere_soeur"].includes(p.lien),
  },
  {
    id: "banque_prevenir",
    phase: "premiers_jours",
    titre: "Prévenir la banque du défunt",
    pourquoi: () =>
      `Les comptes personnels sont bloqués, ce qui arrête les prélèvements ; un compte joint continue de fonctionner. La banque peut régler les obsèques jusqu'à ${plafondObseques()} sur présentation de la facture.`,
    organismes: ["banque"],
    delai: fixe("premiere_semaine"),
    lettre: { type: "information_deces", organisme: "banque" },
    condition: famille,
  },
  {
    id: "remboursement_obseques",
    phase: "premiers_jours",
    titre: "Si vous avez payé les obsèques : demander le remboursement à la banque",
    pourquoi: () =>
      `Même sans être héritier, la personne qui a réglé les obsèques peut demander à la banque du défunt de la rembourser, dans la limite de ${plafondObseques()} et des sommes disponibles.`,
    organismes: ["banque"],
    pieces: ["Facture acquittée des obsèques", "Acte de décès", "Votre pièce d'identité", "Votre RIB"],
    delai: fixe("premier_mois"),
    lettre: { type: "remboursement_obseques", organisme: "banque" },
    toutProche: true,
    condition: toujours,
  },
  {
    id: "animaux",
    phase: "premiers_jours",
    titre: "Confier les animaux à une personne de confiance",
    pourquoi: () =>
      "Les animaux ont besoin d'être pris en charge tout de suite. Une fois la personne trouvée, signalez le nouveau détenteur au fichier d'identification.",
    organismes: ["icad"],
    delai: fixe("des_que_possible"),
    toutProche: true,
    condition: (p) => p.animaux,
  },

  // ——— Le premier mois ———
  {
    id: "cpam_capital",
    phase: "premier_mois",
    titre: "Informer l'Assurance maladie et demander le capital décès",
    pourquoi: (p) =>
      p.lien === "conjoint" || p.lien === "enfant"
        ? "Le capital décès est une somme versée une fois aux proches. Les personnes qui étaient à la charge du défunt sont prioritaires pendant un mois : ne tardez pas."
        : "Le capital décès est d'abord réservé, pendant un mois, aux personnes à la charge du défunt. S'il n'y en a pas, vous pouvez le demander ensuite, dans un délai de 2 ans.",
    organismes: ["cpam"],
    delai: (p) => (p.lien === "conjoint" || p.lien === "enfant" ? "capital_deces_prioritaire" : "capital_deces_autres"),
    lettre: { type: "demande_capital_deces", organisme: "cpam" },
    condition: (p) =>
      famille(p) && (p.activite === "salarie" || p.activite === "demandeur_emploi" || p.activite === "independant"),
  },
  {
    id: "cpam_informer",
    phase: "premier_mois",
    titre: "Informer l'Assurance maladie",
    pourquoi: (p) =>
      p.activite === "retraite"
        ? "La carte Vitale est désactivée et les derniers soins remboursés. Un capital décès reste possible si le défunt avait cessé son activité depuis moins d'un an : posez la question."
        : "La carte Vitale est désactivée et les derniers soins remboursés aux héritiers.",
    organismes: ["cpam"],
    delai: fixe("premier_mois"),
    lettre: { type: "information_deces", organisme: "cpam" },
    condition: (p) =>
      famille(p) && !(p.activite === "salarie" || p.activite === "demandeur_emploi" || p.activite === "independant"),
  },
  {
    id: "retraite_informer",
    phase: "premier_mois",
    titre: "Prévenir les caisses de retraite",
    pourquoi: () =>
      "La retraite du mois du décès est due en entier ; les mois suivants versés par erreur seront réclamés. Pensez à la retraite de base et à la complémentaire.",
    organismes: ["caisse_retraite_base", "retraite_complementaire"],
    delai: fixe("premier_mois"),
    lettre: { type: "information_deces", organisme: "caisse_retraite_base" },
    condition: (p) => famille(p) && p.activite === "retraite",
  },
  {
    id: "veuvage",
    phase: "premier_mois",
    titre: "Demander l'allocation de veuvage",
    pourquoi: () =>
      `Pour le conjoint marié de moins de ${valeurDroit("veuvage_age_max").valeur} ans, sous condition de ressources, en attendant l'âge de la réversion. Faite tôt, la demande permet un versement dès le mois du décès.`,
    organismes: ["caisse_retraite_base"],
    delai: fixe("allocation_veuvage"),
    lettre: { type: "demande_reversion", organisme: "caisse_retraite_base" },
    condition: (p) =>
      estConjointMarie(p) && (p.ageConjoint === null || p.ageConjoint < valeurDroit("veuvage_age_max").valeur),
  },
  {
    id: "caf",
    phase: "premier_mois",
    titre: "Prévenir la CAF",
    pourquoi: (p) =>
      p.enfantsMineurs
        ? "Les droits du foyer sont recalculés, et les enfants qui ont perdu un parent peuvent recevoir l'allocation de soutien familial."
        : "L'aide au logement et les autres prestations du foyer doivent être mises à jour.",
    organismes: ["caf"],
    delai: fixe("premier_mois"),
    lettre: { type: "information_deces", organisme: "caf" },
    condition: (p) => famille(p) && (p.enfantsMineurs || p.logement === "locataire"),
  },
  {
    id: "asf",
    phase: "premier_mois",
    titre: "Demander l'allocation de soutien familial pour les enfants",
    pourquoi: () =>
      "Elle est versée, sans condition de ressources, pour chaque enfant à charge privé d'un ou de ses deux parents. Elle se demande à la CAF par la personne qui élève l'enfant.",
    organismes: ["caf"],
    delai: fixe("trois_mois"),
    condition: (p) => famille(p) && p.enfantsMineurs,
  },
  {
    id: "impots_conjoint",
    phase: "premier_mois",
    titre: "Signaler le décès aux impôts pour ajuster votre prélèvement à la source",
    pourquoi: () =>
      "Votre taux de prélèvement change : le signaler dans votre espace impots.gouv.fr évite de payer trop ou pas assez.",
    organismes: ["impots"],
    delai: fixe("impots_conjoint_60j"),
    condition: (p) => p.lien === "conjoint" && (p.union === "marie" || p.union === "pacse"),
  },
  {
    id: "bailleur",
    phase: "premier_mois",
    titre: "Informer le propriétaire du logement",
    pourquoi: (p) =>
      p.lien === "conjoint"
        ? "Le bail peut continuer à votre nom : le conjoint marié en bénéficie de plein droit, le partenaire de Pacs ou le concubin s'il vivait sur place depuis au moins un an. Écrivez pour demander le transfert."
        : "Si personne ne reprend le bail, il prend fin avec le décès. Prévenez le propriétaire, videz le logement et organisez l'état des lieux pour récupérer le dépôt de garantie.",
    organismes: ["bailleur"],
    delai: fixe("premier_mois"),
    lettre: { type: "resiliation", organisme: "bailleur" },
    condition: (p) => famille(p) && p.logement === "locataire",
  },
  {
    id: "syndic",
    phase: "premier_mois",
    titre: "Si le logement est en copropriété : prévenir le syndic",
    pourquoi: () =>
      "Les charges continuent d'être dues : le syndic doit savoir à qui les adresser pendant la succession.",
    organismes: ["syndic"],
    delai: fixe("premier_mois"),
    lettre: { type: "information_deces", organisme: "syndic" },
    condition: (p) => famille(p) && p.logement === "proprietaire",
  },
  {
    id: "contrats_courants",
    phase: "premier_mois",
    titre: "Transférer ou résilier l'énergie, l'eau, internet et le téléphone",
    pourquoi: (p) =>
      vitDansSonLogement(p)
        ? "Si quelqu'un reste dans le logement, faites transférer les contrats à son nom ; sinon résiliez-les après un relevé des compteurs. Une réexpédition du courrier aide à repérer les contrats oubliés."
        : "Résiliez la ligne mobile et les abonnements personnels. Une réexpédition du courrier aide à repérer les contrats oubliés.",
    organismes: ["energie", "eau", "telecom", "mobile", "la_poste"],
    pieces: ["Acte de décès", "Numéros de client ou de contrat", "Relevés des compteurs"],
    delai: fixe("premier_mois"),
    lettre: { type: "resiliation", organisme: "telecom" },
    condition: famille,
  },
  {
    id: "assurances",
    phase: "premier_mois",
    titre: "Prévenir les assureurs et la mutuelle",
    pourquoi: (p) =>
      (p.logement === "proprietaire"
        ? "S'il reste un crédit immobilier, l'assurance emprunteur peut le rembourser. "
        : "") +
      "Une prévoyance peut verser un capital, la mutuelle parfois une aide aux frais d'obsèques. Gardez l'assurance habitation tant que le logement n'est pas vidé ou vendu.",
    organismes: ["assureurs", "mutuelle"],
    delai: fixe("premier_mois"),
    lettre: { type: "information_deces", organisme: "assureurs" },
    condition: famille,
  },
  {
    id: "notaire",
    phase: "premier_mois",
    titre: "Prendre contact avec un notaire",
    pourquoi: (p) => {
      if (p.lien === "sans_lien")
        return "Vous n'êtes pas héritier : la succession revient à la famille. Si vous ne savez pas qui prévenir, un notaire peut rechercher les héritiers. Transmettez-lui ce que vous savez.";
      const obligatoire = p.logement === "proprietaire" || p.testament === "oui";
      return obligatoire
        ? "Le notaire est obligatoire ici (bien immobilier ou testament). Il établit l'acte qui prouve qui sont les héritiers, fait l'inventaire et prépare la déclaration de succession."
        : "Le notaire n'est pas toujours obligatoire, mais il simplifie tout : acte de notoriété pour débloquer les comptes, recherche d'un testament, déclaration de succession.";
    },
    organismes: ["notaire"],
    delai: fixe("premier_mois"),
    toutProche: true,
    condition: toujours,
  },
  {
    id: "testament",
    phase: "premier_mois",
    titre: "Rechercher un testament",
    pourquoi: (p) =>
      p.testament === "oui"
        ? "Remettez le testament au notaire : il l'ouvre, le fait enregistrer et vérifie qu'il n'en existe pas un plus récent."
        : "Le notaire interroge le fichier central des dernières volontés, où sont inscrits les testaments déposés chez un notaire.",
    organismes: ["notaire"],
    delai: fixe("premier_mois"),
    condition: (p) => famille(p) && p.testament !== "non",
  },
  {
    id: "assurance_vie_connue",
    phase: "premier_mois",
    titre: "Demander le capital de l'assurance-vie",
    pourquoi: () =>
      "L'assurance-vie est versée aux bénéficiaires désignés, en dehors de la succession. L'assureur doit payer dans le mois qui suit la réception de toutes les pièces.",
    organismes: ["assurance_vie"],
    delai: fixe("premier_mois"),
    lettre: { type: "demande_capital_assurance", organisme: "assurance_vie" },
    condition: (p) => p.assuranceVie === "oui",
  },
  {
    id: "agira",
    phase: "premier_mois",
    titre: "Rechercher les assurances-vie inconnues (Agira)",
    pourquoi: () =>
      "Démarche gratuite : l'Agira interroge tous les assureurs. Vous n'aurez une réponse que si vous êtes bénéficiaire d'un contrat.",
    organismes: ["agira"],
    delai: fixe("premier_mois"),
    toutProche: true,
    condition: (p) => p.assuranceVie !== "non",
  },
  {
    id: "inventaire_comptes",
    phase: "premier_mois",
    titre: "Faire l'inventaire des comptes bancaires",
    pourquoi: () =>
      `Demandez à chaque banque la liste des comptes et leurs soldes au jour du décès. Le fichier Ficoba donne gratuitement la liste de toutes les banques. Si le total est inférieur à ${euros(valeurDroit("cloture_compte_sans_notaire").valeur, true)} et sans bien immobilier, un héritier peut clôturer les comptes sans notaire.`,
    organismes: ["banque", "ficoba"],
    delai: fixe("premier_mois"),
    lettre: { type: "demande_inventaire_comptes", organisme: "banque" },
    condition: famille,
  },
  {
    id: "numerique",
    phase: "premier_mois",
    titre: "Arrêter les abonnements et décider du sort des comptes en ligne",
    pourquoi: () =>
      "Les abonnements (vidéo, musique, stockage) continuent d'être prélevés. Pour les réseaux sociaux, vous pouvez choisir entre un compte « de commémoration » et la suppression. Repérez les prélèvements sur les derniers relevés bancaires.",
    organismes: ["netflix", "spotify", "apple", "google", "amazon", "meta", "reseaux_autres", "abonnements_autres"],
    pieces: ["Acte de décès", "Adresse e-mail ou identifiant des comptes"],
    delai: fixe("premier_mois"),
    lettre: { type: "resiliation", organisme: "abonnements_autres" },
    condition: famille,
  },
  {
    id: "vehicule",
    phase: "premier_mois",
    titre: "S'occuper du véhicule",
    pourquoi: () =>
      "Gardez-le assuré tant qu'il n'est pas vendu. Si un héritier le garde et l'utilise, la carte grise doit passer à son nom ; il peut aussi être vendu au nom de la succession.",
    organismes: ["prefecture_ants", "assureurs"],
    delai: fixe("vehicule"),
    condition: (p) => famille(p) && p.vehicule,
  },
  {
    id: "entreprise",
    phase: "premier_mois",
    titre: "Décider de l'avenir de l'activité professionnelle",
    pourquoi: () =>
      "Il faut déclarer la cessation de l'activité ou sa reprise, régler les cotisations et prévenir les clients et fournisseurs. L'expert-comptable et le notaire sont vos premiers interlocuteurs.",
    organismes: ["entreprise_formalites", "notaire"],
    delai: fixe("premier_mois"),
    lettre: { type: "information_deces", organisme: "entreprise_formalites" },
    condition: (p) => famille(p) && (p.entreprise || p.activite === "independant"),
  },
  {
    id: "conge_deuil",
    phase: "premier_mois",
    titre: "Poser votre congé de deuil",
    pourquoi: () =>
      `${valeurDroit("conge_deuil").valeur} jours supplémentaires, en une ou deux fois, à prendre dans l'année.`,
    organismes: [],
    contact: "Votre propre employeur.",
    pieces: ["Acte de décès", "Justificatif du lien de parenté"],
    delai: fixe("conge_deuil_enfant"),
    condition: (p) => p.lien === "parent" && p.procheSalarie && p.defuntJeuneOuParent,
  },

  // ——— Les six premiers mois ———
  {
    id: "declaration_succession",
    phase: "six_mois",
    titre: "Déposer la déclaration de succession",
    pourquoi: (p) =>
      (p.lien === "sans_lien" ? "Cette démarche revient aux héritiers ou au notaire, pas à vous. " : "") +
      `Elle est généralement préparée par le notaire. Elle n'est pas nécessaire si la succession, revenant au conjoint ou aux enfants, vaut moins de ${euros(valeurDroit("succession_dispense_ligne_directe").valeur, true)} (pour les autres héritiers : ${euros(valeurDroit("succession_dispense_autres").valeur, true)}). Un retard entraîne des intérêts.`,
    organismes: ["notaire", "impots"],
    delai: (p) => (p.decesEtranger ? "declaration_succession_etranger" : "declaration_succession"),
    heritiers: true,
    condition: toujours,
  },
  {
    id: "reversion",
    phase: "six_mois",
    titre: "Demander la pension de réversion",
    pourquoi: (p) =>
      (p.ageConjoint !== null && p.ageConjoint < valeurDroit("reversion_age_min").valeur
        ? `Elle est versée à partir de ${valeurDroit("reversion_age_min").valeur} ans (plus tôt dans certains cas pour la complémentaire). Notez-la pour plus tard. `
        : "") +
      "Une seule demande en ligne sur info-retraite.fr couvre tous les régimes du défunt. Faite dans les 12 mois, elle permet de toucher la réversion depuis le mois qui suit le décès.",
    organismes: ["info_retraite", "caisse_retraite_base", "retraite_complementaire"],
    delai: fixe("reversion_12_mois"),
    lettre: { type: "demande_reversion", organisme: "caisse_retraite_base" },
    condition: estConjointMarie,
  },
  {
    id: "revenus_professionnels",
    phase: "six_mois",
    titre: "Déclarer les derniers revenus professionnels du défunt",
    pourquoi: () =>
      "Pour un travailleur indépendant, les bénéfices de l'année jusqu'au décès se déclarent dans un délai réduit. L'expert-comptable peut s'en charger.",
    organismes: ["impots", "entreprise_formalites"],
    delai: fixe("revenus_professionnels_6_mois"),
    condition: (p) => famille(p) && (p.activite === "independant" || p.entreprise),
  },
  {
    id: "cloture_comptes",
    phase: "six_mois",
    titre: "Clôturer les comptes et contrats restants",
    pourquoi: () =>
      "Une fois les héritiers connus (acte de notoriété ou attestation), demandez la clôture des comptes et le versement des soldes. Les frais bancaires de succession sont plafonnés.",
    organismes: ["banque"],
    delai: fixe("sans_delai"),
    lettre: { type: "demande_cloture", organisme: "banque" },
    condition: famille,
  },

  // ——— Après ———
  {
    id: "revenus_defunt",
    phase: "apres",
    titre: "Faire la dernière déclaration de revenus du défunt",
    pourquoi: (p) =>
      p.lien === "conjoint" && (p.union === "marie" || p.union === "pacse")
        ? "Il y aura deux déclarations : une commune du 1er janvier au décès, puis une à votre seul nom pour la fin de l'année."
        : "Les héritiers déclarent les revenus du défunt du 1er janvier jusqu'au décès, pendant la campagne habituelle.",
    organismes: ["impots"],
    delai: fixe("revenus_defunt"),
    condition: famille,
  },
];
