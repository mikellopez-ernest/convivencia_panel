function buildDimartsPayload_(selectedDateText) {
  const activeUser = assertSchoolUser_();
  const settings = loadDimartsSettings_();
  const selectedDate = selectedDateText
    ? sameWeekWeekday_(parseDateOnly_(selectedDateText, 'selected date'), settings.studyGroupDay)
    : nextOrSameWeekday_(todayDateOnly_(), settings.studyGroupDay);

  return {
    ok: true,
    status: 'ok',
    endpoint: ENDPOINT_DIMARTS,
    activeUser: activeUser,
    selectedDate: formatDateOnly_(selectedDate),
    studyGroupDay: settings.studyGroupDay,
    teachers: loadStudyGroupTeachersForDate_(selectedDate),
    students: loadStudyGroupStudentsForDate_(selectedDate)
  };
}

function saveDimartsComments_(updates) {
  const activeUser = assertSchoolUser_();
  const cleanUpdates = Array.isArray(updates) ? updates : [];

  if (!cleanUpdates.length) {
    return {
      ok: true,
      status: 'empty',
      message: STRINGS.dimarts.emptySave,
      savedCount: 0
    };
  }

  const savedCount = withScriptLock_('study_group_students comments', function() {
    const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_STUDY_GROUP_STUDENTS);
    const headers = requireHeaders_(sheet, STUDY_GROUP_STUDENT_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_STUDY_GROUP_STUDENTS);
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
      sheet.getRange(sheetRow, headers.teacher_email + 1).setValue(activeUser);
    });

    return cleanUpdates.length;
  });

  return {
    ok: true,
    status: 'saved',
    message: STRINGS.dimarts.saved,
    savedCount: savedCount
  };
}

function loadDimartsSettings_() {
  const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_INCIDENCIES_CONFIG);
  const headers = requireHeaders_(sheet, ['Dia_Grup_Estudi'], TABLE_INCIDENCIES + '.' + SHEET_INCIDENCIES_CONFIG);
  const values = getDataRows_(sheet);
  const studyGroupDay = validateWeekday_(firstColumnValue_(values, headers.Dia_Grup_Estudi), 'Dia_Grup_Estudi');

  return {
    studyGroupDay: studyGroupDay
  };
}

function loadStudyGroupTeachersForDate_(selectedDate) {
  const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_STUDY_GROUP_TEACHERS);
  const headers = requireHeaders_(sheet, STUDY_GROUP_TEACHER_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_STUDY_GROUP_TEACHERS);
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
  const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_STUDY_GROUP_STUDENTS);
  const headers = requireHeaders_(sheet, STUDY_GROUP_STUDENT_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_STUDY_GROUP_STUDENTS);
  const dateKey = formatDateOnly_(selectedDate);

  return getDataRows_(sheet).map(function(row, index) {
    const date = parseDateMaybe_(row[headers.date]);

    if (!date || formatDateOnly_(date) !== dateKey) {
      return null;
    }

    return {
      rowNumber: index + 2,
      id: String(row[headers.id] || '').trim(),
      studentId: String(row[headers.student_id] || '').trim(),
      rowId: String(row[headers.row_id] || '').trim(),
      date: formatDateOnly_(date),
      student: String(row[headers.student] || '').trim(),
      comment: String(row[headers.comment] || '').trim(),
      teacherEmail: String(row[headers.teacher_email] || '').trim()
    };
  }).filter(Boolean);
}
