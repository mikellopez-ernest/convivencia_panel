function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Punts de convivència')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getInitialIncidentPointsPayload() {
  return getIncidentPointsPayload();
}

function getIncidentPointsPayload(selectedDateText) {
  return runWebAction_(function() {
    return buildIncidentPointsPayload_(selectedDateText);
  }, { rows: [], issues: [] });
}

function getStudentIncidentDetailPayload(studentId, selectedDateText) {
  return runWebAction_(function() {
    return buildStudentIncidentDetailPayload_(studentId, selectedDateText);
  }, {
    incidents: [],
    filters: {
      activities: [],
      teachers: []
    }
  });
}

function saveMeetingRecords(records, selectedDateText) {
  return runWebAction_(function() {
    return saveMeetingRecords_(records, selectedDateText);
  }, { savedCount: 0, rowResults: [] });
}

function saveSingleMeetingRecord(record, selectedDateText) {
  return runWebAction_(function() {
    return saveSingleMeetingRecord_(record, selectedDateText);
  });
}

function deleteLatestMeetingRecord(studentId, selectedDateText) {
  return runWebAction_(function() {
    return deleteLatestMeetingRecord_(studentId, selectedDateText);
  });
}

function getStudyGroupDefaultsPayload(selectedDateText) {
  return runWebAction_(function() {
    return buildStudyGroupDefaultsPayload_(selectedDateText);
  });
}

function saveStudyGroupStudents(studentName, dates) {
  return runWebAction_(function() {
    return saveStudyGroupStudents_(studentName, dates);
  });
}

function getThirdProjectAvailabilityPayload() {
  return runWebAction_(function() {
    return buildThirdProjectAvailabilityPayload_();
  });
}

function saveThirdProjectAssignments(studentName, dates) {
  return runWebAction_(function() {
    return saveThirdProjectAssignments_(studentName, dates);
  });
}

function getThirdProjectMonthPayload(monthDateText) {
  return runWebAction_(function() {
    return buildThirdProjectMonthPayload_(monthDateText);
  }, { weeks: [], outcomeOptions: [] });
}

function saveThirdProjectOutcomes(updates) {
  return runWebAction_(function() {
    return saveThirdProjectOutcomes_(updates);
  });
}

function getExpulsionDefaultsPayload(studentName, className) {
  return runWebAction_(function() {
    return buildExpulsionDefaultsPayload_(studentName, className);
  });
}

function saveExpulsionRecord(payload) {
  return runWebAction_(function() {
    return saveExpulsionRecord_(payload);
  });
}

function getExpulsionsPayload(studentQuery) {
  return runWebAction_(function() {
    return buildExpulsionsPayload_(studentQuery);
  }, { suggestions: [], records: [] });
}

function getHistoricRecPayload() {
  return runWebAction_(function() {
    return buildHistoricRecPayload_();
  }, { records: [], groups: [] });
}

function getTuesdaySessionsPayload(selectedDateText) {
  return runWebAction_(function() {
    return buildTuesdaySessionsPayload_(selectedDateText);
  }, { teachers: [], students: [] });
}

function saveTuesdaySessionComments(updates) {
  return runWebAction_(function() {
    return saveTuesdaySessionComments_(updates);
  });
}
