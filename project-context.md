# Project Context

Current goal: maintain a Google Apps Script web app for incident points, with a reusable connector that can open any spreadsheet and sheet in the shared school database structure when given:

- logical table name
- sheet name inside that table spreadsheet

Do not deploy unless explicitly asked.

Main project data source for future app specs:

- Logical table: `Incidències`
- Sheet: `llistat_anual`
- Purpose: annual list of positive and negative student incidents with point changes.

Main configuration source:

- Logical table: `Incidències`
- Sheet: `config`
- Purpose: term start dates, end-of-year date, valid student groups, authorized endpoint users, restorative-measure options, `Dia_Grup_Estudi` weekday for study-group scheduling, `3r day`/`3r teacher` teacher availability for `Equip 3R`, and expulsion email/folder/master-document/creator settings.

Meeting/intervention records source:

- Logical table: `Incidències`
- Sheet: `meeting_records`
- Purpose: internal records for student meetings/interventions with parent `row_id`, student `Id`, `Data`, `Alumne`, `Grup`, calculated `Punts`, free `Comentari`, and configured restorative `Mesura`. `row_id` links child rows in `study_group_students`, `3r_project`, and `expulsions`.

Study-group assignments source:

- Logical table: `Incidències`
- Sheet: `study_group_students`
- Purpose: rows with autonumeric `id`, parent `row_id`, `date`, `student`, and blank/future `comment` for students assigned to study-group sessions.

Study-group teacher assignments source:

- Logical table: `Incidències`
- Sheet: `study_group_teachers`
- Purpose: rows with autonumeric `id`, `data`, and `teacher` for teachers assigned to study-group sessions.

3R project assignments source:

- Logical table: `Incidències`
- Sheet: `3r_project`
- Purpose: rows with autonumeric `id`, parent `row_id`, `date`, `student`, and `aprofitament` for students assigned to `Equip 3R`.

Expulsions source:

- Logical table: `Incidències`
- Sheet: `expulsions`
- Purpose: rows with autonumeric `id`, parent `row_id`, `date`, `student`, `class`, `start_date`, `return_date`, `incident`, and generated `document` edit URL for expulsion/sanction records.

Planned endpoint: responsive Bootstrap page with a left navigation menu. Menu items are left-aligned and equal priority: `Inici`, `Històric REC`, `Sessions dimarts`, `Equip 3R`, and `Expulsions`. Every DB-backed read/write shows a centered busy indicator. `Inici` shows student points for the selected date. Default date is today. The endpoint first checks active user email against `config.Users`; unauthorized users only see a no-access warning. Authorized flow detects the current academic term from `config`, loads incidents from term start through selected date, sums `Puntuació` by student `Id`, resolves `Grup` from tags, and shows columns: blank status/check icon, `Alumne`, `Grup`, `Punts`, editable `Comentari`, selectable `Mesura`. `Mesura` options come from `config.Mesures_restauratives`. On load, `Inici` also reads `meeting_records` for the selected `Data`; matching `Id` rows prefill `Comentari`/`Mesura` and show a check without orange unsaved state. Hovering the check changes it to a ban/clear icon; clicking deletes the latest matching `meeting_records` row for selected `Data` + student `Id` and resets the table row. Rows turn orange when `Comentari` or `Mesura` is edited. The floating buttons are Save, Refresh/import, and Summary; Summary opens a copy-ready modal built from `meeting_records` for the selected date plus child rows linked by `row_id`, then appends the study-group teachers for the next Tuesday strictly after the selected date and the fixed closing paragraph. The Save button uses a 3.5-inch disk icon, blocks duplicate presses while running, processes edited rows one by one, and appends to `meeting_records`. If `Mesura` is blank, save only. If `Mesura` is `Dimarts tarda`, open a popup asking `Quants dimarts`, generate that many datepickers from the next `config.Dia_Grup_Estudi` weekday after selected date, then append one `study_group_students` row per date with blank `comment`. If `Mesura` is `Equip 3R`, open a popup with a positive number picker, a Spanish-format start-date picker defaulting to today, and a 5x5 Mon-Fri x 4-week table; cells show date, `config.3r teacher` for `config.3r day`, and existing `3r_project.student` or a top-right radio button; occupied cells are green, selected cells turn orange, and exactly the requested count must be selected before writing `3r_project` rows with blank `aprofitament`. If `Mesura` is `Expulsió`, open a popup collecting Data, Creador del document, Com a, Alumne, Classe, Data de començament, Data de tornada, and Incident; `Classe` equals the resolved `Grup`; write `expulsions`, copy `config.expulsions_master_document` into `config.expulsions_folder`, replace `<<...>>` placeholders, share editor link, store it in `expulsions.document`, and email `config.expulsions_email`. Sort by `Punts` ascending, so most negative scores appear first. Click student name to open incident detail popup using `Missatge` and `Nota interna`, sorted newest first with Activity/Teacher filters.

Planned `Històric REC`: read-only page over `meeting_records`, with filters for `Data` datepicker, `Grup` combo from `config.Grups`, and on-the-fly student text matching. Table columns: `Data`, `Alumne`, `Grup`, `Punts`, `Comentari`, `Mesura`.

Planned `Sessions dimarts`: page over `study_group_teachers` and `study_group_students`. Datepicker defaults to today if today matches `config.Dia_Grup_Estudi`, otherwise next configured weekday. If the user selects any other day, resolve it to the configured study-group weekday in the same Monday-Sunday week and show that week’s study session. Left/right arrows beside the datepicker move to previous/next week. Show teacher list for resolved `data`. Show `study_group_students` rows for resolved `date` with columns `id`, `date`, `student`, editable `comment`, and a Save button that updates changed comments in existing rows.

