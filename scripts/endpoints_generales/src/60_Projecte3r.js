function buildProjecte3rPayload_(monthDateText) {
  const activeUser = assertSchoolUser_();
  const settings = loadProjecte3rSettings_();
  const baseDate = monthDateText
    ? parseDateOnly_(monthDateText, 'month date')
    : todayDateOnly_();
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const calendarStart = startOfWeekMonday_(monthStart);
  const calendarEnd = addDays_(startOfWeekMonday_(monthEnd), 4);
  const assignmentsByDate = loadProjecte3rAssignmentsByDate_(calendarStart, calendarEnd);
  const weeks = [];
  let cursor = calendarStart;

  while (cursor.getTime() <= calendarEnd.getTime()) {
    const cells = [];

    for (let day = 0; day < WEEKDAY_KEYS.length; day += 1) {
      const date = addDays_(cursor, day);
      const dateKey = formatDateOnly_(date);
      const weekday = WEEKDAY_KEYS[day];

      cells.push({
        date: dateKey,
        inMonth: date.getMonth() === monthStart.getMonth(),
        weekday: weekday,
        teacher: settings.thirdProjectTeachers[weekday] || '',
        assignments: assignmentsByDate[dateKey] || []
      });
    }

    weeks.push(cells);
    cursor = addDays_(cursor, 7);
  }

  return {
    ok: true,
    status: 'ok',
    endpoint: ENDPOINT_PROJECTE_3R,
    activeUser: activeUser,
    monthDate: formatDateOnly_(monthStart),
    month: monthStart.getMonth(),
    year: monthStart.getFullYear(),
    weeks: weeks,
    outcomeOptions: [
      'Fet amb aprofitament',
      'Absent o no aprofitat'
    ]
  };
}

function saveProjecte3rOutcomes_(updates) {
  const activeUser = assertSchoolUser_();
  const cleanUpdates = Array.isArray(updates) ? updates : [];
  const allowed = {
    '': true,
    'Fet amb aprofitament': true,
    'Absent o no aprofitat': true
  };

  if (!cleanUpdates.length) {
    return {
      ok: true,
      status: 'empty',
      message: STRINGS.projecte3r.emptySave,
      savedCount: 0
    };
  }

  const savedCount = withScriptLock_('3r_project outcomes', function() {
    const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_3R_PROJECT);
    const headers = requireHeaders_(sheet, THIRD_PROJECT_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_3R_PROJECT);
    const rowById = {};

    getDataRows_(sheet).forEach(function(row, index) {
      const id = String(row[headers.id] || '').trim();

      if (id) {
        rowById[id] = index + 2;
      }
    });

    cleanUpdates.forEach(function(update) {
      const id = String(update && update.id || '').trim();
      const aprofitament = String(update && update.aprofitament || '').trim();
      const sheetRow = rowById[id];

      if (!sheetRow) {
        throw new Error('No s’ha trobat el registre 3R amb id ' + id + '.');
      }

      if (!allowed[aprofitament]) {
        throw new Error('Valor d’aprofitament no vàlid: ' + aprofitament + '.');
      }

      sheet.getRange(sheetRow, headers.aprofitament + 1).setValue(aprofitament);
      sheet.getRange(sheetRow, headers.teacher_email + 1).setValue(activeUser);
    });

    return cleanUpdates.length;
  });

  return {
    ok: true,
    status: 'saved',
    message: STRINGS.projecte3r.saved,
    savedCount: savedCount
  };
}

function loadProjecte3rSettings_() {
  const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_INCIDENCIES_CONFIG);
  const headers = requireHeaders_(sheet, ['3r day', '3r teacher'], TABLE_INCIDENCIES + '.' + SHEET_INCIDENCIES_CONFIG);
  const teachers = {};

  getDataRows_(sheet).forEach(function(row) {
    const day = String(row[headers['3r day']] || '').trim().toLowerCase();
    const teacher = String(row[headers['3r teacher']] || '').trim();

    if (day && teacher) {
      teachers[validateWeekday_(day, '3r day')] = teacher;
    }
  });

  return {
    thirdProjectTeachers: teachers
  };
}

function loadProjecte3rAssignmentsByDate_(startDate, endDate) {
  const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_3R_PROJECT);
  const headers = requireHeaders_(sheet, THIRD_PROJECT_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_3R_PROJECT);
  const start = startOfDay_(startDate).getTime();
  const end = startOfDay_(endDate).getTime();
  const byDate = {};

  getDataRows_(sheet).forEach(function(row, index) {
    const date = parseDateMaybe_(row[headers.date]);

    if (!date) {
      return;
    }

    const time = date.getTime();

    if (time < start || time > end) {
      return;
    }

    const dateKey = formatDateOnly_(date);

    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }

    byDate[dateKey].push({
      rowNumber: index + 2,
      id: String(row[headers.id] || '').trim(),
      studentId: String(row[headers.student_id] || '').trim(),
      rowId: String(row[headers.row_id] || '').trim(),
      date: dateKey,
      student: String(row[headers.student] || '').trim(),
      aprofitament: String(row[headers.aprofitament] || '').trim(),
      teacherEmail: String(row[headers.teacher_email] || '').trim()
    });
  });

  return byDate;
}
