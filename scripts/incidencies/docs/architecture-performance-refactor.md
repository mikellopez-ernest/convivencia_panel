# Architecture and Performance Refactor Spec

This spec defines the next refactor target for the Apps Script incident-points app.

The goal is to keep existing behavior stable while making the code easier to edit, easier to reason about, and faster in normal use.

## Refactor Goals

- Keep all current app behavior unchanged unless a feature spec says otherwise.
- Make user-facing strings easy to edit from one place.
- Split large files by responsibility.
- Reduce repeated `google.script.run` code in the client.
- Reduce repeated spreadsheet reads and writes in the server.
- Use caching where data is shared across requests and does not need second-by-second freshness.
- Keep the code idiomatic for Google Apps Script; prefer clear functions/modules over heavy class hierarchies.
- Keep the generic database connector reusable outside this app.

## Non-Goals

- Do not redesign the user experience during this refactor.
- Do not change sheet headers or database structure.
- Do not change deployment configuration.
- Do not introduce external build tools unless explicitly approved later.
- Do not add secrets or environment-specific IDs to source code.

## Target Source Layout

Recommended target layout:

```text
src/
  appsscript.json
  00_Config.js
  01_Strings.js
  10_Database.js
  11_Dates.js
  12_Format.js
  13_Response.js
  14_Timing.js
  20_WebApp.js
  30_ConfigService.js
  31_IncidentService.js
  32_MeetingRecordService.js
  33_StudyGroupService.js
  34_ThirdProjectService.js
  35_ExpulsionService.js
  36_ImportService.js
  40_DocumentService.js
  41_EmailService.js
  Index.html
  UiStyles.html
  UiScripts.html
```

Apps Script loads files in project order. Keep numeric prefixes so dependencies are available before callers.

## File Responsibilities

### `00_Config.js`

Stores structural constants only:

- script property names
- logical table names
- sheet names
- required sheet headers
- allowed stored values, such as `aprofitament` options
- cache keys and cache TTL constants

Do not put long UI text, email bodies, or validation prose here.

### `01_Strings.js`

Stores user-facing strings:

- Catalan UI labels
- alert messages
- validation messages
- empty-state messages
- modal titles
- email subjects
- email body text
- button tooltips

Expected shape:

```javascript
const STRINGS = Object.freeze({
  accessDenied: 'No tens accés a aquesta aplicació',
  outOfPeriod: 'Actualment no ens trobem en cap període acadèmic',
  save: {
    empty: 'No hi ha registres pendents de desar.',
    success: 'Registres desats correctament.'
  }
});
```

Rules:

- Keep source code logic free from scattered hardcoded user messages.
- Prefer short keys grouped by workflow.
- Use Catalan for user-visible app text.
- Use English for developer-only comments and internal identifiers.

### `10_Database.js`

Generic database connector only:

- read script property `db`
- load registry sheet `tables`
- open table spreadsheet by logical table name
- open requested sheet by name
- header helpers
- normalized code-key helper

Performance responsibilities:

- Cache the registry map with `CacheService`.
- Keep a bypass path for cases where the registry must be refreshed.
- Do not include incident-specific sheet names or business rules.

### `11_Dates.js`

All date helpers:

- parse `dd/mm/yy` and `dd/mm/yyyy`
- parse incident datetime
- format dates and times
- start/end of day
- academic weekday helpers
- workday helpers

Rules:

- Always use Apps Script timezone, expected to be `Europe/Madrid`.
- Keep date parsing strict and explicit.
- Do not duplicate date parsing inside services.

### `12_Format.js`

Formatting and normalization helpers:

- points formatting/parsing
- text normalization
- email normalization
- unique sorted lists
- safe string conversion

### `13_Response.js`

Server response helpers:

```javascript
function okResponse_(payload) {}
function errorResponse_(error, fallbackPayload) {}
function unauthorizedResponse_() {}
```

Rules:

- All public web functions should return consistent response objects.
- Shape should include at minimum `ok`, `status`, and `message` where useful.
- `20_WebApp.js` should use these helpers to avoid repeated `try/catch` blocks.

### `14_Timing.js`

Lightweight performance instrumentation:

```javascript
function createTimer_(label) {
  // mark(name), done()
}
```

Rules:

- Use for refactor measurement and bottleneck discovery.
- Log major stages only: config, sheet read, aggregation, write, document/email.
- Keep instrumentation cheap and removable.
- Do not expose timing logs to end users by default.

### `20_WebApp.js`

Thin public Apps Script web API:

- `doGet`
- public `google.script.run` functions
- no business logic
- no direct sheet reads
- no direct document/email logic

Each public function should delegate to one service function and wrap the result with response helpers.

### Domain Services

Each service owns one domain:

| File | Responsibility |
| --- | --- |
| `30_ConfigService.js` | Load and validate `Incidències -> config`. |
| `31_IncidentService.js` | Main points payload and student incident detail payload. |
| `32_MeetingRecordService.js` | Save, prefill, delete, and historic REC records. |
| `33_StudyGroupService.js` | `Dimarts tarda` popup and `Sessions dimarts` page. |
| `34_ThirdProjectService.js` | `Equip 3R` popup, month page, `aprofitament` updates. |
| `35_ExpulsionService.js` | Expulsion defaults, save flow, history page. |
| `36_ImportService.js` | XLSX upload/API import and scheduled API refresh. |
| `40_DocumentService.js` | Google Docs copy, placeholder replacement, sharing. |
| `41_EmailService.js` | Email composition and sending. |

