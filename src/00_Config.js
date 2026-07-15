const DATABASE_PROPERTY_NAME = 'db';
const REGISTRY_TABLES_SHEET_NAME = 'tables';

const INCIDENTS_TABLE_NAME = 'Incidències';
const INCIDENTS_SHEET_NAME = 'llistat_anual';
const INCIDENTS_CONFIG_SHEET_NAME = 'config';
const INCIDENTS_MEETING_RECORDS_SHEET_NAME = 'meeting_records';
const INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME = 'study_group_students';
const INCIDENTS_STUDY_GROUP_TEACHERS_SHEET_NAME = 'study_group_teachers';
const INCIDENTS_3R_PROJECT_SHEET_NAME = '3r_project';
const INCIDENTS_EXPULSIONS_SHEET_NAME = 'expulsions';

const ACCESS_DENIED_MESSAGE = 'No tens accés a aquesta aplicació';
const OUT_OF_PERIOD_MESSAGE = 'Actualment no ens trobem en cap període acadèmic';
const NO_INCIDENTS_MESSAGE = 'No hi ha incidències en aquest període';
const IMPORT_API_ERROR_MESSAGE = "No s'ha pogut descarregar l'informe des de l'API";

const CACHE_TTL_SECONDS = 600;
const TABLE_REGISTRY_CACHE_PREFIX = 'table-registry:';
const INCIDENT_CONFIG_CACHE_KEY = 'incidents-config:v1';

const TRACKING_REPORT_API_URL_PROPERTY = 'tracking_report_api_url';
const TRACKING_REPORT_BEARER_PROPERTY = 'tracking_report_bearer';
const TRACKING_REPORT_SCHOOL_YEAR_PROPERTY = 'tracking_report_school_year';
