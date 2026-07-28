function parsePoints_(value) {
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }

  const text = String(value === null || value === undefined ? '' : value)
    .trim()
    .replace(',', '.');

  if (!text) {
    return null;
  }

  const numberValue = Number(text);

  return isFinite(numberValue) ? numberValue : null;
}

function escapeForRegex_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function getActiveUserEmail_() {
  return normalizeEmail_(Session.getActiveUser().getEmail());
}

function isAuthorizedUser_(activeUser, authorizedUsers) {
  if (!activeUser) {
    return false;
  }

  return authorizedUsers.indexOf(normalizeEmail_(activeUser)) !== -1;
}

function hasAnyValue_(row) {
  return row.some(function(value) {
    return String(value || '').trim() !== '';
  });
}

function uniqueSorted_(values) {
  return Array.from(new Set(values.filter(Boolean)))
    .sort(function(a, b) {
      return a.localeCompare(b, 'ca');
    });
}

