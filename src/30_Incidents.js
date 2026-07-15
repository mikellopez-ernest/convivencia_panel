const CONFIG_HEADERS = Object.freeze([
  '1r trimestre',
  '2n trimestre',
  '3r trimestre',
  'Fi curs',
  'Grups',
  'Users',
  'Mesures_restauratives',
  'Dia_Grup_Estudi',
  '3r day',
  '3r teacher',
  'expulsions_email',
  'expulsions_folder',
  'expulsions_master_document',
  'expulsions_document_creators'
]);

const INCIDENT_HEADERS = Object.freeze([
  'Id',
  'Alumne',
  'Grups',
  'Activitat',
  'Assignatura',
  'Puntuació',
  'Data',
  'Professor',
  'Missatge',
  'Nota interna'
]);

const MEETING_RECORD_HEADERS = Object.freeze([
  'Id',
  'Data',
  'Alumne',
  'Grup',
  'Punts',
  'Comentari',
  'Mesura'
]);

const STUDY_GROUP_STUDENT_HEADERS = Object.freeze([
  'id',
  'date',
  'student',
  'comment'
]);

const STUDY_GROUP_TEACHER_HEADERS = Object.freeze([
  'id',
  'data',
  'teacher'
]);

const THIRD_PROJECT_HEADERS = Object.freeze([
  'id',
  'date',
  'student',
  'aprofitament'
]);

const EXPULSION_HEADERS = Object.freeze([
  'id',
  'date',
  'student',
  'class',
  'start_date',
  'return_date',
  'incident',
  'document'
]);

const WEEKDAY_KEYS = Object.freeze(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

function buildIncidentPointsPayload_(selectedDateText) {
  const timer = createTimer_('buildIncidentPointsPayload');
  const selectedDate = selectedDateText
    ? parseDateOnly_(selectedDateText, 'selected date')
    : todayDateOnly_();
  const config = loadIncidentConfig_();
  timer.mark('config loaded');
  const activeUser = getActiveUserEmail_();

  if (!isAuthorizedUser_(activeUser, config.users)) {
    return {
      ok: true,
      status: 'unauthorized',
      message: ACCESS_DENIED_MESSAGE,
      selectedDate: formatDateOnly_(selectedDate),
      activeUser: activeUser,
      rows: [],
      issues: []
    };
  }

  const term = detectTerm_(selectedDate, config);

  if (!term) {
    return {
      ok: true,
      status: 'out_of_period',
      message: OUT_OF_PERIOD_MESSAGE,
      selectedDate: formatDateOnly_(selectedDate),
      activeUser: activeUser,
      rows: [],
      issues: []
    };
  }

  const result = loadAndAggregateIncidents_(term.start, selectedDate, config.groups);
  timer.mark('incidents aggregated');
  const meetingPrefills = loadMeetingRecordPrefills_(selectedDate);
  timer.mark('meeting prefills loaded');
  const rows = result.rows.map(function(row) {
    const prefill = meetingPrefills[row.id] || null;

    return Object.assign({}, row, {
      savedRecord: prefill
    });
  });

  const payload = {
    ok: true,
    status: rows.length ? 'ok' : 'empty',
    message: rows.length ? '' : NO_INCIDENTS_MESSAGE,
    selectedDate: formatDateOnly_(selectedDate),
    activeUser: activeUser,
    term: {
      key: term.key,
      label: term.label,
      start: formatDateOnly_(term.start),
      end: formatDateOnly_(term.end)
    },
    restorativeMeasures: config.restorativeMeasures,
    rows: rows,
    issues: result.issues
  };
  timer.done();

  return payload;
}

function loadIncidentConfig_() {
  const cached = CacheService.getScriptCache().get(INCIDENT_CONFIG_CACHE_KEY);

  if (cached) {
    return deserializeIncidentConfig_(JSON.parse(cached));
  }

  const config = loadIncidentConfigFresh_();
  CacheService.getScriptCache().put(INCIDENT_CONFIG_CACHE_KEY, JSON.stringify(serializeIncidentConfig_(config)), CACHE_TTL_SECONDS);

  return config;
}

function loadIncidentConfigFresh_() {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_CONFIG_SHEET_NAME);
  const headers = requireHeaders_(sheet, CONFIG_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_CONFIG_SHEET_NAME);
  const values = getDataRows_(sheet);
  const dateRow = values.find(function(row) {
    return row[headers['1r trimestre']] || row[headers['2n trimestre']] || row[headers['3r trimestre']] || row[headers['Fi curs']];
  });

  if (!dateRow) {
    throw new Error('No config row with term dates was found.');
  }

  const config = {
    firstTerm: parseDateOnly_(dateRow[headers['1r trimestre']], '1r trimestre'),
    secondTerm: parseDateOnly_(dateRow[headers['2n trimestre']], '2n trimestre'),
    thirdTerm: parseDateOnly_(dateRow[headers['3r trimestre']], '3r trimestre'),
    endOfYear: parseDateOnly_(dateRow[headers['Fi curs']], 'Fi curs'),
    groups: readColumnValues_(values, headers.Grups),
    users: readColumnValues_(values, headers.Users).map(normalizeEmail_),
    restorativeMeasures: readColumnValues_(values, headers.Mesures_restauratives),
    studyGroupDay: firstColumnValue_(values, headers.Dia_Grup_Estudi).toLowerCase(),
    thirdProjectTeachers: readThirdProjectTeachers_(values, headers),
    expulsions: {
      email: firstColumnValue_(values, headers.expulsions_email),
      folderId: firstColumnValue_(values, headers.expulsions_folder),
      masterDocumentId: firstColumnValue_(values, headers.expulsions_master_document),
      creators: readColumnValues_(values, headers.expulsions_document_creators)
    }
  };

  validateConfig_(config);

  return config;
}

