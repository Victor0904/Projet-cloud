// Jeux de données ouverts utilisés par l'import (tous sur data.education.gouv.fr, API Opendatasoft v2.1,
// sans clé). Chaque jeu est téléchargé département par département (filtre sur le préfixe UAI ou le code
// département) pour rester léger.

export const BASE_API = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets";
export const pageJeu = (id: string) => `https://data.education.gouv.fr/explore/dataset/${id}/information/`;

export type Departement = {
  /** Code tel qu'écrit par l'INSEE : "54", "2A", "974". */
  code: string;
  /** Code sur 3 caractères utilisé par l'annuaire et la carte scolaire : "054", "620"... */
  code3: string;
  /** Préfixe des UAI (identifiants d'établissement) du département. */
  prefixeUai: string;
  nom: string;
};

/** Départements importés. Pour en ajouter un, compléter cette liste puis relancer les deux scripts. */
export const DEPARTEMENTS: Departement[] = [
  { code: "54", code3: "054", prefixeUai: "054", nom: "Meurthe-et-Moselle" },
  { code: "57", code3: "057", prefixeUai: "057", nom: "Moselle" },
  { code: "75", code3: "075", prefixeUai: "075", nom: "Paris" },
  { code: "69", code3: "069", prefixeUai: "069", nom: "Rhône" },
  { code: "31", code3: "031", prefixeUai: "031", nom: "Haute-Garonne" },
];

export type Jeu = {
  cle: string;
  id: string;
  titre: string;
  /** Clause ODSQL de filtre pour un département. */
  where: (d: Departement) => string;
  select?: string;
  /** Jeu national (non filtré par département), téléchargé une seule fois. */
  national?: boolean;
};

const parUai = (champ: string) => (d: Departement) => `startswith(${champ}, "${d.prefixeUai}")`;

