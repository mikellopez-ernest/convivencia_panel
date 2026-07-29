const DATABASE_PROPERTY_NAME = 'db';
const REGISTRY_TABLES_SHEET_NAME = 'tables';

const APP_NAME = 'Endpoints generals';
const SCHOOL_DOMAIN = 'iernestlluch.cat';

const DEFAULT_ENDPOINT = 'teacher_portal';
const ENDPOINT_EXPULSIONS_FORM = 'expulsions_form';

const TABLE_INCIDENCIES = 'Incidències';
const TABLE_DINANTIA = 'Dinantia';

const SHEET_INCIDENCIES_CONFIG = 'config';
const SHEET_EXPULSIONS = 'expulsions';
const SHEET_DINANTIA_GROUPS = 'dinantia_2_dades_alumnes';
const SHEET_STUDENTS_CACHE = 'students_cache';

const CONFIG_HEADERS = Object.freeze([
  'expulsions_email',
  'expulsions_folder',
  'expulsions_master_document',
  'expulsions_document_creators'
]);

const DINANTIA_GROUP_HEADERS = Object.freeze([
  'id',
  'dinantia_group_name',
  'dades_alumnes_sheet',
  'dinantia_group_name_incidencies'
]);

const STUDENTS_CACHE_HEADERS = Object.freeze([
  'student_id',
  'student_name',
  'student_email',
  'group_name'
]);

const EXPULSION_HEADERS = Object.freeze([
  'id',
  'student_id',
  'row_id',
  'date',
  'student',
  'class',
  'start_date',
  'return_date',
  'incident',
  'document',
  'teacher_email'
]);

const CACHE_TTL_SECONDS = 600;
const TABLE_REGISTRY_CACHE_PREFIX = 'table-registry:';