function serializeIncidentConfig_(config) {
  return Object.assign({}, config, {
    firstTerm: formatDateOnly_(config.firstTerm),
    secondTerm: formatDateOnly_(config.secondTerm),
    thirdTerm: formatDateOnly_(config.thirdTerm),
    endOfYear: formatDateOnly_(config.endOfYear)
  });
}

function deserializeIncidentConfig_(config) {
  return Object.assign({}, config, {
    firstTerm: parseDateOnly_(config.firstTerm, '1r trimestre'),
    secondTerm: parseDateOnly_(config.secondTerm, '2n trimestre'),
    thirdTerm: parseDateOnly_(config.thirdTerm, '3r trimestre'),
    endOfYear: parseDateOnly_(config.endOfYear, 'Fi curs')
  });
}

function validateConfig_(config) {
  if (!(config.firstTerm < config.secondTerm && config.secondTerm < config.thirdTerm && config.thirdTerm <= config.endOfYear)) {
    throw new Error('Config dates must be chronological: 1r trimestre < 2n trimestre < 3r trimestre <= Fi curs.');
  }

  if (!config.groups.length) {
    throw new Error('Config sheet must contain at least one group in "Grups".');
  }

  if (!config.users.length) {
    throw new Error('Config sheet must contain at least one authorized user in "Users".');
  }
}

function firstColumnValue_(values, columnIndex) {
  const found = readColumnValues_(values, columnIndex);

  return found.length ? found[0] : '';
}

function readThirdProjectTeachers_(values, headers) {
  const teachers = {};

  values.forEach(function(row) {
    const day = String(row[headers['3r day']] || '').trim().toLowerCase();
    const teacher = String(row[headers['3r teacher']] || '').trim();

    if (day && teacher) {
      teachers[day] = teacher;
    }
  });

  return teachers;
}

function assertAuthorized_(config) {
  const activeUser = getActiveUserEmail_();

  if (!isAuthorizedUser_(activeUser, config.users)) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }

  return activeUser;
}

