const DATABASE_PROPERTY_NAME = 'db';
const REGISTRY_TABLES_SHEET_NAME = 'tables';

const APP_NAME = 'Endpoints generals';
const SCHOOL_DOMAIN = 'iernestlluch.cat';

const DEFAULT_ENDPOINT = 'teacher_portal';
const ENDPOINT_EXPULSIONS_FORM = 'expulsions_form';
const ENDPOINT_DIMARTS = 'dimarts';
const ENDPOINT_PROJECTE_3R = 'projecte3r';

const TABLE_INCIDENCIES = 'Incidències';
const TABLE_DINANTIA = 'Dinantia';

const SHEET_INCIDENCIES_CONFIG = 'config';
const SHEET_EXPULSIONS = 'expulsions';
const SHEET_STUDY_GROUP_STUDENTS = 'study_group_students';
const SHEET_STUDY_GROUP_TEACHERS = 'study_group_teachers';
const SHEET_3R_PROJECT = '3r_project';
const SHEET_DINANTIA_GROUPS = 'dinantia_2_dades_alumnes';
const SHEET_STUDENTS_CACHE = 'students_cache';

const CONFIG_HEADERS = Object.freeze([
  'expulsions_email',
  'expulsions_folder',
  'expulsions_master_document',
  'expulsions_document_creators',
  'Dia_Grup_Estudi',
  '3r day',
  '3r teacher'
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

const STUDY_GROUP_STUDENT_HEADERS = Object.freeze([
  'id',
  'student_id',
  'row_id',
  'date',
  'student',
  'comment',
  'teacher_email'
]);

const STUDY_GROUP_TEACHER_HEADERS = Object.freeze([
  'id',
  'data',
  'teacher'
]);

const THIRD_PROJECT_HEADERS = Object.freeze([
  'id',
  'student_id',
  'row_id',
  'date',
  'student',
  'aprofitament',
  'teacher_email'
]);

const WEEKDAY_KEYS = Object.freeze(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

const CACHE_TTL_SECONDS = 600;
const TABLE_REGISTRY_CACHE_PREFIX = 'table-registry:';
