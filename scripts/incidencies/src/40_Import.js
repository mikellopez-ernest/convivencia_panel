function previewUploadedIncidentXlsx(base64Content, fileName) {
  return handleImportRequest_(function() {
    return buildImportPreviewPayload_({
      fileName: fileName || 'tracking-report.xlsx'
    }, 'upload');
  });
}

function importUploadedIncidentXlsx(base64Content, fileName) {
  return handleImportRequest_(function() {
    const blob = blobFromBase64_(base64Content, fileName || 'tracking-report.xlsx');
    const result = refreshAnnualIncidentDateRangeFromXlsxBlob_(blob);

    return buildImportSuccessPayload_(result, 'upload');
  });
}

function previewApiIncidentXlsx() {
  return handleImportRequest_(function() {
    return buildImportPreviewPayload_({}, 'api');
  });
}

function importApiIncidentXlsx(schoolYear) {
  return handleImportRequest_(function() {
    const selectedSchoolYear = validateManualTrackingReportPeriod_(schoolYear);
    const download = downloadTrackingReportFromApi_(selectedSchoolYear);

    if (!download.ok) {
      return download;
    }

    const result = refreshAnnualIncidentDateRangeFromXlsxBlob_(download.blob);

    return buildImportSuccessPayload_(result, 'api');
  });
}

function refreshIncidentTableFromApi() {
  const download = downloadTrackingReportFromApi_();

  if (!download.ok) {
    throw new Error(buildApiDownloadErrorMessage_(download));
  }

  const result = refreshAnnualIncidentDateRangeFromXlsxBlob_(download.blob);
  const summary = buildImportSuccessPayload_(result, 'api');
  summary.details = download.details || {};

  console.log(JSON.stringify(summary));

  return summary;
}

function handleImportRequest_(callback) {
  try {
    assertImportAuthorized_();

    return callback();
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      message: error.message || String(error),
      details: {},
      warnings: []
    };
  }
}

function assertImportAuthorized_() {
  assertUserAccess_();
}

function downloadTrackingReportFromApi_(schoolYearOverride) {
  const properties = PropertiesService.getScriptProperties();
  const url = String(properties.getProperty(TRACKING_REPORT_API_URL_PROPERTY) || '').trim();
  const bearer = String(properties.getProperty(TRACKING_REPORT_BEARER_PROPERTY) || '').trim();
  const schoolYear = String(
    schoolYearOverride || properties.getProperty(TRACKING_REPORT_SCHOOL_YEAR_PROPERTY) || ''
  ).trim();
  const missing = [];

  if (!url) missing.push(TRACKING_REPORT_API_URL_PROPERTY);
  if (!bearer) missing.push(TRACKING_REPORT_BEARER_PROPERTY);
  if (!schoolYear) missing.push(TRACKING_REPORT_SCHOOL_YEAR_PROPERTY);

  if (missing.length) {
    throw new Error('Missing API script propert' + (missing.length === 1 ? 'y' : 'ies') + ': ' + missing.join(', '));
  }

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + bearer
    },
    payload: JSON.stringify({
      school_year: schoolYear
    }),
    muteHttpExceptions: true
  });
  const statusCode = response.getResponseCode();
  const headers = response.getAllHeaders();
  const details = {
    url: url,
    method: 'POST',
    statusCode: statusCode,
    statusText: '',
    responseHeaders: headers,
    responsePreview: responseBodyPreview_(response),
    schoolYear: schoolYear
  };

  if (statusCode < 200 || statusCode > 299) {
    return {
      ok: false,
      status: 'api_error',
      message: IMPORT_API_ERROR_MESSAGE,
      details: details,
      warnings: []
    };
  }

  const blob = response.getBlob().setName('tracking-report.xlsx');

  if (!blob.getBytes().length) {
    return {
      ok: false,
      status: 'api_error',
      message: IMPORT_API_ERROR_MESSAGE,
      details: Object.assign({}, details, {
        responsePreview: 'Response body is empty.'
      }),
      warnings: []
    };
  }

  return {
    ok: true,
    blob: blob,
    details: details
  };
}

function validateManualTrackingReportPeriod_(value) {
  const selected = String(value || '').trim();

  if (TRACKING_REPORT_MANUAL_PERIOD_OPTIONS.indexOf(selected) === -1) {
    throw new Error('Invalid API update period.');
  }

  return selected;
}