function loadMeetingRecordPrefills_(selectedDate) {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const headers = requireHeaders_(sheet, MEETING_RECORD_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const selectedDateKey = formatDateOnly_(selectedDate);
  const prefills = {};

  getDataRows_(sheet).forEach(function(row, index) {
    const rowDate = parseDateMaybe_(row[headers.Data]);
    const id = String(row[headers.Id] || '').trim();

    if (!id || !rowDate || formatDateOnly_(rowDate) !== selectedDateKey) {
      return;
    }

    prefills[id] = {
      rowNumber: index + 2,
      id: id,
      data: selectedDateKey,
      comentari: String(row[headers.Comentari] || '').trim(),
      mesura: String(row[headers.Mesura] || '').trim()
    };
  });

  return prefills;
}

function deleteLatestMeetingRecord_(studentId, selectedDateText) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const cleanId = String(studentId || '').trim();

  if (!cleanId) {
    throw new Error('Student Id is required.');
  }

  const selectedDate = parseDateOnly_(selectedDateText, 'selected date');
  const selectedDateKey = formatDateOnly_(selectedDate);
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const headers = requireHeaders_(sheet, MEETING_RECORD_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  let targetRow = 0;

  getDataRows_(sheet).forEach(function(row, index) {
    const rowDate = parseDateMaybe_(row[headers.Data]);
    const id = String(row[headers.Id] || '').trim();

    if (id === cleanId && rowDate && formatDateOnly_(rowDate) === selectedDateKey) {
      targetRow = index + 2;
    }
  });

  if (!targetRow) {
    return {
      ok: true,
      status: 'not_found',
      message: STRINGS.meetingRecords.deleteNotFound
    };
  }

  sheet.deleteRow(targetRow);

  return {
    ok: true,
    status: 'deleted',
    message: STRINGS.meetingRecords.deleted,
    id: cleanId,
    deletedRow: targetRow
  };
}

function saveSingleMeetingRecord_(record, selectedDateText) {
  const result = saveMeetingRecords_([record], selectedDateText);

  if (!result.ok) {
    return result;
  }

  return Object.assign({}, result, {
    record: normalizeMeetingRecordInput_(record)
  });
}

function saveMeetingRecords_(records, selectedDateText) {
  const timer = createTimer_('saveMeetingRecords');
  const config = loadIncidentConfig_();
  const activeUser = getActiveUserEmail_();

  if (!isAuthorizedUser_(activeUser, config.users)) {
    return {
      ok: true,
      status: 'unauthorized',
      message: ACCESS_DENIED_MESSAGE,
      savedCount: 0,
      rowResults: []
    };
  }

  const selectedDate = parseDateOnly_(selectedDateText, 'selected date');
  const cleanRecords = Array.isArray(records) ? records : [];
  const editedRecords = cleanRecords
    .map(normalizeMeetingRecordInput_)
    .filter(function(record) {
      return record.comentari || record.mesura;
    });

  if (!editedRecords.length) {
    return {
      ok: true,
      status: 'empty',
      message: STRINGS.save.empty,
      savedCount: 0,
      rowResults: []
    };
  }

  const allowedMeasures = {};
  config.restorativeMeasures.forEach(function(measure) {
    allowedMeasures[String(measure).trim()] = true;
  });

  const errors = [];

  editedRecords.forEach(function(record, index) {
    const prefix = 'Row ' + (index + 1) + ': ';

    if (!record.id) errors.push(prefix + 'missing Id.');
    if (!record.alumne) errors.push(prefix + 'missing Alumne.');
    if (!record.grup) errors.push(prefix + 'missing Grup.');
    if (record.punts === null) errors.push(prefix + 'invalid Punts.');
    if (record.mesura && !allowedMeasures[record.mesura]) {
      errors.push(prefix + 'invalid Mesura "' + record.mesura + '".');
    }
  });

  if (errors.length) {
    return {
      ok: false,
      status: 'validation_error',
      message: STRINGS.save.failed,
      savedCount: 0,
      errors: errors,
      rowResults: []
    };
  }

  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const headers = requireHeaders_(sheet, MEETING_RECORD_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const rows = editedRecords.map(function(record) {
    const row = new Array(sheet.getLastColumn()).fill('');

    row[headers.Id] = record.id;
    row[headers.Data] = formatDateOnly_(selectedDate);
    row[headers.Alumne] = record.alumne;
    row[headers.Grup] = record.grup;
    row[headers.Punts] = record.punts;
    row[headers.Comentari] = record.comentari;
    row[headers.Mesura] = record.mesura;

    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  timer.mark('rows appended');
  timer.done();

  return {
    ok: true,
    status: 'saved',
    message: STRINGS.save.success,
    savedCount: rows.length,
    rowResults: editedRecords.map(function(record) {
      return {
        id: record.id,
        ok: true
      };
    })
  };
}

function normalizeMeetingRecordInput_(record) {
  const raw = record || {};

  return {
    id: String(raw.id || '').trim(),
    alumne: String(raw.alumne || '').trim(),
    grup: String(raw.grup || '').trim(),
    punts: parsePoints_(raw.punts),
    comentari: String(raw.comentari || '').trim(),
    mesura: String(raw.mesura || '').trim()
  };
}

function buildHistoricRecPayload_() {
  const timer = createTimer_('buildHistoricRecPayload');
  const config = loadIncidentConfig_();
  const activeUser = assertAuthorized_(config);
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const headers = requireHeaders_(sheet, MEETING_RECORD_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_MEETING_RECORDS_SHEET_NAME);
  const records = getDataRows_(sheet).map(function(row, index) {
    const date = parseDateMaybe_(row[headers.Data]);

    return {
      rowNumber: index + 2,
      data: date ? formatDateOnly_(date) : String(row[headers.Data] || '').trim(),
      alumne: String(row[headers.Alumne] || '').trim(),
      grup: String(row[headers.Grup] || '').trim(),
      punts: row[headers.Punts],
      comentari: String(row[headers.Comentari] || '').trim(),
      mesura: String(row[headers.Mesura] || '').trim()
    };
  }).sort(function(a, b) {
    const aDate = parseDateMaybe_(a.data);
    const bDate = parseDateMaybe_(b.data);
    const aTime = aDate ? aDate.getTime() : 0;
    const bTime = bDate ? bDate.getTime() : 0;

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    return a.alumne.localeCompare(b.alumne, 'ca');
  });

  const payload = {
    ok: true,
    status: 'ok',
    activeUser: activeUser,
    groups: config.groups,
    records: records
  };
  timer.done();

  return payload;
}

function buildTuesdaySessionsPayload_(selectedDateText) {
  const timer = createTimer_('buildTuesdaySessionsPayload');
  const config = loadIncidentConfig_();
  const activeUser = assertAuthorized_(config);
  const selectedDate = selectedDateText
    ? parseDateOnly_(selectedDateText, 'selected date')
    : nextOrSameWeekday_(todayDateOnly_(), validateWeekday_(config.studyGroupDay, 'Dia_Grup_Estudi'));

  const payload = {
    ok: true,
    status: 'ok',
    activeUser: activeUser,
    selectedDate: formatDateOnly_(selectedDate),
    teachers: loadStudyGroupTeachersForDate_(selectedDate),
    students: loadStudyGroupStudentsForDate_(selectedDate)
  };
  timer.done();

  return payload;
}

function loadStudyGroupTeachersForDate_(selectedDate) {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_STUDY_GROUP_TEACHERS_SHEET_NAME);
  const headers = requireHeaders_(sheet, STUDY_GROUP_TEACHER_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_STUDY_GROUP_TEACHERS_SHEET_NAME);
  const dateKey = formatDateOnly_(selectedDate);

  return getDataRows_(sheet).map(function(row) {
    const date = parseDateMaybe_(row[headers.data]);

    if (!date || formatDateOnly_(date) !== dateKey) {
      return '';
    }

    return String(row[headers.teacher] || '').trim();
  }).filter(Boolean);
}

function loadStudyGroupStudentsForDate_(selectedDate) {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME);
  const headers = requireHeaders_(sheet, STUDY_GROUP_STUDENT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME);
  const dateKey = formatDateOnly_(selectedDate);

  return getDataRows_(sheet).map(function(row, index) {
    const date = parseDateMaybe_(row[headers.date]);

    if (!date || formatDateOnly_(date) !== dateKey) {
      return null;
    }

    return {
      rowNumber: index + 2,
      id: String(row[headers.id] || '').trim(),
      date: formatDateOnly_(date),
      student: String(row[headers.student] || '').trim(),
      comment: String(row[headers.comment] || '').trim()
    };
  }).filter(Boolean);
}

function saveTuesdaySessionComments_(updates) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const cleanUpdates = Array.isArray(updates) ? updates : [];

  if (!cleanUpdates.length) {
    return { ok: true, status: 'empty', message: STRINGS.tuesdaySessions.emptySave, savedCount: 0 };
  }

  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME);
  const headers = requireHeaders_(sheet, STUDY_GROUP_STUDENT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME);
  const rows = getDataRows_(sheet);
  const rowById = {};

  rows.forEach(function(row, index) {
    const id = String(row[headers.id] || '').trim();

    if (id) {
      rowById[id] = index + 2;
    }
  });

  cleanUpdates.forEach(function(update) {
    const id = String(update && update.id || '').trim();
    const sheetRow = rowById[id];

    if (!sheetRow) {
      throw new Error('No s’ha trobat el registre amb id ' + id + '.');
    }

    sheet.getRange(sheetRow, headers.comment + 1).setValue(String(update.comment || '').trim());
  });

  return { ok: true, status: 'saved', message: STRINGS.tuesdaySessions.saved, savedCount: cleanUpdates.length };
}

