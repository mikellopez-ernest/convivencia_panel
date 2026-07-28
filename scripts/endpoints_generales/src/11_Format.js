function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function getActiveUserEmail_() {
  return normalizeEmail_(Session.getActiveUser().getEmail());
}

function isSchoolEmail_(email) {
  return normalizeEmail_(email).endsWith('@' + SCHOOL_DOMAIN);
}
