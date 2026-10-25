// Index des données. Généré à la main à partir de data/ : un test vérifie que chaque fichier y figure.
import type { Contact, OrganismeFiche, TermeGlossaire, TypeCourrier } from "./types";
import organismesJson from "../../data/organismes.json";
import contactsJson from "../../data/contacts.json";
import glossaireJson from "../../data/glossaire.json";
import t_antai_avis from "../../data/types-courrier/antai-avis.json";
import t_antai_designation from "../../data/types-courrier/antai-designation.json";
import t_antai_fps from "../../data/types-courrier/antai-fps.json";
import t_antai_majoree from "../../data/types-courrier/antai-majoree.json";
import t_assurance_augmentation from "../../data/types-courrier/assurance-augmentation.json";
import t_assurance_mise_en_demeure from "../../data/types-courrier/assurance-mise-en-demeure.json";
import t_assurance_resiliation from "../../data/types-courrier/assurance-resiliation.json";
import t_bailleur_charges from "../../data/types-courrier/bailleur-charges.json";
import t_bailleur_conge from "../../data/types-courrier/bailleur-conge.json";
import t_bailleur_relance from "../../data/types-courrier/bailleur-relance.json";
import t_banque_cloture from "../../data/types-courrier/banque-cloture.json";
import t_banque_frais from "../../data/types-courrier/banque-frais.json";
import t_banque_rejet from "../../data/types-courrier/banque-rejet.json";
import t_caf_controle from "../../data/types-courrier/caf-controle.json";
import t_caf_indu from "../../data/types-courrier/caf-indu.json";
import t_caf_pieces from "../../data/types-courrier/caf-pieces.json";
import t_caf_revision from "../../data/types-courrier/caf-revision.json";
import t_caf_suspension from "../../data/types-courrier/caf-suspension.json";
import t_ft_convocation from "../../data/types-courrier/ft-convocation.json";
import t_ft_justificatifs from "../../data/types-courrier/ft-justificatifs.json";
import t_ft_radiation from "../../data/types-courrier/ft-radiation.json";
import t_ft_trop_percu from "../../data/types-courrier/ft-trop-percu.json";
import t_huissier_commandement from "../../data/types-courrier/huissier-commandement.json";
import t_huissier_injonction from "../../data/types-courrier/huissier-injonction.json";
import t_huissier_sommation from "../../data/types-courrier/huissier-sommation.json";
import t_impots_avis from "../../data/types-courrier/impots-avis.json";
import t_impots_mise_en_demeure from "../../data/types-courrier/impots-mise-en-demeure.json";
import t_impots_prelevement from "../../data/types-courrier/impots-prelevement.json";
import t_impots_rectification from "../../data/types-courrier/impots-rectification.json";
import t_impots_relance from "../../data/types-courrier/impots-relance.json";
import t_urssaf_appel from "../../data/types-courrier/urssaf-appel.json";
import t_urssaf_majorations from "../../data/types-courrier/urssaf-majorations.json";
import t_urssaf_mise_en_demeure from "../../data/types-courrier/urssaf-mise-en-demeure.json";
import l_antai_designation from "../../data/lettres/antai-designation.md";
import l_antai_exoneration from "../../data/lettres/antai-exoneration.md";
import l_antai_rapo from "../../data/lettres/antai-rapo.md";
import l_antai_reclamation_majoree from "../../data/lettres/antai-reclamation-majoree.md";
import l_assurance_contestation_resiliation from "../../data/lettres/assurance-contestation-resiliation.md";
import l_assurance_resiliation_hausse from "../../data/lettres/assurance-resiliation-hausse.md";
import l_bailleur_contestation_conge from "../../data/lettres/bailleur-contestation-conge.md";
import l_bailleur_justificatifs_charges from "../../data/lettres/bailleur-justificatifs-charges.md";
import l_banque_cloture from "../../data/lettres/banque-cloture.md";
import l_banque_remboursement_frais from "../../data/lettres/banque-remboursement-frais.md";
import l_demande_explications from "../../data/lettres/demande-explications.md";
import l_echeancier from "../../data/lettres/echeancier.md";
import l_envoi_pieces from "../../data/lettres/envoi-pieces.md";
import l_ft_contestation_trop_percu from "../../data/lettres/ft-contestation-trop-percu.md";
import l_ft_recours_radiation from "../../data/lettres/ft-recours-radiation.md";
import l_ft_report from "../../data/lettres/ft-report.md";
import l_huissier_justificatifs from "../../data/lettres/huissier-justificatifs.md";
import l_huissier_opposition from "../../data/lettres/huissier-opposition.md";
import l_impots_observations from "../../data/lettres/impots-observations.md";
import l_impots_prorogation from "../../data/lettres/impots-prorogation.md";
import l_impots_reclamation from "../../data/lettres/impots-reclamation.md";
import l_recours_cra from "../../data/lettres/recours-cra.md";
import l_remise_dette from "../../data/lettres/remise-dette.md";

export const TYPES = [
  t_antai_avis,
  t_antai_designation,
  t_antai_fps,
  t_antai_majoree,
  t_assurance_augmentation,
  t_assurance_mise_en_demeure,
  t_assurance_resiliation,
  t_bailleur_charges,
  t_bailleur_conge,
  t_bailleur_relance,
  t_banque_cloture,
  t_banque_frais,
  t_banque_rejet,
  t_caf_controle,
  t_caf_indu,
  t_caf_pieces,
  t_caf_revision,
  t_caf_suspension,
  t_ft_convocation,
  t_ft_justificatifs,
  t_ft_radiation,
  t_ft_trop_percu,
  t_huissier_commandement,
  t_huissier_injonction,
  t_huissier_sommation,
  t_impots_avis,
  t_impots_mise_en_demeure,
  t_impots_prelevement,
  t_impots_rectification,
  t_impots_relance,
  t_urssaf_appel,
  t_urssaf_majorations,
  t_urssaf_mise_en_demeure,
] as unknown as TypeCourrier[];

/** Contenu brut des modèles de lettres (fichiers .md), par identifiant. */
export const LETTRES_BRUTES: Record<string, string> = {
  "antai-designation": l_antai_designation,
  "antai-exoneration": l_antai_exoneration,
  "antai-rapo": l_antai_rapo,
  "antai-reclamation-majoree": l_antai_reclamation_majoree,
  "assurance-contestation-resiliation": l_assurance_contestation_resiliation,
  "assurance-resiliation-hausse": l_assurance_resiliation_hausse,
  "bailleur-contestation-conge": l_bailleur_contestation_conge,
  "bailleur-justificatifs-charges": l_bailleur_justificatifs_charges,
  "banque-cloture": l_banque_cloture,
  "banque-remboursement-frais": l_banque_remboursement_frais,
  "demande-explications": l_demande_explications,
  "echeancier": l_echeancier,
  "envoi-pieces": l_envoi_pieces,
  "ft-contestation-trop-percu": l_ft_contestation_trop_percu,
  "ft-recours-radiation": l_ft_recours_radiation,
  "ft-report": l_ft_report,
  "huissier-justificatifs": l_huissier_justificatifs,
  "huissier-opposition": l_huissier_opposition,
  "impots-observations": l_impots_observations,
  "impots-prorogation": l_impots_prorogation,
  "impots-reclamation": l_impots_reclamation,
  "recours-cra": l_recours_cra,
  "remise-dette": l_remise_dette,
};

export const ORGANISMES = organismesJson.organismes as unknown as OrganismeFiche[];
export const CONTACTS = contactsJson.contacts as unknown as Contact[];
export const GLOSSAIRE = glossaireJson.termes as TermeGlossaire[];