function buildStudyGroupDefaultsPayload_(selectedDateText) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const selectedDate = parseDateOnly_(selectedDateText, 'selected date');
  const weekday = validateWeekday_(config.studyGroupDay, 'Dia_Grup_Estudi');

  return {
    ok: true,
    status: 'ok',
    weekday: weekday,
    firstDate: formatDateOnly_(nextWeekdayAfter_(selectedDate, weekday))
  };
}

function saveStudyGroupStudents_(studentName, dates) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const cleanStudent = String(studentName || '').trim();

  if (!cleanStudent) {
    throw new Error('Student name is required.');
  }

  const cleanDates = (Array.isArray(dates) ? dates : []).map(function(dateText) {
    return parseDateOnly_(dateText, 'study group date');
  });

  if (!cleanDates.length) {
    throw new Error('At least one study group date is required.');
  }

  const rows = withScriptLock_('study_group_students append', function() {
    const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME);
    const headers = requireHeaders_(sheet, STUDY_GROUP_STUDENT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_STUDY_GROUP_STUDENTS_SHEET_NAME);
    const nextId = nextNumericId_(sheet, headers.id);
    const outputRows = cleanDates.map(function(date, index) {
      const row = new Array(sheet.getLastColumn()).fill('');

      row[headers.id] = nextId + index;
      row[headers.date] = formatDateOnly_(date);
      row[headers.student] = cleanStudent;
      row[headers.comment] = '';

      return row;
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, outputRows.length, outputRows[0].length).setValues(outputRows);

    return outputRows;
  });

  return { ok: true, status: 'saved', message: STRINGS.studyGroup.saved, savedCount: rows.length };
}

function buildThirdProjectAvailabilityPayload_() {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const today = todayDateOnly_();
  const monday = startOfWeekMonday_(today);
  const existingByDate = loadThirdProjectAssignmentsByDate_(monday, addDays_(monday, 27));
  const rows = [];

  for (let week = 0; week < 4; week += 1) {
    const cells = [];

    for (let dayIndex = 0; dayIndex < WEEKDAY_KEYS.length; dayIndex += 1) {
      const date = addDays_(monday, week * 7 + dayIndex);
      const dateKey = formatDateOnly_(date);
      const weekday = WEEKDAY_KEYS[dayIndex];
      const isPastOrTodayInFirstWeek = week === 0 && date.getTime() <= today.getTime();
      const teacher = config.thirdProjectTeachers[weekday] || '';
      const existing = existingByDate[dateKey] || [];

      cells.push({
        weekday: weekday,
        date: isPastOrTodayInFirstWeek ? '' : dateKey,
        teacher: isPastOrTodayInFirstWeek ? '' : teacher,
        students: isPastOrTodayInFirstWeek ? [] : existing,
        selectable: !isPastOrTodayInFirstWeek && Boolean(teacher) && !existing.length
      });
    }

    rows.push(cells);
  }

  return {
    ok: true,
    status: 'ok',
    rows: rows
  };
}

