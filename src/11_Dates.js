function parseIncidentDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);

  if (!match) {
    return null;
  }

  const year = normalizeYear_(Number(match[3]));
  const month = Number(match[2]) - 1;
  const day = Number(match[1]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const date = new Date(year, month, day, hour, minute, second, 0);

  return isValidDateParts_(date, year, month, day) ? date : null;
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

  if (!isValidDateParts_(date, year, month, day)) {
    throw new Error('Invalid date for ' + context + '.');
  }

  return startOfDay_(date);
}

function normalizeYear_(year) {
  return year < 100 ? 2000 + year : year;
}

function isValidDateParts_(date, year, month, day) {
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

function todayDateOnly_() {
  return startOfDay_(new Date());
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatDateOnly_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function formatTimeOnly_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
}

function parseDateMaybe_(value) {
  try {
    return parseDateOnly_(value, 'date');
  } catch (error) {
    return null;
  }
}

function validateWeekday_(weekday, context) {
  const clean = String(weekday || '').trim().toLowerCase();

  if (WEEKDAY_KEYS.indexOf(clean) === -1) {
    throw new Error('Invalid weekday for ' + context + '. Expected monday, tuesday, wednesday, thursday, or friday.');
  }

  return clean;
}

function weekdayIndex_(weekday) {
  return WEEKDAY_KEYS.indexOf(validateWeekday_(weekday, 'weekday')) + 1;
}

function nextWeekdayAfter_(date, weekday) {
  const target = weekdayIndex_(weekday);
  let candidate = addDays_(startOfDay_(date), 1);

  while (candidate.getDay() !== target) {
    candidate = addDays_(candidate, 1);
  }

  return candidate;
}

function nextOrSameWeekday_(date, weekday) {
  const target = weekdayIndex_(weekday);
  let candidate = startOfDay_(date);

  while (candidate.getDay() !== target) {
    candidate = addDays_(candidate, 1);
  }

  return candidate;
}

function addDays_(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeekMonday_(date) {
  const day = date.getDay() || 7;

  return addDays_(startOfDay_(date), 1 - day);
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

