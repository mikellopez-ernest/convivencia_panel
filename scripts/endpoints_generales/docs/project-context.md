# Endpoints Generales Project Context

This is a separate Google Apps Script project from the incident-points app.

Script ID:

```text
1qIMmFTma2DHaZF4XIb-T3jRlzwkJnV8CB3pTjPQxj97Du4YDLOlcVzrB
```

Purpose:

- General teacher-facing endpoint.
- Allow teachers to interact with school tools that do not belong only to the incident-points workflow.
- Keep the project small and modular so future actions can be added without copying large app logic.

Access:

- Web app access is domain-scoped.
- The first payload checks the active user email.
- Authorized users are emails ending in `@iernestlluch.cat`.
- Non-domain or unidentified users see only an access warning.

Database:

- Uses the shared database registry pattern.
- Reads script property `db`.
- Opens registry sheet `tables`.
- Opens logical table spreadsheets by name, then sheets by explicit sheet name.
- No logical table spreadsheet IDs should be hardcoded.

Current source layout:

```text
src/
  appsscript.json
  00_Config.js
  01_Strings.js
  10_Database.js
  11_Format.js
  12_Response.js
  20_WebApp.js
  30_TeacherPortal.js
  Index.html
  UiStyles.html
  UiScripts.html
```

Current behavior:

- `doGet()` renders a Bootstrap page.
- `doGet(e)` reads `endpoint` and renders the shared Bootstrap page.
- Default endpoint is `teacher_portal`.
- `?endpoint=expulsions_form` renders a direct teacher-created expulsion form.
- The form reads class groups from `Dinantia`.`dinantia_2_dades_alumnes`.`dinantia_group_name`.
- It reads students from `Dinantia`.`students_cache`, filtered by `group_name`.
- It writes to `Incidències`.`expulsions` with blank `row_id`, filled `student_id`, and `teacher_email` set to the active user email.

Future actions should add:

- a small service module,
- one public wrapper in `20_WebApp.js`,
- a compact UI section,
- specs before implementation.