function responseBodyPreview_(response) {
  try {
    const text = response.getContentText();

    if (!text) {
      return '';
    }

    return text.length > 2000 ? text.slice(0, 2000) + '...' : text;
  } catch (error) {
    return 'Response body is not text-readable.';
  }
}

function blobFromBase64_(base64Content, fileName) {
  const clean = String(base64Content || '').replace(/^data:.*?;base64,/, '');

  if (!clean) {
    throw new Error('No XLSX file content was received.');
  }

  return Utilities
    .newBlob(Utilities.base64Decode(clean), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName);
}

function refreshAnnualIncidentDateRangeFromXlsxBlob_(blob) {
  const source = convertXlsxBlobToValues_(blob);
  const table = normalizeIncidentTableFromValues_(source.values);
  const incomingRows = normalizeIncomingIncidentRows_(table.values.slice(1));
  const dateRange = getIncidentImportDateRange_(incomingRows);
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_SHEET_NAME);
  const lock = LockService.getScriptLock();
  let refreshResult;

  lock.waitLock(30000);

  try {
    refreshResult = replaceIncidentDateRange_(sheet, incomingRows, dateRange);
  } finally {
    lock.releaseLock();
  }

  return {
    importedRows: refreshResult.importedRows,
    deletedRows: refreshResult.deletedRows,
    preservedRows: refreshResult.preservedRows,
    rangeStart: formatDateOnly_(dateRange.start),
    rangeEnd: formatDateOnly_(dateRange.end),
    headerRow: table.headerRow,
    columnCount: INCIDENT_HEADERS.length,
    sourceSheetName: source.sheetName,
    warnings: []
  };
}

function normalizeIncomingIncidentRows_(rows) {
  const columnCount = INCIDENT_HEADERS.length;
  return rows.filter(hasAnyValue_).map(function(row) {
    return row.slice(0, columnCount).map(function(value) {
      return value === null || value === undefined ? '' : String(value);
    });
  });
}

function getIncidentImportDateRange_(rows) {
  const dateColumnIndex = INCIDENT_HEADERS.indexOf('Data');
  let firstTime = null;
  let lastTime = null;

  if (!rows.length) {
    throw new Error('The XLSX contains no incident rows. llistat_anual was not modified.');
  }

  rows.forEach(function(row, index) {
    const date = parseIncidentDate_(row[dateColumnIndex]);

    if (!date) {
      throw new Error('Invalid Data in imported row ' + (index + 1) + '. llistat_anual was not modified.');
    }

    const time = startOfDay_(date).getTime();
    firstTime = firstTime === null ? time : Math.min(firstTime, time);
    lastTime = lastTime === null ? time : Math.max(lastTime, time);
  });

  return {
    start: new Date(firstTime),
    end: new Date(lastTime)
  };
}

function replaceIncidentDateRange_(sheet, incomingRows, dateRange) {
  const columnCount = INCIDENT_HEADERS.length;
  const dateColumnIndex = INCIDENT_HEADERS.indexOf('Data');
  const firstTime = dateRange.start.getTime();
  const lastTime = dateRange.end.getTime();
  const lastRow = sheet.getLastRow();
  const preservedRows = [];
  let deletedRows = 0;

  if (lastRow > 0) {
    const range = sheet.getRange(1, 1, lastRow, columnCount);
    const rawValues = range.getValues();
    const displayValues = range.getDisplayValues();
    validateIncidentDestinationHeaders_(displayValues[0]);

    for (let rowIndex = 1; rowIndex < rawValues.length; rowIndex += 1) {
      const rawRow = rawValues[rowIndex];
      const displayRow = displayValues[rowIndex];
      const date = parseIncidentDate_(rawRow[dateColumnIndex]) || parseIncidentDate_(displayRow[dateColumnIndex]);
      const time = date ? startOfDay_(date).getTime() : null;

      if (time !== null && time >= firstTime && time <= lastTime) {
        deletedRows += 1;
      } else {
        preservedRows.push(rawRow);
      }
    }
  }

  const finalValues = [INCIDENT_HEADERS.slice()].concat(preservedRows, incomingRows);
  sheet.getRange(1, 1, finalValues.length, columnCount).setValues(finalValues);

  if (lastRow > finalValues.length) {
    sheet.getRange(finalValues.length + 1, 1, lastRow - finalValues.length, columnCount).clearContent();
  }

  return {
    importedRows: incomingRows.length,
    deletedRows: deletedRows,
    preservedRows: preservedRows.length
  };
}

