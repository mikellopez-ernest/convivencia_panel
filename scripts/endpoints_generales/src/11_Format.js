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

function parseDateMaybe_(value) {
  try {
    return parseDateOnly_(value, 'date');
  } catch (error) {
    return null;
  }
}

function addDays_(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function validateWeekday_(weekday, context) {
  const cleanWeekday = String(weekday || '').trim().toLowerCase();
  const allowed = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  if (allowed.indexOf(cleanWeekday) === -1) {
    throw new Error('Invalid weekday for ' + context + ': ' + weekday + '.');
  }

  return cleanWeekday;
}

function weekdayIndex_(weekday) {
  return {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  }[weekday];
}

function nextOrSameWeekday_(date, weekday) {
  const target = weekdayIndex_(weekday);
  const base = startOfDay_(date);
  const offset = (target - base.getDay() + 7) % 7;

  return addDays_(base, offset);
}

function startOfWeekMonday_(date) {
  const base = startOfDay_(date);
  const day = base.getDay() || 7;

  return addDays_(base, 1 - day);
}

function sameWeekWeekday_(date, weekday) {
  const monday = startOfWeekMonday_(date);

  return addDays_(monday, weekdayIndex_(weekday) - 1);
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