Rules:

- Services should normalize sheet rows into plain objects immediately.
- Services should write through mapping helpers instead of scattered `row[headers.x] = value` blocks.
- Services should validate required headers before reading/writing.
- Services should not directly manipulate client-specific UI concepts.

## Client Architecture

Split `Index.html` into includes:

```html
<?!= include('UiStyles'); ?>
<?!= include('UiScripts'); ?>
```

`Index.html` should contain the app shell, page sections, modals, and includes.

`UiStyles.html` should contain CSS only.

`UiScripts.html` should contain client JavaScript.

Inside client JavaScript, organize code as small page controllers:

```javascript
const App = { state, init, showPage, setBusy, showAlert };
const Api = { call };
const HomePage = { load, render, save, clearSavedRow };
const HistoricPage = { load, render };
const TuesdayPage = { load, render, save };
const ThirdProjectPage = { load, render, save };
const ExpulsionsPage = { load, render };
const Modals = { studentDetail, studyGroup, thirdProject, expulsion };
```

This can be implemented with plain objects/functions. Classes are not required.

## Client API Wrapper

Add a single wrapper around `google.script.run`.

Responsibilities:

- show the global busy indicator
- hide it on success/failure
- route server errors consistently
- optionally disable a triggering button until the call finishes
- return a Promise-like flow if practical

Conceptual shape:

```javascript
Api.call('getIncidentPointsPayload', [dateText], {
  busy: true,
  button: saveButton
}).then(renderPayload).catch(showError);
```

Benefits:

- Fewer repeated success/failure handlers.
- Consistent busy indicator behavior.
- Easier future debugging.

## Performance Requirements

### Cache Registry

The database registry map should be cached.

Cache:

- key: database registry spreadsheet ID plus `tables`
- value: JSON logical table name -> spreadsheet ID
- TTL: 5 to 15 minutes

Rules:

- Missing required table still throws a clear error.
- Add a bypass/refresh path for forced reloads when needed.

### Cache Config

`Incidències -> config` should be cached.

Cache:

- key: logical table `Incidències` plus sheet `config`
- value: parsed config object
- TTL: 5 to 15 minutes

Cached values:

- term dates
- groups
- users
- restorative measures
- study-group weekday
- 3R teacher mapping
- expulsion settings

Rules:

- Access checks may use cached users.
- A short delay after config edits is acceptable.
- User-triggered data refresh may bypass config cache if needed.

### Reduce Sheet Reads

Prefer reading only needed columns/ranges when reasonable.

Main page:

- Needs `Id`, `Alumne`, `Grups`, `Puntuació`, `Data`.
- Does not need `Missatge` or `Nota interna`.

Student detail:

- Needs all incident detail columns, but only when the user opens the modal.

Historic REC:

- Reads `meeting_records`; filter client-side after first load.

Expulsions:

- Read existing `expulsions.student` values for suggestions.
- Read filtered rows after typing pauses, or load all rows once if the sheet is small.

### Batch Writes

Use `setValues()` where possible.

Batch-friendly writes:

- meeting records append
- study-group student appends
- 3R assignment appends
- expulsion append after document URL is generated

Potential improvements:

- Batch non-special main-page rows in one save call.
- Update Tuesday comments with fewer write calls when rows are contiguous.
- Update 3R `aprofitament` values with fewer write calls when rows are contiguous.

### Reduce Browser-Server Round Trips

Avoid chains of `google.script.run` calls when data can be returned together.

Rules:

- Page load should return all data needed to render that page.
- Modal defaults should include all config/options needed by the modal.
- Main Save should batch simple rows, then handle special workflows only when user input is required.
- Client pages should cache loaded data for the current session and refresh only after saving or explicit reload.

### Lock ID-Generating Writes

Use `LockService` around workflows that calculate next numeric ID and append rows.

Apply to:

- `study_group_students`
- `3r_project`
- `expulsions`

Rules:

- Lock only the smallest critical section.
- Release locks in `finally`.
- Keep user-facing error clear if lock acquisition fails.

### Instrument Before and After

Before making heavy performance changes, add timing logs around current bottlenecks.

Measure:

- config load
- registry load
- annual incident sheet read
- main aggregation
- meeting record prefill read
- historic REC load
- Tuesday sessions load
- 3R month load
- expulsion page load
- document generation
- email sending

After refactor, compare timings before removing or quieting logs.

## Refactor Order

Recommended order:

1. Extract strings into `01_Strings.js`.
2. Extract date/format/response/timing helpers.
3. Add timing instrumentation.
4. Add registry and config caching.
5. Split server logic into domain services without changing behavior.
6. Split `Index.html` into `UiStyles.html` and `UiScripts.html`.
7. Add `Api.call()` client wrapper.
8. Migrate client pages to page-controller objects.
9. Batch simple main-page saves.
10. Add locks around ID-generating writes.
11. Optimize large sheet reads by selecting only needed columns/ranges.
12. Re-run local syntax checks after every step.

## Verification

At minimum after each refactor step:

```sh
node --check src/20_WebApp.js
node --check src/30_Incidents.js
node -e "const fs=require('fs'); const html=fs.readFileSync('src/Index.html','utf8'); const match=html.match(/<script>([\\s\\S]*)<\\/script>\\s*<\\/body>/); if(!match) throw new Error('No inline script found'); new Function(match[1]); console.log('inline script ok');"
```

Update verification commands as files are split.

Do not deploy as part of refactor verification unless explicitly requested.
