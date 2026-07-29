function buildExpulsionFormPayload_(activeUser) {
  const settings = loadExpulsionSettings_();
  const today = todayDateOnly_();
  const startDate = nextWorkDay_(today);

  return {
    ok: true,
    status: 'ok',
    endpoint: ENDPOINT_EXPULSIONS_FORM,
    activeUser: activeUser,
    values: {
      data: formatDateOnly_(today),
      startDate: formatDateOnly_(startDate),
      returnDate: formatDateOnly_(addWorkDays_(startDate, 4))
    },
    creators: settings.creators,
    groups: loadDinantiaGroups_()
  };
}

function buildExpulsionStudentsForClassPayload_(className) {
  const activeUser = assertSchoolUser_();

  return {
    ok: true,
    status: 'ok',
    activeUser: activeUser,
    className: String(className || '').trim(),
    students: loadDinantiaStudentsForGroup_(className)
  };
}

function saveStandaloneExpulsion_(payload) {
  const activeUser = assertSchoolUser_();
  const settings = loadExpulsionSettings_();
  const clean = normalizeStandaloneExpulsionPayload_(payload);
  const documentUrl = createExpulsionDocument_(settings, clean);

  withScriptLock_('expulsions append', function() {
    const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_EXPULSIONS);
    const headers = requireHeaders_(sheet, EXPULSION_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_EXPULSIONS);
    const row = new Array(sheet.getLastColumn()).fill('');
    const nextId = nextNumericId_(sheet, headers.id);

    row[headers.id] = nextId;
    row[headers.student_id] = clean.studentId;
    row[headers.row_id] = '';
    row[headers.date] = clean.data;
    row[headers.student] = clean.student;
    row[headers.class] = clean.className;
    row[headers.start_date] = clean.startDate;
    row[headers.return_date] = clean.returnDate;
    row[headers.incident] = clean.incident;
    row[headers.document] = documentUrl;
    row[headers.teacher_email] = activeUser;

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  });

  sendExpulsionEmail_(settings.email, clean.student, documentUrl);

  return {
    ok: true,
    status: 'saved',
    activeUser: activeUser,
    message: STRINGS.expulsions.saved,
    documentUrl: documentUrl
  };
}

function loadExpulsionSettings_() {
  const sheet = openTableSheet_(TABLE_INCIDENCIES, SHEET_INCIDENCIES_CONFIG);
  const headers = requireHeaders_(sheet, CONFIG_HEADERS, TABLE_INCIDENCIES + '.' + SHEET_INCIDENCIES_CONFIG);
  const values = getDataRows_(sheet);
  const settings = {
    email: firstColumnValue_(values, headers.expulsions_email),
    folderId: firstColumnValue_(values, headers.expulsions_folder),
    masterDocumentId: firstColumnValue_(values, headers.expulsions_master_document),
    creators: readColumnValues_(values, headers.expulsions_document_creators)
  };

  if (!settings.email) throw new Error('Missing config expulsions_email.');
  if (!settings.folderId) throw new Error('Missing config expulsions_folder.');
  if (!settings.masterDocumentId) throw new Error('Missing config expulsions_master_document.');
  if (!settings.creators.length) throw new Error('Missing config expulsions_document_creators.');

  return settings;
}

function loadDinantiaGroups_() {
  const sheet = openTableSheet_(TABLE_DINANTIA, SHEET_DINANTIA_GROUPS);
  const headers = requireHeaders_(sheet, DINANTIA_GROUP_HEADERS, TABLE_DINANTIA + '.' + SHEET_DINANTIA_GROUPS);
  const groups = getDataRows_(sheet).map(function(row) {
    return String(row[headers.dinantia_group_name] || '').trim();
  });

  return uniqueSorted_(groups);
}

function loadDinantiaStudentsForGroup_(className) {
  const cleanClassName = String(className || '').trim();

  if (!cleanClassName) {
    return [];
  }

  const sheet = openTableSheet_(TABLE_DINANTIA, SHEET_STUDENTS_CACHE);
  const headers = requireHeaders_(sheet, STUDENTS_CACHE_HEADERS, TABLE_DINANTIA + '.' + SHEET_STUDENTS_CACHE);
  const classKey = codeKey_(cleanClassName);

  return getDataRows_(sheet).map(function(row) {
    const groupName = String(row[headers.group_name] || '').trim();

    if (codeKey_(groupName) !== classKey) {
      return null;
    }

    return {
      studentId: String(row[headers.student_id] || '').trim(),
      studentName: String(row[headers.student_name] || '').trim(),
      groupName: groupName
    };
  }).filter(function(student) {
    return student && student.studentId && student.studentName;
  }).sort(function(a, b) {
    return a.studentName.localeCompare(b.studentName, 'ca');
  });
}

function normalizeStandaloneExpulsionPayload_(payload) {
  const raw = payload || {};
  const clean = {
    studentId: String(raw.studentId || raw.student_id || '').trim(),
    student: String(raw.student || raw.alumne || '').trim(),
    className: String(raw.className || raw.classe || '').trim(),
    data: formatDateOnly_(parseDateOnly_(raw.data, 'Data')),
    creator: String(raw.creator || '').trim(),
    role: String(raw.role || '').trim(),
    startDate: formatDateOnly_(parseDateOnly_(raw.startDate, 'Data de començament')),
    returnDate: formatDateOnly_(parseDateOnly_(raw.returnDate, 'Data de tornada')),
    incident: String(raw.incident || '').trim()
  };

  ['studentId', 'student', 'className', 'creator', 'role', 'incident'].forEach(function(field) {
    if (!clean[field]) {
      throw new Error('Missing required expulsion field: ' + field + '.');
    }
  });

  return clean;
}

function createExpulsionDocument_(settings, values) {
  const folder = DriveApp.getFolderById(settings.folderId);
  const master = DriveApp.getFileById(settings.masterDocumentId);
  const name = 'Expulsió abreujada ' + values.student + ' ' + values.data;
  const copy = master.makeCopy(name, folder);
  const document = DocumentApp.openById(copy.getId());
  const body = document.getBody();
  const replacements = {
    'Data': values.data,
    'Creador del document': values.creator,
    'Com a': values.role,
    'Alumne': values.student,
    'Classe': values.className,
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
  const subject = STRINGS.expulsions.emailSubjectPrefix + ' ' + studentName + ' ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  const body = STRINGS.expulsions.emailBody.replace('{{documentUrl}}', documentUrl);

  MailApp.sendEmail(recipient, subject, body, {
    name: STRINGS.email.senderName
  });
}