function loadThirdProjectAssignmentsByDate_(startDate, endDate) {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_3R_PROJECT_SHEET_NAME);
  const headers = requireHeaders_(sheet, THIRD_PROJECT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_3R_PROJECT_SHEET_NAME);
  const start = startOfDay_(startDate).getTime();
  const end = endOfDay_(endDate).getTime();
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
      date: dateKey,
      student: String(row[headers.student] || '').trim(),
      aprofitament: String(row[headers.aprofitament] || '').trim()
    });
  });

  return byDate;
}

function saveThirdProjectAssignments_(studentName, dates) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const cleanStudent = String(studentName || '').trim();

  if (!cleanStudent) {
    throw new Error('Student name is required.');
  }

  const cleanDates = (Array.isArray(dates) ? dates : []).map(function(dateText) {
    return parseDateOnly_(dateText, '3R project date');
  });

  if (!cleanDates.length) {
    throw new Error('At least one 3R project date is required.');
  }

  const rows = withScriptLock_('3r_project append', function() {
    const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_3R_PROJECT_SHEET_NAME);
    const headers = requireHeaders_(sheet, THIRD_PROJECT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_3R_PROJECT_SHEET_NAME);
    const nextId = nextNumericId_(sheet, headers.id);
    const outputRows = cleanDates.map(function(date, index) {
      const row = new Array(sheet.getLastColumn()).fill('');

      row[headers.id] = nextId + index;
      row[headers.date] = formatDateOnly_(date);
      row[headers.student] = cleanStudent;
      row[headers.aprofitament] = '';

      return row;
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, outputRows.length, outputRows[0].length).setValues(outputRows);

    return outputRows;
  });

  return { ok: true, status: 'saved', message: STRINGS.thirdProject.saved, savedCount: rows.length };
}

function buildThirdProjectMonthPayload_(monthDateText) {
  const config = loadIncidentConfig_();
  const activeUser = assertAuthorized_(config);
  const baseDate = monthDateText
    ? parseDateOnly_(monthDateText, 'month date')
    : todayDateOnly_();
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const calendarStart = startOfWeekMonday_(monthStart);
  const calendarEnd = addDays_(startOfWeekMonday_(monthEnd), 6);
  const existingByDate = loadThirdProjectAssignmentsByDate_(calendarStart, calendarEnd);
  const weeks = [];
  let cursor = calendarStart;

  while (cursor.getTime() <= calendarEnd.getTime()) {
    const cells = [];

    for (let day = 0; day < 7; day += 1) {
      const date = addDays_(cursor, day);
      const dateKey = formatDateOnly_(date);
      const weekdayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const weekday = WEEKDAY_KEYS[weekdayIndex] || '';

      cells.push({
        date: dateKey,
        inMonth: date.getMonth() === monthStart.getMonth(),
        weekend: day > 4,
        weekday: weekday,
        teacher: weekday ? (config.thirdProjectTeachers[weekday] || '') : '',
        assignments: existingByDate[dateKey] || []
      });
    }

    weeks.push(cells);
    cursor = addDays_(cursor, 7);
  }

  return {
    ok: true,
    status: 'ok',
    activeUser: activeUser,
    monthDate: formatDateOnly_(monthStart),
    monthLabel: Utilities.formatDate(monthStart, Session.getScriptTimeZone(), 'MM/yyyy'),
    weeks: weeks,
    outcomeOptions: [
      'Fet amb aprofitament',
      'Absent o no aprofitat'
    ]
  };
}

function saveThirdProjectOutcomes_(updates) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);

  const cleanUpdates = Array.isArray(updates) ? updates : [];
  const allowed = {
    '': true,
    'Fet amb aprofitament': true,
    'Absent o no aprofitat': true
  };

  if (!cleanUpdates.length) {
    return { ok: true, status: 'empty', message: STRINGS.thirdProject.emptyOutcomeSave, savedCount: 0 };
  }

  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_3R_PROJECT_SHEET_NAME);
  const headers = requireHeaders_(sheet, THIRD_PROJECT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_3R_PROJECT_SHEET_NAME);
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
  });

  return { ok: true, status: 'saved', message: STRINGS.thirdProject.outcomeSaved, savedCount: cleanUpdates.length };
}

function buildExpulsionDefaultsPayload_(studentName, className) {
  const config = loadIncidentConfig_();
  assertAuthorized_(config);
  validateExpulsionConfig_(config.expulsions);

  const today = todayDateOnly_();
  const startDate = nextWorkDay_(today);

  return {
    ok: true,
    status: 'ok',
    values: {
      data: formatDateOnly_(today),
      alumne: String(studentName || '').trim(),
      classe: String(className || '').trim(),
      startDate: formatDateOnly_(startDate),
      returnDate: formatDateOnly_(addWorkDays_(startDate, 4))
    },
    creators: config.expulsions.creators
  };
}

