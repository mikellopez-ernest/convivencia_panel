# Apps Script Incident Points App

Google Apps Script web app for viewing and maintaining school incident points.

This script lives in:

```text
scripts/incidencies
```

The project keeps a generic database connector, then builds an incident-points endpoint on top of it:

- Discover spreadsheets through the shared database registry.
- Provide a left navigation shell for current and future incident workflows.
- Render student point totals for the selected academic term/date.
- Restrict access through `Incidències -> config -> Users`.
- Import/refresh `Incidències -> llistat_anual` from a tracking-report XLSX.
- Document internal meeting/restorative records in `Incidències -> meeting_records`.
- Specify a future read-only `Històric REC` page for saved meeting records.
- Document study-group assignments in `Incidències -> study_group_students`.
- Specify a future `Sessions dimarts` page for study-group teachers/students.
- Document `Equip 3R` assignments, outcome tracking, and calendar view in `Incidències -> 3r_project`.
- Document expulsion records, generated document/email workflow, and expulsion history view in `Incidències -> expulsions`.

## Scope

The code should stay focused on this incidents workflow.

- No hardcoded table spreadsheet IDs.
- No hardcoded logical table-to-sheet mapping.
- No secrets in source code.
- No deployment unless explicitly requested.
- Keep the generic database connector reusable.

## Database Model

The database is a registry spreadsheet plus one spreadsheet per logical table.

1. Apps Script reads script property `db`.
2. `db` is the spreadsheet ID of the registry spreadsheet.
3. The registry contains a sheet named `tables`.
4. In `tables`, column A is the logical table name.
5. In `tables`, column B is the spreadsheet ID for that logical table.
6. Code opens the requested table spreadsheet, then the requested sheet name.

Current `Incidències` sheets documented by this project:

| Sheet | Purpose |
| --- | --- |
| `llistat_anual` | Annual incident log and point changes. |
| `config` | Term dates, valid groups, authorized users, restorative-measure options. |
| `meeting_records` | Internal student meeting/intervention records. |
| `study_group_students` | Study-group session assignments. |
| `study_group_teachers` | Study-group teacher assignments. |
| `3r_project` | `Equip 3R` student assignments and outcome tracking. |
| `expulsions` | Expulsion/sanction records and generated document links. |

## Usage

```javascript
const sheet = openTableSheet_('Horaris', 'GPU001');
const values = sheet.getDataRange().getValues();
```

For sheets with headers:

```javascript
const headers = requireHeaders_(sheet, ['short_name', 'full_name'], 'assignatures');
const fullNameColumn = headers.full_name;
```

## Required Script Property

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

Import/API properties:

| Property | Meaning |
| --- | --- |
| `tracking_report_api_url` | API endpoint URL. Current value: `http://135.181.44.245/api/v1/dinantia/tracking/export`. |
| `tracking_report_bearer` | Bearer token for the API request. |
| `tracking_report_school_year` | School year sent in the API body, e.g. `2025-26`. |

## Source Layout

Current compact source layout:

```text
src/
  appsscript.json   Apps Script manifest
  00_Config.js      Constants
  01_Strings.js     Server-side user-facing strings
  10_Database.js    Registry/database connector helpers
  11_Dates.js       Date parsing/formatting helpers
  12_Format.js      Formatting and normalization helpers
  13_Response.js    Web response and locking helpers
  14_Timing.js      Lightweight timing instrumentation
  20_WebApp.js      Web endpoint functions
  30_Incidents.js   Incident scoring and term logic
  40_Import.js      XLSX/API import logic
  Index.html        Bootstrap UI shell
  UiStyles.html     UI CSS include
  UiScripts.html    Client JavaScript include
```

The next planned refactor will split constants, strings, helpers, domain services, styles, and client scripts into smaller files. See [Architecture and performance refactor spec](docs/architecture-performance-refactor.md).

## Local Commands

Run commands from this script folder:

```sh
cd scripts/incidencies
```

Create a local clasp config from the public-safe example:

```sh
cp clasp.example.json .clasp.json
```

Then set your real Apps Script project ID in `.clasp.json`. This file is ignored by Git because it contains deployment-specific project information.

```sh
clasp pull
clasp push
clasp deploy --deploymentId <deployment_id> -d "Incident points endpoint"
```

This repository can be uploaded to GitHub as source documentation and a `clasp` Apps Script web app project.

## Specs

- [Project context](project-context.md)
- [Database contract](docs/database-contract.md)
- [Architecture and performance refactor spec](docs/architecture-performance-refactor.md)
- [Incidents annual list spec](docs/incidents-annual-list.md)
- [Incidents config spec](docs/incidents-config.md)
- [Incident points endpoint spec](docs/incident-points-endpoint.md)
- [Incidents XLSX import spec](docs/incidents-xlsx-import.md)
- [Student incident detail popup spec](docs/student-incident-detail-popup.md)
- [Meeting records spec](docs/meeting-records.md)
- [Meeting summary popup spec](docs/meeting-summary.md)
- [Historic REC spec](docs/historic-rec.md)
- [Study group students spec](docs/study-group-students.md)
- [Study group teachers spec](docs/study-group-teachers.md)
- [Tuesday Sessions spec](docs/tuesday-sessions.md)
- [3R Project spec](docs/3r-project.md)
- [Expulsions spec](docs/expulsions.md)
