function getDatabaseSpreadsheetId_() {
  const databaseId = PropertiesService
    .getScriptProperties()
    .getProperty(DATABASE_PROPERTY_NAME);

  if (!String(databaseId || '').trim()) {
    throw new Error('Script property "' + DATABASE_PROPERTY_NAME + '" is required with the database registry spreadsheet ID.');
  }

  return String(databaseId).trim();
}

function loadTableRegistry_() {
  const databaseId = getDatabaseSpreadsheetId_();
  const cacheKey = TABLE_REGISTRY_CACHE_PREFIX + databaseId;
  const cached = CacheService.getScriptCache().get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const registry = loadTableRegistryFresh_(databaseId);
  CacheService.getScriptCache().put(cacheKey, JSON.stringify(registry), CACHE_TTL_SECONDS);

  return registry;
}

function loadTableRegistryFresh_(databaseId) {
  const registrySpreadsheet = openSpreadsheetById_(
    databaseId,
    'database registry'
  );
  const tableSheet = openSheetByName_(
    registrySpreadsheet,
    REGISTRY_TABLES_SHEET_NAME,
    'database registry'
  );
  const values = tableSheet.getDataRange().getValues();
  const registry = {};

  values.forEach(function(row) {
    const tableName = String(row[0] || '').trim();
    const spreadsheetId = String(row[1] || '').trim();

    if (tableName && spreadsheetId) {
      registry[tableName] = spreadsheetId;
    }
  });

  return registry;
}

function openTableSpreadsheet_(tableName) {
  const registry = loadTableRegistry_();
  const spreadsheetId = registry[String(tableName || '').trim()];

  if (!spreadsheetId) {
    throw new Error('Missing database table "' + tableName + '" in registry sheet "' + REGISTRY_TABLES_SHEET_NAME + '".');
  }

  return openSpreadsheetById_(spreadsheetId, 'database table "' + tableName + '"');
}

function openTableSheet_(tableName, sheetName) {
  const spreadsheet = openTableSpreadsheet_(tableName);

  return openSheetByName_(
    spreadsheet,
    sheetName,
    'database table "' + tableName + '"'
  );
}

function openSpreadsheetById_(spreadsheetId, context) {
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw new Error('Could not open ' + context + ' spreadsheet. Check the ID and permissions. ' + error.message);
  }
}

function openSheetByName_(spreadsheet, sheetName, context) {
  const cleanSheetName = String(sheetName || '').trim();

  if (!cleanSheetName) {
    throw new Error('A sheet name is required for ' + context + '.');
  }

  const sheet = spreadsheet.getSheetByName(cleanSheetName);

  if (!sheet) {
    throw new Error('Missing sheet "' + cleanSheetName + '" in ' + context + '.');
  }

  return sheet;
}

function getHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return {};
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};

  headers.forEach(function(header, index) {
    const key = String(header || '').trim();

    if (key) {
      map[key] = index;
    }
  });

  return map;
}

function requireHeaders_(sheet, requiredHeaders, context) {
  const headers = getHeaderMap_(sheet);
  const missing = requiredHeaders.filter(function(header) {
    return !Object.prototype.hasOwnProperty.call(headers, header);
  });

  if (missing.length) {
    throw new Error('Missing required header(s) in ' + context + ': ' + missing.join(', '));
  }

  return headers;
}

function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
