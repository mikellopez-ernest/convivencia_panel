function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function getActiveUserEmail_() {
  return normalizeEmail_(Session.getActiveUser().getEmail());
}

function isSchoolEmail_(email) {
  return normalizeEmail_(email).endsWith('@' + SCHOOL_DOMAIN);
}

function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function escapeForRegex_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueSorted_(values) {
  return Array.from(new Set(values.filter(Boolean)))
    .sort(function(a, b) {
      return a.localeCompare(b, 'ca');
    });
}

function parseDateOnly_(value, context) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return startOfDay_(value);
  }

  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) {
    throw new Error('Invalid date for ' + context + '. Expected dd/mm/yy or dd/mm/yyyy.');
  }

  const year = normalizeYear_(Number(match[3]));
  const month = Number(match[2]) - 1;
  const day = Number(match[1]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    throw new Error('Invalid date for ' + context + '.');
  }

  return startOfDay_(date);
}

function normalizeYear_(year) {
  return year < 100 ? 2000 + year : year;
}

function todayDateOnly_() {
  return startOfDay_(new Date());
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function addDays_(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isWeekend_(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function nextWorkDay_(date) {
  let candidate = addDays_(startOfDay_(date), 1);

  while (isWeekend_(candidate)) {
    candidate = addDays_(candidate, 1);
  }

  return candidate;
}

function addWorkDays_(date, workDays) {
  let candidate = startOfDay_(date);
  let remaining = Number(workDays || 0);

  while (remaining > 0) {
    candidate = addDays_(candidate, 1);

    if (!isWeekend_(candidate)) {
      remaining -= 1;
    }
  }

  return candidate;
}