Planned `Equip 3R`: full-month weekday-only calendar page over `3r_project`, loaded from the left menu. It excludes Saturday/Sunday, has Catalan month navigation (`Gener` through `Desembre`) with left/right arrows, and defaults to the current month. Each weekday cell shows date, configured teacher, assigned student, and an `aprofitament` combobox with `Fet amb aprofitament` / `Absent o no aprofitat`. Floating Save updates changed `aprofitament` values only.

Planned `Expulsions`: page over `expulsions`, loaded from the left menu. Student search text box offers on-the-fly matching names/surnames from existing `expulsions.student` values, then shows read-only columns `id`, `date`, `student`, `class`, `start_date`, `return_date`, `incident`, and `document`; render `document` as a link.

Planned import flow: authorized user uses a Refresh icon action to open `Upload and update` or `API update`. Both sources produce an XLSX tracking report; the system detects the incident header row dynamically, discards rows above it, clears `Incidències -> llistat_anual`, and replaces it with the header row plus rows below it. API config lives in script properties: URL `http://135.181.44.245/api/v1/dinantia/tracking/export`, bearer token, and school year. Scheduled daily refresh entry point should be `refreshIncidentTableFromApi`.

Planned refactor: keep behavior stable while improving maintainability and speed. Target split: structural constants in `00_Config.js`, user strings in `01_Strings.js`, generic DB connector in `10_Database.js`, date/format/response/timing helpers in `11_*.js` to `14_*.js`, thin web wrappers in `20_WebApp.js`, domain services by workflow (`ConfigService`, `IncidentService`, `MeetingRecordService`, `StudyGroupService`, `ThirdProjectService`, `ExpulsionService`, `ImportService`), document/email services, and HTML split into `Index.html`, `UiStyles.html`, `UiScripts.html`. Performance priorities: CacheService for registry/config, fewer `google.script.run` round trips, batch simple writes, locks around next-ID appends, read only needed columns where reasonable, client-side page caching, and timing logs before/after optimization. Full detail: `docs/architecture-performance-refactor.md`.

## Hard Rules

- Do not deploy unless explicitly asked.
- Do not hardcode logical table spreadsheet IDs.
- The only database entry point in code is script property `db`.
- Sheet names are supplied by the caller, not configured globally.
- Do not hardcode API secrets.
- Keep docs compact and update them when behavior changes.

## Runtime Contract

`db` script property -> registry spreadsheet -> sheet `tables` -> column A logical table name -> column B table spreadsheet ID -> requested sheet name.

Primary helper:

```javascript
openTableSheet_(tableName, sheetName)
```

Supporting helpers:

- `getDatabaseSpreadsheetId_()`
- `loadTableRegistry_()`
- `openTableSpreadsheet_(tableName)`
- `openSpreadsheetById_(spreadsheetId, context)`
- `openSheetByName_(spreadsheet, sheetName, context)`
- `getHeaderMap_(sheet)`
- `requireHeaders_(sheet, requiredHeaders, context)`
- `codeKey_(value)`

## Current Files

- `README.md`: GitHub-facing overview.
- `project-context.md`: low-token durable context.
- `docs/database-contract.md`: full database structure and rules.
- `docs/architecture-performance-refactor.md`: target architecture and performance refactor plan.
- `docs/incidents-annual-list.md`: main incidents table spec.
- `docs/incidents-config.md`: endpoint configuration table spec.
- `docs/incident-points-endpoint.md`: endpoint behavior and UI spec.
- `docs/incidents-xlsx-import.md`: upload and replace-import behavior spec.
- `docs/student-incident-detail-popup.md`: clicked-student incident detail modal spec.
- `docs/meeting-records.md`: meeting/restorative measure records table spec.
- `docs/meeting-summary.md`: copy-ready meeting summary popup spec.
- `docs/historic-rec.md`: read-only historic REC page spec.
- `docs/study-group-students.md`: study-group assignment table and `Dimarts tarda` popup spec.
- `docs/study-group-teachers.md`: study-group teacher assignment table spec.
- `docs/tuesday-sessions.md`: `Sessions dimarts` page spec.
- `docs/3r-project.md`: `Equip 3R` assignment table and popup spec.
- `docs/expulsions.md`: expulsion/sanction table and document/email workflow spec.
- `codex-pending.txt`: private implementation checklist; delete lines when developed.
- `src/00_Config.js`: database property and registry sheet constants.
- `src/01_Strings.js`: user-facing server strings and email body text.
- `src/10_Database.js`: connector helpers.
- `src/11_Dates.js`: date parsing/formatting and weekday/workday helpers.
- `src/12_Format.js`: formatting, normalization, authorization, and list helpers.
- `src/13_Response.js`: web response wrapper and script-lock helper.
- `src/14_Timing.js`: lightweight performance timing logs.
- `src/20_WebApp.js`: web endpoint wrappers.
- `src/30_Incidents.js`: incident app domain logic, partially awaiting service split.
- `src/40_Import.js`: XLSX/API import logic.
- `src/Index.html`: Bootstrap web UI shell.
- `src/UiStyles.html`: UI CSS include.
- `src/UiScripts.html`: client JavaScript include.
- `src/appsscript.json`: Apps Script manifest.