function saveExpulsionRecord_(payload) {
  const timer = createTimer_('saveExpulsionRecord');
  const config = loadIncidentConfig_();
  assertAuthorized_(config);
  validateExpulsionConfig_(config.expulsions);

  const clean = normalizeExpulsionPayload_(payload);
  const documentUrl = createExpulsionDocument_(config.expulsions, clean);
  timer.mark('document created');

  withScriptLock_('expulsions append', function() {
    const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_EXPULSIONS_SHEET_NAME);
    const headers = requireHeaders_(sheet, EXPULSION_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_EXPULSIONS_SHEET_NAME);
    const row = new Array(sheet.getLastColumn()).fill('');
    const nextId = nextNumericId_(sheet, headers.id);

    row[headers.id] = nextId;
    row[headers.date] = clean.data;
    row[headers.student] = clean.alumne;
    row[headers.class] = clean.classe;
    row[headers.start_date] = clean.startDate;
    row[headers.return_date] = clean.returnDate;
    row[headers.incident] = clean.incident;
    row[headers.document] = documentUrl;

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  });
  timer.mark('row appended');
  sendExpulsionEmail_(config.expulsions.email, clean.alumne, documentUrl);
  timer.mark('email sent');
  timer.done();

  return {
    ok: true,
    status: 'saved',
    message: STRINGS.expulsion.saved,
    documentUrl: documentUrl
  };
}

function buildExpulsionsPayload_(studentQuery) {
  const config = loadIncidentConfig_();
  const activeUser = assertAuthorized_(config);
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_EXPULSIONS_SHEET_NAME);
  const headers = requireHeaders_(sheet, EXPULSION_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_EXPULSIONS_SHEET_NAME);
  const queryKey = codeKey_(studentQuery);
  const allRecords = getDataRows_(sheet).map(function(row, index) {
    const date = parseDateMaybe_(row[headers.date]);
    const startDate = parseDateMaybe_(row[headers.start_date]);
    const returnDate = parseDateMaybe_(row[headers.return_date]);

    return {
      rowNumber: index + 2,
      id: String(row[headers.id] || '').trim(),
      date: date ? formatDateOnly_(date) : String(row[headers.date] || '').trim(),
      student: String(row[headers.student] || '').trim(),
      className: String(row[headers.class] || '').trim(),
      startDate: startDate ? formatDateOnly_(startDate) : String(row[headers.start_date] || '').trim(),
      returnDate: returnDate ? formatDateOnly_(returnDate) : String(row[headers.return_date] || '').trim(),
      incident: String(row[headers.incident] || '').trim(),
      document: String(row[headers.document] || '').trim()
    };
  });
  const suggestions = uniqueSorted_(allRecords.map(function(record) {
    return record.student;
  }));
  const records = queryKey
    ? allRecords.filter(function(record) {
      return codeKey_(record.student).indexOf(queryKey) !== -1;
    })
    : allRecords;

  records.sort(function(a, b) {
    const aDate = parseDateMaybe_(a.date);
    const bDate = parseDateMaybe_(b.date);
    const aTime = aDate ? aDate.getTime() : 0;
    const bTime = bDate ? bDate.getTime() : 0;

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    return a.student.localeCompare(b.student, 'ca');
  });

  return {
    ok: true,
    status: 'ok',
    activeUser: activeUser,
    query: String(studentQuery || '').trim(),
    suggestions: suggestions,
    records: records
  };
}

function normalizeExpulsionPayload_(payload) {
  const raw = payload || {};
  const clean = {
    data: formatDateOnly_(parseDateOnly_(raw.data, 'Data')),
    creator: String(raw.creator || '').trim(),
    role: String(raw.role || '').trim(),
    alumne: String(raw.alumne || '').trim(),
    classe: String(raw.classe || '').trim(),
    startDate: formatDateOnly_(parseDateOnly_(raw.startDate, 'Data de començament')),
    returnDate: formatDateOnly_(parseDateOnly_(raw.returnDate, 'Data de tornada')),
    incident: String(raw.incident || '').trim()
  };

  ['creator', 'role', 'alumne', 'classe', 'incident'].forEach(function(field) {
    if (!clean[field]) {
      throw new Error('Missing required expulsion field: ' + field + '.');
    }
  });

  return clean;
}

function validateExpulsionConfig_(expulsions) {
  if (!expulsions.email) throw new Error('Missing config expulsions_email.');
  if (!expulsions.folderId) throw new Error('Missing config expulsions_folder.');
  if (!expulsions.masterDocumentId) throw new Error('Missing config expulsions_master_document.');
  if (!expulsions.creators.length) throw new Error('Missing config expulsions_document_creators.');
}

