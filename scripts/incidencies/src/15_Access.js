let accessDecisionMemo_ = null;

function assertUserAccess_() {
  const access = getAccessDecision_();

  if (!access.allowed) {
    throw new Error(access.message);
  }

  return access;
}

function getAccessDecision_() {
  if (accessDecisionMemo_) {
    return accessDecisionMemo_;
  }

  let userEmail = '';

  try {
    userEmail = getActiveUserEmail_();

    if (!userEmail) {
      accessDecisionMemo_ = {
        allowed: false,
        email: '',
        message: 'No s’ha pogut identificar el correu de l’usuari actiu.'
      };

      return accessDecisionMemo_;
    }

    const accessEntries = getAccessGrantedEntries_();

    if (!accessEntries.length) {
      accessDecisionMemo_ = {
        allowed: false,
        email: userEmail,
        message: 'Falta configurar la propietat de script "' + ACCESS_GRANTED_PROPERTY_NAME + '".'
      };

      return accessDecisionMemo_;
    }

    const directEmails = accessEntries
      .map(normalizeEmail_)
      .filter(function(entry) {
        return entry.indexOf('@') !== -1;
      });
    const roles = accessEntries.filter(function(entry) {
      return normalizeEmail_(entry).indexOf('@') === -1;
    });
    const peopleByRole = getPeopleByAccessRole_();
    const people = [];

    roles.forEach(function(role) {
      const assignedPeople = peopleByRole.get(normalizeText_(role)) || [];
      assignedPeople.forEach(function(person) {
        people.push(person);
      });
    });

    const authorizedEmails = getEmailsForPeople_(people);
    directEmails.forEach(function(email) {
      authorizedEmails.add(email);
    });

    const allowed = authorizedEmails.has(userEmail);

    accessDecisionMemo_ = {
      allowed: allowed,
      email: userEmail,
      accessEntries: accessEntries,
      roles: roles,
      directEmails: directEmails,
      people: people,
      message: allowed
        ? 'Accés autoritzat.'
        : ACCESS_DENIED_MESSAGE
    };

    return accessDecisionMemo_;
  } catch (error) {
    accessDecisionMemo_ = {
      allowed: false,
      email: userEmail || getActiveUserEmail_(),
      message: error && error.message ? error.message : String(error)
    };

    return accessDecisionMemo_;
  }
}

function getAccessGrantedEntries_() {
  return splitCommaList_(
    PropertiesService.getScriptProperties().getProperty(ACCESS_GRANTED_PROPERTY_NAME)
  );
}

function getPeopleByAccessRole_() {
  const sheet = openTableSheet_(WORKLOAD_TABLE_NAME, WORKLOAD_CARRECS_SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return new Map();
  }

  const values = sheet.getRange(2, 1, lastRow - 1, CARRECS_COLUMNS.asignado).getValues();
  const peopleByRole = new Map();

  values.forEach(function(row) {
    const roleName = toDisplayString_(row[CARRECS_COLUMNS.carrec - 1]);

    if (!roleName) {
      return;
    }

    peopleByRole.set(
      normalizeText_(roleName),
      splitCommaList_(row[CARRECS_COLUMNS.asignado - 1])
    );
  });

  return peopleByRole;
}

function getEmailsForPeople_(people) {
  const emails = new Set();

  if (!people.length) {
    return emails;
  }

  const sheet = openTableSheet_(WORKLOAD_TABLE_NAME, WORKLOAD_PROFESSORS_SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return emails;
  }

  const peopleSet = new Set(people.map(function(person) {
    return normalizeText_(person);
  }));
  const values = sheet.getRange(2, 1, lastRow - 1, WORKLOAD_PROFESSORS_COLUMNS.teacherKey).getValues();

  values.forEach(function(row) {
    const teacherKey = normalizeText_(row[WORKLOAD_PROFESSORS_COLUMNS.teacherKey - 1]);

    if (!peopleSet.has(teacherKey)) {
      return;
    }

    const email = normalizeEmail_(row[WORKLOAD_PROFESSORS_COLUMNS.correuInstit - 1]);

    if (email) {
      emails.add(email);
    }
  });

  people.forEach(function(person) {
    const directEmail = normalizeEmail_(person);

    if (directEmail.indexOf('@') !== -1) {
      emails.add(directEmail);
    }
  });

  return emails;
}

function createAccessDeniedOutput_(access) {
  const email = access && access.email ? access.email : 'usuari no identificat';
  const message = access && access.message
    ? access.message
    : ACCESS_DENIED_MESSAGE;

  return HtmlService
    .createHtmlOutput(
      '<!doctype html>' +
      '<html lang="ca">' +
      '<head>' +
      '<base target="_top">' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Accés no autoritzat</title>' +
      '<style>' +
      'body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;background:#f5f7fb;color:#17202a;}' +
      'main{width:min(520px,calc(100vw - 32px));border:1px solid #d8dee9;background:#fff;padding:28px;box-shadow:0 18px 45px rgba(20,31,47,.12);}' +
      'h1{margin:0 0 12px;font-size:24px;}p{margin:8px 0;line-height:1.5;}.email{font-family:monospace;color:#465466;}' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<main>' +
      '<h1>Accés no autoritzat</h1>' +
      '<p>' + escapeHtml_(message) + '</p>' +
      '<p class="email">' + escapeHtml_(email) + '</p>' +
      '</main>' +
      '</body>' +
      '</html>'
    )
    .setTitle('Accés no autoritzat')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function grantRequiredPermissions() {
  const properties = PropertiesService.getScriptProperties();

  properties.getProperty(DATABASE_PROPERTY_NAME);
  properties.getProperty(ACCESS_GRANTED_PROPERTY_NAME);
  Session.getActiveUser().getEmail();
  openTableSheet_(WORKLOAD_TABLE_NAME, WORKLOAD_CARRECS_SHEET_NAME).getRange(1, 1).getValue();
  openTableSheet_(WORKLOAD_TABLE_NAME, WORKLOAD_PROFESSORS_SHEET_NAME).getRange(1, 1).getValue();

  return {
    ok: true,
    message: 'Permisos concedits correctament.'
  };
}
