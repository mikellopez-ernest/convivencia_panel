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

function toDisplayString_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeText_(value) {
  return toDisplayString_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('ca');
}

function splitCommaList_(value) {
  return toDisplayString_(value)
    .split(',')
    .map(function(item) {
      return toDisplayString_(item);
    })
    .filter(Boolean);
}

function escapeHtml_(value) {
  return toDisplayString_(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
