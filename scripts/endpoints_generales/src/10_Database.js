function getDatabaseSpreadsheetId_() {
  const value = PropertiesService.getScriptProperties().getProperty(DATABASE_PROPERTY_NAME);
  const cleanValue = String(value || '').trim();

  if (!cleanValue) {
    throw new Error(STRINGS.errors.missingDatabaseProperty);
  }

  return cleanValue;
}

function loadTableRegistry_() {
  const databaseId = getDatabaseSpreadsheetId_();
  const cacheKey = TABLE_REGISTRY_CACHE_PREFIX + databaseId;
  const cached = CacheService.getScriptCache().get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const spreadsheet = SpreadsheetApp.openById(databaseId);
  const sheet = spreadsheet.getSheetByName(REGISTRY_TABLES_SHEET_NAME);

  if (!sheet) {
    throw new Error(STRINGS.errors.missingRegistrySheet);
  }

  const values = sheet.getDataRange().getValues();
  const registry = {};

  values.forEach(function(row) {
    const tableName = String(row[0] || '').trim();
    const spreadsheetId = String(row[1] || '').trim();

    if (tableName && spreadsheetId) {
      registry[tableName] = spreadsheetId;
    }
  });

  CacheService.getScriptCache().put(cacheKey, JSON.stringify(registry), CACHE_TTL_SECONDS);

  return registry;
}

function openTableSpreadsheet_(registry, tableName) {
  const cleanTableName = String(tableName || '').trim();
  const spreadsheetId = registry[cleanTableName];

  if (!spreadsheetId) {
    throw new Error('Missing logical table "' + cleanTableName + '" in database registry.');
  }

  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw new Error('Cannot open logical table "' + cleanTableName + '": ' + (error.message || error));
  }
}

function openSheetByName_(spreadsheet, sheetName, context) {
  const cleanSheetName = String(sheetName || '').trim();
  const sheet = spreadsheet.getSheetByName(cleanSheetName);

  if (!sheet) {
    throw new Error('Missing sheet "' + cleanSheetName + '" in ' + context + '.');
  }

  return sheet;
}

function openTableSheet_(tableName, sheetName) {
  const registry = loadTableRegistry_();
  const spreadsheet = openTableSpreadsheet_(registry, tableName);

  return openSheetByName_(spreadsheet, sheetName, tableName);
}

function requireHeaders_(sheet, requiredHeaders, context) {
  const values = sheet.getDataRange().getValues();
  const headerRow = values.length ? values[0] : [];
  const headers = {};

  headerRow.forEach(function(header, index) {
    const key = String(header || '').trim();

    if (key) {
      headers[key] = index;
    }
  });

  requiredHeaders.forEach(function(header) {
    if (headers[header] === undefined) {
      throw new Error('Missing required header "' + header + '" in ' + context + '.');
    }
  });

  return headers;
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

function readColumnValues_(values, columnIndex) {
  return values.map(function(row) {
    return String(row[columnIndex] || '').trim();
  }).filter(Boolean);
}

function firstColumnValue_(values, columnIndex) {
  const valuesInColumn = readColumnValues_(values, columnIndex);

  return valuesInColumn.length ? valuesInColumn[0] : '';
}

function nextNumericId_(sheet, columnIndex) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const values = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1).getValues();
  const maxId = values.reduce(function(max, row) {
    const value = Number(row[0]);

    return isFinite(value) && value > max ? value : max;
  }, 0);

  return maxId + 1;
}