export const JEUX: Jeu[] = [
  {
    cle: "annuaire",
    id: "fr-en-annuaire-education",
    titre: "Annuaire de l'éducation",
    where: (d) =>
      `code_departement="${d.code3}" and etat="OUVERT" and (type_etablissement="Ecole" or type_etablissement="Collège" or type_etablissement="Lycée")`,
    select: [
      "identifiant_de_l_etablissement", "nom_etablissement", "type_etablissement", "statut_public_prive",
      "type_contrat_prive", "adresse_1", "code_postal", "code_commune", "nom_commune", "telephone", "web", "mail",
      "ecole_maternelle", "ecole_elementaire", "voie_generale", "voie_technologique", "voie_professionnelle",
      "restauration", "hebergement", "ulis", "segpa", "section_arts", "section_cinema", "section_theatre",
      "section_sport", "section_internationale", "section_europeenne", "lycee_agricole", "lycee_militaire",
      "lycee_des_metiers", "post_bac", "appartenance_education_prioritaire", "fiche_onisep", "latitude",
      "longitude", "libelle_nature", "date_maj_ligne", "etablissement_mere",
    ].join(","),
  },
  {
    cle: "ivac",
    id: "fr-en-indicateurs-valeur-ajoutee-colleges",
    titre: "Indicateurs de valeur ajoutée des collèges (IVAC)",
    where: parUai("uai"),
    select:
      "session,uai,nb_candidats_g,taux_de_reussite_g,va_du_taux_de_reussite_g,note_a_l_ecrit_g,va_de_la_note_g,taux_d_acces_6eme_3eme,nb_mentions_global_g",
  },
  {
    cle: "ival_gt",
    id: "fr-en-indicateurs-de-resultat-des-lycees-gt_v2",
    titre: "Indicateurs de valeur ajoutée des lycées généraux et technologiques (IVAL)",
    where: (d) => `${parUai("uai")(d)} and annee>=date'2021-01-01'`,
    select: "annee,uai,presents_total,taux_reu_total,va_reu_total,taux_acces_2nde,va_acces_2nde,taux_men_total,va_men_total",
  },
  {
    cle: "ival_pro",
    id: "fr-en-indicateurs-de-resultat-des-lycees-pro_v2",
    titre: "Indicateurs de valeur ajoutée des lycées professionnels (IVAL)",
    where: (d) => `${parUai("uai")(d)} and annee>=date'2021-01-01'`,
    select: "annee,uai,presents_total,taux_reu_total,va_reu_total,taux_acces_2nde,va_acces_2nde,taux_men_total,va_men_total",
  },
  {
    cle: "ips_ecoles",
    id: "fr-en-ips-ecoles-ap2022",
    titre: "Indices de position sociale des écoles (à partir de 2022)",
    where: parUai("uai"),
    select: "rentree_scolaire,uai,ips,ips_national,ips_academique,ips_departemental",
  },
  {
    cle: "ips_colleges",
    id: "fr-en-ips-colleges-ap2023",
    titre: "Indices de position sociale des collèges (à partir de 2023)",
    where: parUai("uai"),
    select: "rentree_scolaire,uai,ips,ecart_type_de_l_ips,ips_national,ips_academique,ips_departemental",
  },
  {
    cle: "ips_lycees",
    id: "fr-en-ips-lycees-ap2023",
    titre: "Indices de position sociale des lycées (à partir de 2023)",
    where: parUai("uai"),
    select:
      "rentree_scolaire,uai,type_de_lycee,ips_etab,ips_voie_gt,ips_voie_pro,ips_national_legt,ips_national_lpo,ips_national_lp,ips_departemental_legt,ips_departemental_lpo,ips_departemental_lp,ips_academique_legt,ips_academique_lpo,ips_academique_lp",
  },
  {
    cle: "eff_ecoles",
    id: "fr-en-ecoles-effectifs-nb_classes",
    titre: "Effectifs d'élèves par école",
    where: (d) => `${parUai("numero_ecole")(d)} and rentree_scolaire>=date'2022-01-01'`,
    select: "rentree_scolaire,numero_ecole,nombre_total_eleves,nombre_total_classes",
  },
  {
    cle: "eff_colleges",
    id: "fr-en-college-effectifs-niveau-sexe-lv",
    titre: "Effectifs d'élèves en collège",
    where: (d) => `${parUai("numero_college")(d)} and rentree_scolaire>=date'2022-01-01'`,
    select: "rentree_scolaire,numero_college,nombre_eleves_total",
  },
  {
    cle: "eff_lycees",
    id: "fr-en-lycee_gt-effectifs-niveau-sexe-lv",
    titre: "Effectifs d'élèves en lycée général et technologique",
    where: (d) => `${parUai("numero_lycee")(d)} and rentree_scolaire>=date'2022-01-01'`,
    select: "rentree_scolaire,numero_lycee,nombre_d_eleves",
  },
  {
    cle: "eff_lp",
    id: "fr-en-lycee_pro-effectifs-niveau-sexe-lv",
    titre: "Effectifs d'élèves en lycée professionnel",
    where: (d) => `${parUai("numero_lycee")(d)} and rentree_scolaire>=date'2022-01-01'`,
    select: "rentree_scolaire,numero_lycee,nombre_d_eleves",
  },
  {
    cle: "langues",
    id: "fr-en-offre-langues-2d",
    titre: "Offre de langues dans les collèges et lycées",
    where: parUai("uai"),
    select: "uai,enseignements,langues",
  },
  {
    cle: "carte_scolaire",
    id: "fr-en-carte-scolaire-colleges-publics",
    titre: "Carte scolaire des collèges publics",
    where: (d) => `code_departement="${d.code3}"`,
    select:
      "code_insee,libelle_commune,lieu_dit,type_et_libelle,n_de_voie_debut,indice_de_repetition_debut,n_de_voie_fin,indice_de_repetition_fin,parite,code_rne,secteur_unique",
  },
  {
    cle: "sections_internationales",
    id: "fr-en-sections-internationales",
    titre: "Sections internationales et BFI",
    national: true,
    where: () => "",
    select: "annee,section,uai,niveau",
  },
];