function createExpulsionDocument_(settings, values) {
  const folder = DriveApp.getFolderById(settings.folderId);
  const master = DriveApp.getFileById(settings.masterDocumentId);
  const name = 'Expulsió abreujada ' + values.alumne + ' ' + values.data;
  const copy = master.makeCopy(name, folder);
  const document = DocumentApp.openById(copy.getId());
  const body = document.getBody();
  const replacements = {
    'Data': values.data,
    'Creador del document': values.creator,
    'Com a': values.role,
    'Alumne': values.alumne,
    'Classe': values.classe,
    'Data de començament': values.startDate,
    'Data de tornada': values.returnDate,
    'Incident': values.incident
  };

  Object.keys(replacements).forEach(function(key) {
    body.replaceText('<<' + escapeForRegex_(key) + '>>', replacements[key]);
  });

  document.saveAndClose();
  copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

  return copy.getUrl();
}

function sendExpulsionEmail_(recipient, studentName, documentUrl) {
  const subject = STRINGS.expulsion.emailSubjectPrefix + ' ' + studentName + ' ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  const body = STRINGS.expulsion.emailBody.replace('{{documentUrl}}', documentUrl);

  MailApp.sendEmail(recipient, subject, body);
}

function loadAndAggregateIncidents_(periodStart, selectedDate, configuredGroups) {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_SHEET_NAME);
  const headers = requireHeaders_(sheet, INCIDENT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_SHEET_NAME);
  const values = getDataRowsForHeaders_(sheet, headers, ['Id', 'Alumne', 'Grups', 'Puntuació', 'Data']);
  const periodStartTime = startOfDay_(periodStart).getTime();
  const periodEndTime = endOfDay_(selectedDate).getTime();
  const students = {};
  const issues = [];

  values.forEach(function(row, index) {
    const sheetRow = index + 2;
    const id = String(row[headers.Id] === null || row[headers.Id] === undefined ? '' : row[headers.Id]).trim();
    const incidentDate = parseIncidentDate_(row[headers.Data]);

    if (!incidentDate) {
      if (hasAnyValue_(row)) {
        issues.push('Row ' + sheetRow + ': invalid Data.');
      }
      return;
    }

    const incidentTime = incidentDate.getTime();

    if (incidentTime < periodStartTime || incidentTime > periodEndTime) {
      return;
    }

    if (!id) {
      issues.push('Row ' + sheetRow + ': missing Id.');
      return;
    }

    const points = parsePoints_(row[headers['Puntuació']]);

    if (points === null) {
      issues.push('Row ' + sheetRow + ': invalid Puntuació.');
      return;
    }

    if (!students[id]) {
      students[id] = {
        id: id,
        alumne: String(row[headers.Alumne] || '').trim(),
        grup: '',
        punts: 0,
        incidentCount: 0
      };
    }

    if (!students[id].alumne && row[headers.Alumne]) {
      students[id].alumne = String(row[headers.Alumne]).trim();
    }

    const resolvedGroup = resolveGroup_(row[headers.Grups], configuredGroups);

    if (resolvedGroup.status === 'ok') {
      if (!students[id].grup) {
        students[id].grup = resolvedGroup.group;
      } else if (students[id].grup !== resolvedGroup.group) {
        issues.push('Row ' + sheetRow + ': group differs from previous rows for student ' + id + '.');
      }
    } else {
      issues.push('Row ' + sheetRow + ': ' + resolvedGroup.message);
    }

    students[id].punts += points;
    students[id].incidentCount += 1;
  });

  const rows = Object.keys(students)
    .map(function(id) {
      return students[id];
    })
    .sort(function(a, b) {
      if (a.punts !== b.punts) {
        return a.punts - b.punts;
      }

      return a.alumne.localeCompare(b.alumne, 'ca');
    });

  return {
    rows: rows,
    issues: issues
  };
}

function buildStudentIncidentDetailPayload_(studentId, selectedDateText) {
  const selectedDate = selectedDateText
    ? parseDateOnly_(selectedDateText, 'selected date')
    : todayDateOnly_();
  const config = loadIncidentConfig_();
  const activeUser = getActiveUserEmail_();
  const cleanStudentId = String(studentId || '').trim();

  if (!isAuthorizedUser_(activeUser, config.users)) {
    return {
      ok: true,
      status: 'unauthorized',
      message: ACCESS_DENIED_MESSAGE,
      selectedDate: formatDateOnly_(selectedDate),
      activeUser: activeUser,
      incidents: [],
      filters: {
        activities: [],
        teachers: []
      }
    };
  }

  if (!cleanStudentId) {
    throw new Error('Student Id is required.');
  }

  const term = detectTerm_(selectedDate, config);

  if (!term) {
    return {
      ok: true,
      status: 'out_of_period',
      message: OUT_OF_PERIOD_MESSAGE,
      selectedDate: formatDateOnly_(selectedDate),
      activeUser: activeUser,
      incidents: [],
      filters: {
        activities: [],
        teachers: []
      }
    };
  }

  const result = loadStudentIncidents_(cleanStudentId, term.start, todayDateOnly_(), config.groups);

  return {
    ok: true,
    status: result.incidents.length ? 'ok' : 'empty',
    message: result.incidents.length ? '' : NO_INCIDENTS_MESSAGE,
    selectedDate: formatDateOnly_(selectedDate),
    activeUser: activeUser,
    studentId: cleanStudentId,
    alumne: result.alumne,
    grup: result.grup,
    term: {
      key: term.key,
      label: term.label,
      start: formatDateOnly_(term.start),
      end: formatDateOnly_(term.end)
    },
    incidents: result.incidents,
    filters: result.filters
  };
}

