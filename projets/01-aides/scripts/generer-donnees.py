"""Génère data/baremes-2026.json et data/zones-apl.json pour projets/01-aides.
Valeurs lues dans les paramètres OpenFisca-France (commit 5cc65637, 23/10/2026),
qui citent le texte officiel (Légifrance / BO social) ; plus le guide Anah 2026."""
import sys, os, json, csv, yaml

OF = sys.argv[1]  # .../openfisca_france
OUT = sys.argv[2]  # dossier data/
P = os.path.join(OF, 'parameters')
VERIF = '2026-10-25'
VIA = 'Paramètres OpenFisca-France (github.com/openfisca/openfisca-france, commit 5cc6563 du 23/10/2026)'

def load(path):
    return yaml.safe_load(open(os.path.join(P, path + '.yaml'), encoding='utf-8'))

def ref_of(node, date):
    r = (node.get('metadata') or {}).get('reference')
    if isinstance(r, dict):
        keys = sorted([k for k in r if str(k) <= str(date)], key=str) or sorted(r, key=str)
        r = r[keys[-1]]
    if isinstance(r, list):
        r = next((x for x in r if isinstance(x, dict) and x.get('href')), r[0] if r else None)
    if isinstance(r, dict):
        return r.get('href') or r.get('title')
    return r

def val(path, note=None, statut=None):
    n = load(path)
    vals = n['values']
    k = sorted(vals, key=str)[-1]
    v = vals[k]
    v = v['value'] if isinstance(v, dict) else v
    src = ref_of(n, k) or 'A_VERIFIER'
    d = {'valeur': v, 'date_effet': str(k), 'source': src, 'verifie_le': VERIF, 'via': VIA}
    if note: d['note'] = note
    if statut: d['statut'] = statut
    if not str(src).startswith('http'):
        d['statut'] = 'A_VERIFIER'; d['note'] = (note or '') + ' Référence officielle sans URL dans OpenFisca : ' + str(src)
    return d

def bareme(path, kind='amount'):
    n = load(path)
    out = []
    for b in n['brackets']:
        t = b['threshold']; a = b.get(kind)
        lt = t[sorted(t, key=str)[-1]]; la = a[sorted(a, key=str)[-1]]
        out.append([lt['value'] if isinstance(lt, dict) else lt, la['value'] if isinstance(la, dict) else la])
    return out

def manuel(v, source, date_effet, note=None, statut=None, via=None):
    d = {'valeur': v, 'date_effet': date_effet, 'source': source, 'verifie_le': VERIF}
    if via: d['via'] = via
    if note: d['note'] = note
    if statut: d['statut'] = statut
    return d