function validateIncidentDestinationHeaders_(headers) {
  const actualHeaders = headers.slice(0, INCIDENT_HEADERS.length).map(function(value) {
    return String(value === null || value === undefined ? '' : value).trim();
  });

  if (JSON.stringify(actualHeaders) !== JSON.stringify(INCIDENT_HEADERS)) {
    throw new Error('Invalid llistat_anual headers. Expected: ' + INCIDENT_HEADERS.join(', '));
  }
}

function normalizeIncidentTableFromValues_(values) {
  const headerInfo = findIncidentHeaderRow_(values);
  const normalizedRows = values.slice(headerInfo.index + 1).map(function(row) {
    return headerInfo.columnIndexes.map(function(columnIndex) {
      return row[columnIndex] === undefined ? '' : row[columnIndex];
    });
  });
  const tableValues = [INCIDENT_HEADERS.slice()].concat(trimTrailingBlankRows_(normalizedRows));

  return {
    headerRow: headerInfo.index + 1,
    values: tableValues
  };
}

function findIncidentHeaderRow_(values) {
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const headersByName = {};
    const duplicates = {};

    values[rowIndex].forEach(function(value, columnIndex) {
      const header = String(value || '').trim();

      if (!header) {
        return;
      }

      if (headersByName[header] !== undefined) {
        duplicates[header] = true;
        return;
      }

      headersByName[header] = columnIndex;
    });

    const missingHeaders = INCIDENT_HEADERS.filter(function(header) {
      return headersByName[header] === undefined;
    });

    if (missingHeaders.length) {
      continue;
    }

    const duplicatedRequiredHeaders = INCIDENT_HEADERS.filter(function(header) {
      return duplicates[header];
    });

    if (duplicatedRequiredHeaders.length) {
      throw new Error('Duplicate required header(s) in XLSX: ' + duplicatedRequiredHeaders.join(', '));
    }

    return {
      index: rowIndex,
      columnIndexes: INCIDENT_HEADERS.map(function(header) {
        return headersByName[header];
      })
    };
  }

  throw new Error('Incident header row not found in XLSX. Required headers: ' + INCIDENT_HEADERS.join(', '));
}

function trimTrailingBlankRows_(rows) {
  let lastContentRow = rows.length - 1;

  while (lastContentRow >= 0 && !hasAnyValue_(rows[lastContentRow])) {
    lastContentRow -= 1;
  }

  return rows.slice(0, lastContentRow + 1);
}

function convertXlsxBlobToValues_(blob) {
  let temporaryFile;

  try {
    temporaryFile = Drive.Files.insert({
      title: 'tracking-report-import-' + new Date().getTime()
    }, blob, {
      convert: true
    });

    const temporarySpreadsheet = SpreadsheetApp.openById(temporaryFile.id);
    const sourceSheet = temporarySpreadsheet.getSheets()[0];
    const range = sourceSheet.getDataRange();
    const values = range.getDisplayValues();

    return {
      sheetName: sourceSheet.getName(),
      values: values,
      columnCount: values.length ? values[0].length : 0
    };
  } catch (error) {
    throw new Error('No s’ha pogut convertir o llegir el fitxer XLSX: ' + error.message);
  } finally {
    if (temporaryFile && temporaryFile.id) {
      try {
        Drive.Files.trash(temporaryFile.id);
      } catch (cleanupError) {
        // Best effort cleanup.
      }
    }
  }
}

function buildImportPreviewPayload_(summary, source) {
  return {
    ok: true,
    status: 'preview',
    source: source,
    message: 'Confirma per actualitzar el període importat de llistat_anual.',
    importedRows: '',
    headerRow: '',
    fileName: summary.fileName || '',
    warnings: []
  };
}

function buildImportSuccessPayload_(result, source) {
  return {
    ok: true,
    status: 'imported',
    source: source,
    message: 'Importació completada.',
    importedRows: result.importedRows,
    deletedRows: result.deletedRows,
    preservedRows: result.preservedRows,
    rangeStart: result.rangeStart,
    rangeEnd: result.rangeEnd,
    headerRow: result.headerRow,
    columnCount: result.columnCount,
    sourceSheetName: result.sourceSheetName,
    warnings: result.warnings
  };
}

function buildApiDownloadErrorMessage_(download) {
  const details = download && download.details ? download.details : {};
  const parts = [download && download.message ? download.message : IMPORT_API_ERROR_MESSAGE];

  if (details.statusCode) {
    parts.push('HTTP status: ' + details.statusCode);
  }

  if (details.responsePreview) {
    parts.push('Response: ' + details.responsePreview);
  }

  return parts.join(' | ');
}
