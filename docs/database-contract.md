# Database Contract

This project uses a shared school database made of a registry spreadsheet plus one spreadsheet per logical table.

## Core Discovery Pattern

Every app must discover table spreadsheet IDs at runtime:

1. Read Apps Script script property `db`.
2. Treat `db` as the spreadsheet ID of the database registry spreadsheet.
3. Open the registry spreadsheet by ID.
4. Open registry sheet `tables`.
5. Read column A as logical table name.
6. Read column B as spreadsheet ID for that logical table.
7. Match logical table names exactly after trimming whitespace.
8. Open the matching table spreadsheet by ID.
9. Open the sheet name requested by the caller.

No logical table spreadsheet IDs should be hardcoded in source code.

## Script Property

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

Apps Script read:

```javascript
PropertiesService.getScriptProperties().getProperty('db')
```

If missing or blank, code must throw a clear error.

## Registry Spreadsheet

The registry spreadsheet must contain a sheet named `tables`.

| Column | Meaning |
| --- | --- |
| A | Logical table name |
| B | Spreadsheet ID for that logical table |

Example logical tables:

| Logical table | Example sheet(s) |
| --- | --- |
| `Horaris` | `GPU001` |
| `Dades de professors` | `Llista`, `leave_absence` |
| `Càrrega lectiva` | `assignatures` |
| `Incidències` | `llistat_anual`, `config`, `meeting_records`, `study_group_students`, `study_group_teachers`, `3r_project`, `expulsions` |

These are examples of current shared tables, not hardcoded connector configuration.

## Generic Helper Responsibilities

The connector should provide helpers equivalent to:

- `getDatabaseSpreadsheetId_()`: read and validate script property `db`.
- `loadTableRegistry_()`: return logical table name -> spreadsheet ID map.
- `openTableSpreadsheet_(tableName)`: open a table spreadsheet through the registry.
- `openTableSheet_(tableName, sheetName)`: open a requested sheet in a requested logical table spreadsheet.
- `openSheetByName_(spreadsheet, sheetName, context)`: open a named sheet with contextual errors.
- `getHeaderMap_(sheet)`: map row-1 header names to zero-based column indexes.
- `requireHeaders_(sheet, requiredHeaders, context)`: validate required row-1 headers.
- `codeKey_(value)`: normalize short codes for joins.

## Code Key Normalization

Use this normalization for joins involving teacher codes or other short codes:

```javascript
function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
```

## Known Shared Tables

The connector should not hardcode these mappings, but app specs may refer to them.

### `Horaris` -> `GPU001`

No header row. One row per scheduled subject occurrence.

| Column | Meaning |
| --- | --- |
| 1 | row number |
| 2 | group name |
| 3 | teacher code, usually `REDUIT` |
| 4 | subject short code |
| 5 | classroom |
| 6 | day number, `1` Monday to `5` Friday |
| 7 | time slot number, `1` to `12` |

Rules:

- Tolerate blank teacher codes.
- Ignore day values outside `1` to `5` for normal weekday rendering.
- Ignore slot values outside `1` to `12` for normal timetable rendering.
- Display subject full name when an app joins against `Càrrega lectiva`.`assignatures`.

### `Dades de professors` -> `Llista`

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `ESP` | Original teacher code. Used by `leave_absence.teacher_code`. |
| `DEPT.` | Department code. |
| `NOM` | First name. |
| `COGNOM1` | First surname. |
| `COGNOM2` | Second surname. |
| `REDUIT` | Short teacher code used by timetable logic. |
| `SITUACIO` | Status text. Do not infer substitute status from this. |
| `JORNADA` | Workload fraction. |
| `DNI` | ID document value. |
| `TELF` | Phone number. |
| `XTEC` | XTEC email. |
| `CORREU` | Institutional/main email. |
| `NOUS` | New teacher boolean flag. |
| `ACTIU` | Active teacher boolean flag. |
| `BAIXA?` | Leave-of-absence boolean flag. |
| `SUBST?` | Substitute boolean flag. |

Rules:

- `REDUIT` joins to `Horaris`.`GPU001` teacher code.
- `ESP` joins to `leave_absence.teacher_code`.
- Full name is `NOM COGNOM1 COGNOM2`, omitting blanks.
- Sort names by `COGNOM1`, then `COGNOM2`, then `NOM`.
- Boolean fields: `NOUS`, `ACTIU`, `BAIXA?`, `SUBST?`.
- Read real boolean `true` and string `TRUE` as true.
- Write boolean fields as real booleans.
- `SUBST?` is the only substitute status source.
- Do not infer substitute status from `SITUACIO`.
- Active teacher: `ACTIU` true.
- Eligible substitute: `SUBST?` true and `ACTIU` true.

### `Dades de professors` -> `leave_absence`

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `row_id` | Original row number in `Llista`. |
| `teacher_code` | Original teacher `ESP`. |
| `substitute_code` | Substitute teacher `REDUIT`. |
| `start_date` | Leave start date. |
| `end_date` | Leave end date. Blank means still active. |
| `comments` | Free comments. |

Rules:

- Leave is active when relevant date is between `start_date` and `end_date`, inclusive.
- Blank `end_date` means active until further notice.
- Relevant date is usually today in Apps Script timezone `Europe/Madrid`.
- `teacher_code` stores original teacher `ESP`.
- `substitute_code` stores substitute teacher `REDUIT`.
- Do not store substitutes as `ESP`.
- If substitute cannot be resolved, keep original teacher and continue.

Effective teacher resolution:

1. Read timetable/source teacher code.
2. If source code is `REDUIT`, map it to teacher `ESP` through `Llista`.
3. Find an active `leave_absence` row where `teacher_code` matches that `ESP`.
4. If found, replace teacher with substitute whose `REDUIT` equals `substitute_code`.
5. If no active leave exists, keep original teacher.
6. If substitute is invalid, keep original teacher.

Normalize all teacher code comparisons with `codeKey_`.

### `Càrrega lectiva` -> `assignatures`

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `short_name` | Short subject code. Matches `Horaris`.`GPU001` column 4. |
| `ETAPA` | Educational stage. |
| `full_name` | Full subject display name. |
| `untis_name` | Subject name/code as used by Untis. |
| `true_subject` | Canonical or normalized subject value. |

Rules:

- Match timetable subject codes using `short_name`.
- Display `full_name` when available.
- If no match or blank `full_name`, fall back to raw subject code.
- Keep raw subject code internally as stable identifier.

### `Incidències`

The incident-points project uses the logical table `Incidències`.

Documented sheets:

| Sheet | Spec |
| --- | --- |
| `llistat_anual` | [Incidents annual list spec](incidents-annual-list.md) |
| `config` | [Incidents config spec](incidents-config.md) |
| `meeting_records` | [Meeting records spec](meeting-records.md) |
| `study_group_students` | [Study group students spec](study-group-students.md) |
| `study_group_teachers` | [Study group teachers spec](study-group-teachers.md) |
| `3r_project` | [3R Project spec](3r-project.md) |
| `expulsions` | [Expulsions spec](expulsions.md) |

Rules:

- Open all sheets through `openTableSheet_('Incidències', sheetName)`.
- Do not hardcode the `Incidències` spreadsheet ID.
- Validate row-1 headers for each sheet before reading or writing.

## Implementation Expectations

- Load only tables required by an app.
- Validate required headers for sheets with headers.
- Keep raw source codes internally.
- Use display names only for UI labels and human-readable output.
- Be defensive with blank optional data.
- Malformed optional relationships must not break the whole app.