PF = 'prestations_sociales/prestations_familiales'
MS = 'prestations_sociales/solidarite_insertion/minima_sociaux'
AL = 'prestations_sociales/aides_logement/allocations_logement'
B = {
  '_description': "Barèmes utilisés par le simulateur d'aides. Chaque valeur porte sa source officielle (URL), sa date d'effet et sa date de vérification. 'statut: A_VERIFIER' = valeur non confirmée sur la source officielle.",
  '_genere_le': VERIF,
  'smic': {
    'horaire_brut': val('marche_travail/salaire_minimum/smic/smic_b_horaire'),
    'mensuel_brut': val('marche_travail/salaire_minimum/smic/smic_b_mensuel'),
  },
  'prelevements': {
    'crds': val('prelevements_sociaux/contributions_sociales/crds'),
    'csg_imposable_activite': val('prelevements_sociaux/contributions_sociales/csg/activite/imposable'),
    'abattement_assiette_csg': manuel(0.0175, 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025013432', '2012-01-01', "Abattement de 1,75 % sur l'assiette CSG/CRDS des salaires (dans la limite de 4 plafonds de la Sécurité sociale).", via=VIA),
    'ratio_net_sur_brut': manuel(0.78, 'A_VERIFIER', 'A_VERIFIER', "Hypothèse du simulateur : salaire net ≈ 78 % du brut (salarié du privé non cadre). Sert seulement à passer du net au net imposable (CSG non déductible + CRDS).", statut='A_VERIFIER'),
  },
  'rsa': {
    'montant_base': val(MS + '/rsa/rsa_m/montant_de_base_du_rsa'),
    'majoration_2e_personne': val(MS + '/rsa/rsa_maj/maj_montant_max/couples_celibataire_avec_enfant'),
    'majoration_3e_personne': val(MS + '/rsa/rsa_maj/maj_montant_max/couple_1_enfant_ou_2e_enfant'),
    'majoration_enfant_supplementaire': val(MS + '/rsa/rsa_maj/maj_montant_max/par_enfant_supplementaire'),
    'majoration_isolement_base': val(MS + '/rsa/rsa_maj/majoration_isolement_en_base_rsa/femmes_enceintes'),
    'majoration_isolement_par_enfant': val(MS + '/rsa/rsa_maj/majoration_isolement_en_base_rsa/par_enfant_a_charge'),
    'age_limite_enfant_isolement': val(MS + '/rsa/rsa_cond/majoration_isolement/age_limite_enfant'),
    'forfait_logement_1_personne': val(MS + '/rsa/rsa_fl/forfait_logement/taux_1_personne'),
    'forfait_logement_2_personnes': val(MS + '/rsa/rsa_fl/forfait_logement/taux_2_personnes'),
    'forfait_logement_3_personnes': val(MS + '/rsa/rsa_fl/forfait_logement/taux_3_personnes_ou_plus'),
    'age_minimum': val(MS + '/rsa/rsa_cond/age_minimum_allocataire'),
    'montant_minimum_verse': val(MS + '/rsa/rsa_maj/montant_minimum_verse'),
  },
  'prime_activite': {
    'montant_base': val(MS + '/ppa/pa_m/montant_de_base'),
    'majoration_2e_personne': val(MS + '/ppa/pa_m/majoration_montant_maximal/couples_seul_avec_enfant'),
    'majoration_3e_personne': val(MS + '/ppa/pa_m/majoration_montant_maximal/couple_1_enfant_2e_enfant'),
    'majoration_enfant_supplementaire': val(MS + '/ppa/pa_m/majoration_montant_maximal/par_enfant_supplementaire'),
    'majoration_isolement_base': val(MS + '/ppa/pa_m/majoration_isolement/femmes_enceintes'),
    'majoration_isolement_par_enfant': val(MS + '/ppa/pa_m/majoration_isolement/par_enfant_charge'),
    'part_revenus_activite': val(MS + '/ppa/pa_m/majoration_ressources_revenus_activite'),
    'bonification_seuil_smic_horaire': val(MS + '/ppa/pa_m/bonification/seuil_bonification'),
    'bonification_seuil_max_smic_horaire': val(MS + '/ppa/pa_m/bonification/seuil_max_bonification'),
    'bonification_taux_max': val(MS + '/ppa/pa_m/bonification/taux_bonification_max'),
    'forfait_logement_1_personne': val(MS + '/ppa/pa_fl/taux_forfait_logement/foyer_1_personne'),
    'forfait_logement_2_personnes': val(MS + '/ppa/pa_fl/taux_forfait_logement/foyer_2_personnes'),
    'forfait_logement_3_personnes': val(MS + '/ppa/pa_fl/taux_forfait_logement/foyer_3_personnes'),
    'montant_minimum_verse': val(MS + '/ppa/pa_m/montant_minimum_verse'),
    'age_minimum': val(MS + '/ppa/pa_cond/age_min'),
    'plancher_apprenant_heures_smic': manuel(169, 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031087615', '2016-01-01', "Étudiants, stagiaires et apprentis : revenus d'activité ≥ 169 h × Smic horaire brut × 55 % (≈ 78 % du Smic net).", via=VIA),
    'plancher_apprenant_taux': val(PF + '/def_pac/revenu_plafond_pac_non_scolaire'),
  },
  'prestations_familiales': {
    'bmaf': val(PF + '/bmaf/bmaf'),
    'af_taux_2_enfants': val(PF + '/prestations_generales/af/af_cm/taux/enf2'),
    'af_taux_par_enfant_au_dela': val(PF + '/prestations_generales/af/af_cm/taux/enf3'),
    'af_majoration_age_taux': val(PF + '/prestations_generales/af/af_maj/maj_age_deux_enfants/taux1'),
    'af_majoration_age_seuil': manuel(14, 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053594174', '2026-03-01', "Décret 2026-138 : l'âge passe à 18 ans pour les enfants dont le 14e anniversaire est postérieur au 1er mars 2026. En pratique en 2026 : majoration pour les enfants ayant eu 14 ans avant le 1er mars 2026. Le simulateur applique 14 ans pour les enfants de 15 ans et plus, et 'à vérifier' pour ceux de 14 ans.", via=VIA),
    'af_majoration_age_seuil_nouveau': val(PF + '/prestations_generales/af/af_maj/maj_age_deux_enfants/age1'),
    'af_plafond_1_deux_enfants': val(PF + '/prestations_generales/af/af_cond_ress/plafond_tranche_1'),
    'af_plafond_2_deux_enfants': val(PF + '/prestations_generales/af/af_cond_ress/plafond_tranche_2'),
    'af_majoration_plafond_par_enfant': val(PF + '/prestations_generales/af/af_cond_ress/majoration_plafond_par_enfant_supplementaire'),
    'af_modulation_tranche_2': val(PF + '/prestations_generales/af/af_cm/modulation/taux_tranche_2'),
    'af_modulation_tranche_3': val(PF + '/prestations_generales/af/af_cm/modulation/taux_tranche_3'),
    'age_limite_enfant': val(PF + '/def_pac/enfants/age_limite'),
    'cf_taux_base': val(PF + '/prestations_generales/cf/cf_cm/complement_familial/taux_cf_base'),
    'cf_taux_majore': val(PF + '/prestations_generales/cf/cf_cm/complement_familial/taux_cf_majore'),
    'cf_nb_enfants_min': val(PF + '/prestations_generales/cf/cf_cm/nombre_d_enfants_minimal'),
    'cf_age_min': val(PF + '/prestations_generales/cf/cf_cm/age_min'),
    'cf_age_max': val(PF + '/prestations_generales/cf/cf_cm/age_max'),
    'cf_plafond_base': val(PF + '/prestations_generales/cf/cf_plaf/plafond_ressources_0_enfant'),
    'cf_majoration_2_premiers_enfants': val(PF + '/prestations_generales/cf/cf_plaf/majoration/deux_premiers_enf'),
    'cf_majoration_3e_enfant_et_plus': val(PF + '/prestations_generales/cf/cf_plaf/majoration/troisieme_enf_et_plus'),
    'cf_majoration_biactifs_isoles': val(PF + '/prestations_generales/cf/cf_plaf/majoration/biactifs_isoles'),
    'cf_coef_plafond_majore': val(PF + '/prestations_generales/cf/cf_plaf/plafond_cf_majore'),
    'ars_taux_6_10': val(PF + '/education_presence_parentale/ars/ars_m/taux_primaire'),
    'ars_taux_11_14': val(PF + '/education_presence_parentale/ars/ars_m/taux_college'),
    'ars_taux_15_18': val(PF + '/education_presence_parentale/ars/ars_m/taux_lycee'),
    'ars_plafond_base': val(PF + '/education_presence_parentale/ars/ars_plaf/plafond_ressources'),
    'ars_majoration_par_enfant': val(PF + '/education_presence_parentale/ars/ars_plaf/majoration_par_enf_supp'),
  },
  'aides_logement': {
    'abattement_frais_pro': manuel(0.10, 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041419358', '2021-01-01', "Approximation : les ressources retenues sont les revenus nets imposables (après abattement de 10 % pour frais professionnels) des 12 derniers mois.", statut='A_VERIFIER'),
    'arrondi_ressources': manuel(100, 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038878977', '2021-01-01', "Ressources arrondies à la centaine d'euros supérieure (d'après la formule OpenFisca).", via=VIA),
    'forfait_etudiant': val(AL + '/ressources/etudiants/locatif/dar_4_forfait_ressources'),
    'minoration_etudiant_boursier': val(AL + '/ressources/etudiants/locatif/dar_5_minoration_boursier'),
    'age_max_etudiant': val(AL + '/ressources/etudiants/age_max'),
    'abattement_double_activite': val(AL + '/ressources/abattements/dar_1_double_activite'),
    'minoration_forfaitaire': val(AL + '/locatif/minoration_forfaitaire'),
    'seuil_versement': val(AL + '/locatif/seuils_minimum_versement/non_apl'),
    'charges_base': val(AL + '/locatif/formule/c_forfait_charges/cas_general/cas_general'),
    'charges_par_enfant': val(AL + '/locatif/formule/c_forfait_charges/cas_general/majoration_par_enfant'),
    'charges_coloc_isole': val(AL + '/locatif/formule/c_forfait_charges/cas_colocataires/beneficiaire_isole'),
    'coef_colocation': val(AL + '/locatif/formule/l_plafonds_loyers/coef_chambre_et_colocation/coef_colocation'),
    'p0_taux': val(AL + '/locatif/formule/pp_particip_perso/p0_particip_min/p0_taux'),
    'p0_forfait': val(AL + '/locatif/formule/pp_particip_perso/p0_particip_min/p0_forfait'),
    'tl_seuil_1': val(AL + '/locatif/formule/pp_particip_perso/tp_taux/tl_loyer/seuils/seuil_1'),
    'tl_seuil_2': val(AL + '/locatif/formule/pp_particip_perso/tp_taux/tl_loyer/seuils/seuil_2'),
    'tl_taux_2': val(AL + '/locatif/formule/pp_particip_perso/tp_taux/tl_loyer/taux/tl_taux_2'),
    'tl_taux_3': val(AL + '/locatif/formule/pp_particip_perso/tp_taux/tl_loyer/taux/tl_taux_3'),
    'tf': {k: val(AL + '/locatif/formule/pp_particip_perso/tp_taux/tf_taille_famille/metropole/' + k) for k in
           ['personnes_isolees', 'couples_0_enfant', 'avec_1_enfant', 'avec_2_enfants', 'avec_3_enfants', 'avec_4_enfants', 'avec_5_enfants', 'avec_6_enfants', 'maj_par_enf_supp']},
    'r0': {k: val(AL + '/locatif/formule/pp_particip_perso/r0_abattement/cas_general/' + k, note="Non revalorisé pour 2026 (arrêté du 28/12/2025).") for k in
           ['taux_seul', 'taux_couple', 'taux1pac', 'taux2pac', 'taux3pac', 'taux4pac', 'taux5pac', 'taux6pac', 'taux_pac_supp']},
    'plafonds_loyer': {f'zone_{z}': {k: val(AL + f'/locatif/formule/l_plafonds_loyers/par_zone/zone_{z}/' + k) for k in
           ['personnes_seules', 'couples', 'un_enfant', 'majoration_par_enf_supp']} for z in (1, 2, 3)},
    'degressivite': {f'zone_{z}': {k: val(AL + f'/locatif/coefficients_degressivite_suppression/zone_{z}/' + k) for k in ['degressivite', 'suppression']} for z in (1, 2, 3)},
  },
  'cheque_energie': {
    'uc_premiere_personne': val('prestations_sociales/solidarite_insertion/autre_solidarite/cheque_energie/unites_consommation/premiere_personne', statut='A_VERIFIER', note="Référence officielle absente du fichier OpenFisca ; règle connue : 1 UC + 0,5 + 0,3 par personne supplémentaire."),
    'uc_deuxieme_personne': val('prestations_sociales/solidarite_insertion/autre_solidarite/cheque_energie/unites_consommation/deuxieme_personne', statut='A_VERIFIER'),
    'uc_autres_personnes': val('prestations_sociales/solidarite_insertion/autre_solidarite/cheque_energie/unites_consommation/autres_personnes', statut='A_VERIFIER'),
    'baremes': manuel({
        'une_uc': bareme('prestations_sociales/solidarite_insertion/autre_solidarite/cheque_energie/baremes/une_uc'),
        'entre_1_et_2_uc': bareme('prestations_sociales/solidarite_insertion/autre_solidarite/cheque_energie/baremes/une_uc_a_deux_uc'),
        'deux_uc_et_plus': bareme('prestations_sociales/solidarite_insertion/autre_solidarite/cheque_energie/baremes/plus_de_deux_ucs'),
      }, 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043178875/', '2021-01-01',
      "Tranches [seuil de RFR par UC, montant annuel en €]. Le dernier seuil (10 800 €) est le plafond d'éligibilité. Campagne 2026 non vérifiée sur chequeenergie.gouv.fr (site inaccessible).", statut='A_VERIFIER', via=VIA),
    'lien': manuel('https://chequeenergie.gouv.fr', 'https://chequeenergie.gouv.fr', '2026-01-01'),
  },
  'aah': {
    'montant_max': val('prestations_sociales/prestations_etat_de_sante/invalidite/aah/montant'),
    'age_minimal': val('prestations_sociales/prestations_etat_de_sante/invalidite/aah/age_minimal'),
    'taux_incapacite': val('prestations_sociales/prestations_etat_de_sante/invalidite/aah/taux_capacite/taux_incapacite'),
    'taux_incapacite_rsdae': val('prestations_sociales/prestations_etat_de_sante/invalidite/aah/taux_capacite/taux_incapacite_rsdae'),
    'plafond_multiple_montant': val('prestations_sociales/prestations_etat_de_sante/invalidite/aah/travail_esat/plafond_ressources_en_multiple_montant_base'),
    'majoration_plafond_par_enfant': val('prestations_sociales/prestations_etat_de_sante/invalidite/aah/majoration_plafond/majoration_par_enfant_supplementaire'),
  },
  'css': {
    'plafond_base': manuel(10421, 'https://www.complementaire-sante-solidaire.gouv.fr/sites/default/files/2026-05/2026%20Plafonds%20%26%20forfaits%20logement%20%26%20cotisations%20C2S.pdf', '2026-04-01',
        "Plafond annuel personne seule en métropole (CSS sans participation). Relevé via la fiche DSS citée en recherche web ; le PDF officiel n'a pas pu être téléchargé (accès bloqué). Valeur OpenFisca précédente : 10 166 € (avril 2024).", statut='A_VERIFIER'),
    'coef_2e_personne': val(MS + '/cs/cmu/coeff_p2'),
    'coef_3e_4e_personne': val(MS + '/cs/cmu/coeff_p3_p4'),
    'coef_5e_personne_et_plus': val(MS + '/cs/cmu/coeff_p5_plus'),
    'majoration_participation': val(MS + '/cs/acs/majoration_plafond_acs'),
    'participation_moins_30_ans': val(MS + '/cs/css/montant/france/cmu_moins_30_ans', statut='A_VERIFIER', note='Montant mensuel par personne ; référence officielle absente du fichier OpenFisca.'),
    'participation_30_49_ans': val(MS + '/cs/css/montant/france/cmu_30_49_ans', statut='A_VERIFIER'),
    'participation_50_59_ans': val(MS + '/cs/css/montant/france/cmu_50_59_ans', statut='A_VERIFIER'),
    'participation_60_69_ans': val(MS + '/cs/css/montant/france/cmu_60_69_ans', statut='A_VERIFIER'),
    'participation_70_ans_et_plus': val(MS + '/cs/css/montant/france/cmu_plus_69_ans', statut='A_VERIFIER'),
  },
  'bourse_superieur': {
    'age_maximum': val('prestations_sociales/education/bourses/enseignement_superieur/criteres_sociaux/age_maximum'),
    'nombre_mensualites': val('prestations_sociales/education/bourses/enseignement_superieur/criteres_sociaux/nombre_mensualites'),
    'points_par_enfant_a_charge': val('prestations_sociales/education/bourses/enseignement_superieur/criteres_sociaux/points_de_charge/charges_familiales/par_enfant_a_charge'),
    'points_par_enfant_etudiant': val('prestations_sociales/education/bourses/enseignement_superieur/criteres_sociaux/points_de_charge/charges_familiales/par_enfant_etudiant'),
    'points_distance': manuel([[0, 0], [30, 1], [250, 2]], 'https://www.education.gouv.fr/bo/20/Hebdo25/ESRS2013435C.htm', '2006-03-31', "[distance minimale en km, points]. La circulaire ajoute des cas outre-mer non gérés ici.", via=VIA),
    'montants_mensuels': manuel({e: m for e, m in zip(['0bis', '1', '2', '3', '4', '5', '6', '7'], [x[1] for x in bareme('prestations_sociales/education/bourses/enseignement_superieur/criteres_sociaux/montants')])},
        'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047483284', '2023-03-15', "Montants mensuels par échelon (versés sur 10 mois). Dernière revalorisation connue : rentrée 2023 ; à vérifier pour 2026-2027.", statut='A_VERIFIER', via=VIA),
    'plafonds_par_echelon': manuel({e: [x[1] for x in bareme(f'prestations_sociales/education/bourses/enseignement_superieur/criteres_sociaux/plafond_ressources/echelon_{e}')] for e in ['0bis', '1', '2', '3', '4', '5', '6', '7']},
        'https://www.education.gouv.fr/bo/20/Hebdo25/ESRS2013435C.htm', '2023-03-15', "Plafonds de revenu brut global des parents (avis N-2), indexés par nombre de points de charge (0 à 17).", statut='A_VERIFIER', via=VIA),
  },
  'mobili_jeune': {
    'age_maximum_exclu': val('prestations_sociales/education/mobilite/mobili_jeune/age_maximum'),
    'montant_minimum': val('prestations_sociales/education/mobilite/mobili_jeune/montant/minimum'),
    'montant_maximum': manuel(100, 'https://www.actionlogement.fr/l-aide-mobili-jeune', '2012-07-01', "Montant maximum mensuel (hors secteur agricole : 300 €). Site Action Logement inaccessible lors de la vérification.", statut='A_VERIFIER', via=VIA),
    'plafond_salaire_pct_smic': manuel(1.0, 'https://www.actionlogement.fr/l-aide-mobili-jeune', '2012-07-01', "Salaire brut mensuel ≤ 100 % du Smic.", statut='A_VERIFIER'),
  },
  'maprimerenov': {
    'plafonds_hors_idf': manuel({'tres_modestes': [17363, 25393, 30540, 35676, 40835], 'modestes': [22259, 32553, 39148, 45735, 52348], 'intermediaires': [31185, 45842, 55196, 64550, 73907],
                                  'par_personne_sup': {'tres_modestes': 5151, 'modestes': 6598, 'intermediaires': 9357}},
        'https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226', '2026-01-01', "Revenu fiscal de référence, par nombre de personnes du ménage (1 à 5), guide Anah « Les aides financières en 2026 », p. 7."),
    'plafonds_idf': manuel({'tres_modestes': [24031, 35270, 42357, 49455, 56580], 'modestes': [29253, 42933, 51564, 60208, 68877], 'intermediaires': [40851, 60051, 71846, 84562, 96817],
                             'par_personne_sup': {'tres_modestes': 7116, 'modestes': 8663, 'intermediaires': 12257}},
        'https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226', '2026-01-01', "Île-de-France, même guide, p. 7."),
    'exemple_pac_air_eau': manuel({'tres_modestes': 5000, 'modestes': 4000, 'intermediaires': 3000, 'superieurs': 0},
        'https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226', '2026-01-01', "Prime « par geste » pour une pompe à chaleur air/eau, donnée à titre d'exemple."),
    'renovation_ampleur_taux': manuel({'tres_modestes': 0.8, 'modestes': 0.6, 'intermediaires': 0.45, 'superieurs': 0.1},
        'https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226', '2026-01-01', "Taux de prise en charge d'une rénovation d'ampleur (gain de 2 classes, plafond 30 000 € HT)."),
    'departements_idf': manuel(['75', '77', '78', '91', '92', '93', '94', '95'], 'https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226', '2026-01-01'),
  },
  'frais_bancaires': {
    'plafond_frais_incidents_fragiles_mensuel': manuel(25, 'A_VERIFIER', '2020-11-01',
        "Plafond mensuel des frais d'incidents pour les clients en situation de fragilité financière (Code monétaire et financier, art. L312-1-3 et R312-4-3 ; décret 2020-889). Légifrance inaccessible lors de la vérification.", statut='A_VERIFIER'),
    'offre_specifique_cout_max_mensuel': manuel(3, 'A_VERIFIER', '2014-10-01',
        "Coût maximal de l'« offre spécifique » clientèle fragile. Légifrance inaccessible lors de la vérification.", statut='A_VERIFIER'),
    'offre_specifique_plafond_incidents_mensuel': manuel(20, 'A_VERIFIER', '2014-10-01', "Plafond mensuel des frais d'incidents pour les titulaires de l'offre spécifique.", statut='A_VERIFIER'),
    'seuil_revenu_indicatif_pct_smic': manuel(1.0, 'A_VERIFIER', 'A_VERIFIER',
        "Il n'existe pas de seuil national : chaque banque fixe ses critères de fragilité (incidents répétés, faibles ressources, inscription au fichier Banque de France, surendettement). Seuil indicatif retenu par le simulateur : ressources ≤ Smic brut mensuel.", statut='A_VERIFIER'),
  },
  'energie_protections': {
    'description': manuel("Le tarif social de l'électricité (TPN) a été supprimé fin 2017 et remplacé par le chèque énergie. Les bénéficiaires du chèque énergie gardent des protections : mise en service gratuite, abattement sur les frais en cas d'impayé, pas de réduction de puissance pendant la trêve hivernale.",
        'https://www.legifrance.gouv.fr/affichCodeArticle.do?idArticle=LEGIARTI000032497834&cidTexte=LEGITEXT000023983208', '2018-01-01', "Liste des protections non revérifiée en 2026 (sites officiels inaccessibles).", statut='A_VERIFIER'),
  },
}

os.makedirs(OUT, exist_ok=True)
json.dump(B, open(os.path.join(OUT, 'baremes-2026.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# Zones APL
A = os.path.join(OF, 'assets/apl')
rows = list(csv.DictReader(open(os.path.join(A, '20110914_zonage.csv'), encoding='utf-8')))
zone = {r['CODGEO']: int(r['Zonage'][0]) for r in rows}
sub = json.load(open(os.path.join(A, 'commune_depcom_by_subcommune_depcom.json')))
for s, c in sub.items():
    if c in zone: zone[s] = zone[c]
import collections
dep = collections.defaultdict(collections.Counter)
for r in rows: dep[r['DEP']][int(r['Zonage'][0])] += 1
Z = {
  'source': 'https://github.com/openfisca/openfisca-france/blob/master/openfisca_france/assets/apl/20110914_zonage.csv',
  'source_officielle': "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000422009 (arrêté du 17 mars 1978 modifié, zonage des aides au logement)",
  'verifie_le': VERIF,
  'date_effet': '2011-09-14',
  'statut': 'A_VERIFIER',
  'note': "Zonage APL par code commune INSEE (géographie 2014, + arrondissements et communes associées). Les communes nouvelles créées après 2014 n'y figurent pas : le simulateur utilise alors la zone la plus fréquente du département. La zone 1bis est fusionnée avec la zone 1. Toute commune absente des listes est en zone 3.",
  'zone_majoritaire_par_departement': {d: c.most_common(1)[0][0] for d, c in sorted(dep.items())},
  'communes_zone_1': sorted(k for k, v in zone.items() if v == 1),
  'communes_zone_2': sorted(k for k, v in zone.items() if v == 2),
  'nb_communes_connues': len(zone),
}
json.dump(Z, open(os.path.join(OUT, 'zones-apl.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ok', len(Z['communes_zone_1']), len(Z['communes_zone_2']))