function loadStudentIncidents_(studentId, periodStart, periodEnd, configuredGroups) {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_SHEET_NAME);
  const headers = requireHeaders_(sheet, INCIDENT_HEADERS, INCIDENTS_TABLE_NAME + '.' + INCIDENTS_SHEET_NAME);
  const values = getDataRows_(sheet);
  const periodStartTime = startOfDay_(periodStart).getTime();
  const periodEndTime = endOfDay_(periodEnd).getTime();
  const incidents = [];
  let alumne = '';
  let grup = '';

  values.forEach(function(row, index) {
    const id = String(row[headers.Id] === null || row[headers.Id] === undefined ? '' : row[headers.Id]).trim();

    if (id !== studentId) {
      return;
    }

    const incidentDate = parseIncidentDate_(row[headers.Data]);

    if (!incidentDate) {
      return;
    }

    const incidentTime = incidentDate.getTime();

    if (incidentTime < periodStartTime || incidentTime > periodEndTime) {
      return;
    }

    if (!alumne && row[headers.Alumne]) {
      alumne = String(row[headers.Alumne]).trim();
    }

    if (!grup) {
      const resolvedGroup = resolveGroup_(row[headers.Grups], configuredGroups);

      if (resolvedGroup.status === 'ok') {
        grup = resolvedGroup.group;
      }
    }

    incidents.push({
      sheetRow: index + 2,
      timestamp: incidentTime,
      date: formatDateOnly_(incidentDate),
      time: formatTimeOnly_(incidentDate),
      subject: String(row[headers.Assignatura] || '').trim(),
      activity: String(row[headers.Activitat] || '').trim(),
      points: row[headers['Puntuació']],
      teacher: String(row[headers.Professor] || '').trim(),
      message: String(row[headers.Missatge] || '').trim(),
      internalNote: String(row[headers['Nota interna']] || '').trim()
    });
  });

  incidents.sort(function(a, b) {
    if (a.timestamp !== b.timestamp) {
      return b.timestamp - a.timestamp;
    }

    return b.sheetRow - a.sheetRow;
  });

  return {
    alumne: alumne,
    grup: grup,
    incidents: incidents,
    filters: {
      activities: uniqueSorted_(incidents.map(function(incident) {
        return incident.activity;
      })),
      teachers: uniqueSorted_(incidents.map(function(incident) {
        return incident.teacher;
      }))
    }
  };
}

function detectTerm_(selectedDate, config) {
  const selected = startOfDay_(selectedDate).getTime();
  const first = startOfDay_(config.firstTerm).getTime();
  const second = startOfDay_(config.secondTerm).getTime();
  const third = startOfDay_(config.thirdTerm).getTime();
  const end = startOfDay_(config.endOfYear).getTime();

  if (selected >= first && selected < second) {
    return { key: '1', label: '1r trimestre', start: config.firstTerm, end: config.secondTerm };
  }

  if (selected >= second && selected < third) {
    return { key: '2', label: '2n trimestre', start: config.secondTerm, end: config.thirdTerm };
  }

  if (selected >= third && selected <= end) {
    return { key: '3', label: '3r trimestre', start: config.thirdTerm, end: config.endOfYear };
  }

  return null;
}

function resolveGroup_(rawTags, configuredGroups) {
  const tags = String(rawTags || '')
    .split(',')
    .map(function(tag) {
      return tag.trim();
    })
    .filter(Boolean);
  const configuredByKey = {};

  configuredGroups.forEach(function(group) {
    configuredByKey[codeKey_(group)] = group;
  });

  const matches = tags
    .map(function(tag) {
      return configuredByKey[codeKey_(tag)] || '';
    })
    .filter(Boolean);
  const uniqueMatches = Array.from(new Set(matches));

  if (uniqueMatches.length === 1) {
    return { status: 'ok', group: uniqueMatches[0] };
  }

  if (!uniqueMatches.length) {
    return { status: 'unresolved', group: '', message: 'group is unresolved.' };
  }

  return { status: 'ambiguous', group: '', message: 'group is ambiguous.' };
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

function getDataRowsForHeaders_(sheet, headers, neededHeaders) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const maxColumnIndex = neededHeaders.reduce(function(max, header) {
    return Math.max(max, headers[header]);
  }, 0);

  return sheet.getRange(2, 1, lastRow - 1, maxColumnIndex + 1).getValues();
}

function readColumnValues_(values, columnIndex) {
  return values
    .map(function(row) {
      return String(row[columnIndex] || '').trim();
    })
    .filter(Boolean);
}

function nextNumericId_(sheet, idColumnIndex) {
  const values = getDataRows_(sheet);
  const maxId = values.reduce(function(max, row) {
    const value = Number(row[idColumnIndex]);

    return isFinite(value) && value > max ? value : max;
  }, 0);

  return maxId + 1;
}
