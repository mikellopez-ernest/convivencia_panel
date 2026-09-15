function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.endpoint = String(e && e.parameter && e.parameter.endpoint || DEFAULT_ENDPOINT).trim();

  return template
    .evaluate()
    .setTitle(APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getInitialPayload(endpoint) {
  return runWebAction_(function() {
    return buildInitialPayload_(endpoint);
  }, { actions: [] });
}

function getExpulsionStudentsForClass(className) {
  return runWebAction_(function() {
    return buildExpulsionStudentsForClassPayload_(className);
  }, { students: [] });
}

function saveStandaloneExpulsion(payload) {
  return runWebAction_(function() {
    return saveStandaloneExpulsion_(payload);
  });
}

function getDimartsPayload(selectedDateText) {
  return runWebAction_(function() {
    return buildDimartsPayload_(selectedDateText);
  }, { teachers: [], students: [] });
}

function saveDimartsComments(updates) {
  return runWebAction_(function() {
    return saveDimartsComments_(updates);
  }, { savedCount: 0 });
}

function authorizeEndpointPermissions() {
  const settings = loadExpulsionSettings_();

  loadDinantiaGroups_();
  loadDinantiaStudentsForGroup_('');
  openTableSheet_(TABLE_INCIDENCIES, SHEET_EXPULSIONS).getLastRow();
  openTableSheet_(TABLE_INCIDENCIES, SHEET_STUDY_GROUP_STUDENTS).getLastRow();
  openTableSheet_(TABLE_INCIDENCIES, SHEET_STUDY_GROUP_TEACHERS).getLastRow();
  loadDimartsSettings_();
  DriveApp.getFolderById(settings.folderId).getName();
  const master = DriveApp.getFileById(settings.masterDocumentId);
  DocumentApp.openById(master.getId()).getName();
  MailApp.getRemainingDailyQuota();

  return 'Authorization check completed for endpoints_generales.';
}
