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
    const result = replaceAnnualIncidentTableFromXlsxBlob_(blob);

    return buildImportSuccessPayload_(result, 'upload');
  });
}

function previewApiIncidentXlsx() {
  return handleImportRequest_(function() {
    return buildImportPreviewPayload_({}, 'api');
  });
}

function importApiIncidentXlsx() {
  return handleImportRequest_(function() {
    const download = downloadTrackingReportFromApi_();

    if (!download.ok) {
      return download;
    }

    const result = replaceAnnualIncidentTableFromXlsxBlob_(download.blob);

    return buildImportSuccessPayload_(result, 'api');
  });
}

function refreshIncidentTableFromApi() {
  const download = downloadTrackingReportFromApi_();

  if (!download.ok) {
    throw new Error(buildApiDownloadErrorMessage_(download));
  }

  const result = replaceAnnualIncidentTableFromXlsxBlob_(download.blob);
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
  const activeUser = getActiveUserEmail_();
  const users = loadAuthorizedImportUsers_();

  if (!isAuthorizedUser_(activeUser, users)) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }
}

function loadAuthorizedImportUsers_() {
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_CONFIG_SHEET_NAME);
  const headers = requireHeaders_(sheet, ['Users'], INCIDENTS_TABLE_NAME + '.' + INCIDENTS_CONFIG_SHEET_NAME);
  const users = readColumnValues_(getDataRows_(sheet), headers.Users).map(normalizeEmail_);

  if (!users.length) {
    throw new Error('Config sheet must contain at least one authorized user in "Users".');
  }

  return users;
}

function downloadTrackingReportFromApi_() {
  const properties = PropertiesService.getScriptProperties();
  const url = String(properties.getProperty(TRACKING_REPORT_API_URL_PROPERTY) || '').trim();
  const bearer = String(properties.getProperty(TRACKING_REPORT_BEARER_PROPERTY) || '').trim();
  const schoolYear = String(properties.getProperty(TRACKING_REPORT_SCHOOL_YEAR_PROPERTY) || '').trim();
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

function replaceAnnualIncidentTableFromXlsxBlob_(blob) {
  const source = convertXlsxBlobToValues_(blob);
  const table = normalizeIncidentTableFromValues_(source.values);
  const sheet = openTableSheet_(INCIDENTS_TABLE_NAME, INCIDENTS_SHEET_NAME);

  sheet.clearContents();

  if (table.values.length) {
    sheet.getRange(1, 1, table.values.length, INCIDENT_HEADERS.length).setValues(table.values);
  }

  return {
    importedRows: Math.max(table.values.length - 1, 0),
    copiedRows: table.values.length,
    headerRow: table.headerRow,
    columnCount: INCIDENT_HEADERS.length,
    sourceSheetName: source.sheetName,
    warnings: []
  };
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
    message: 'Confirma per substituir llistat_anual.',
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
