# Incident Points Endpoint Spec

The script will expose an endpoint that renders a student points table for a selected date.

This is a behavior spec only. Do not implement or deploy unless explicitly requested.

## Purpose

Show each student's accumulated incident points for the current academic term up to the selected date.

Scores start at `0` for each student at the beginning of the term. The endpoint sums `llistat_anual`.`Puntuació` for incident rows between the term start date and the selected date.

## Data Sources

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Incidències` | `config` | Term dates, end-of-year date, valid groups, authorized users, restorative-measure options |
| `Incidències` | `llistat_anual` | Incident rows and student point changes |
| `Incidències` | `meeting_records` | Saved meeting/restorative records created from edited student rows |
| `Incidències` | `study_group_students` | Study-group session assignments created from `Dimarts tarda` |
| `Incidències` | `3r_project` | `Equip 3R` project assignments |
| `Incidències` | `expulsions` | Expulsion/sanction records created from `Expulsió` |

Access examples:

```javascript
const configSheet = openTableSheet_('Incidències', 'config');
const incidentsSheet = openTableSheet_('Incidències', 'llistat_anual');
const meetingRecordsSheet = openTableSheet_('Incidències', 'meeting_records');
const studyGroupSheet = openTableSheet_('Incidències', 'study_group_students');
const thirdProjectSheet = openTableSheet_('Incidències', '3r_project');
const expulsionsSheet = openTableSheet_('Incidències', 'expulsions');
```

## UI

The endpoint renders:

- A left-side navigation menu.
- A Spanish date picker at the top.
- A results table below it.

If the active user is not authorized, the endpoint renders only an access warning and must not render the date picker or table.

## App Navigation

The page should use a left-side navigation menu as the main app shell.

Menu options:

| Label | Target | Status |
| --- | --- | --- |
| `Inici` | Current main incident-points page | Active/current page |
| `Històric REC` | Historic REC page | Future section specified in [Historic REC spec](historic-rec.md) |
| `Sessions dimarts` | Tuesday Sessions page | Future section specified in [Tuesday Sessions spec](tuesday-sessions.md) |
| `Equip 3R` | Equip 3R page | Page specified in [3R Project spec](3r-project.md) |
| `Expulsions` | Expulsions page | Page specified in [Expulsions spec](expulsions.md) |

Navigation rules:

- `Inici` must indicate the current active page.
- `Històric REC` can continue to point to `#` until it is developed, but its behavior is now specified separately.
- `Sessions dimarts` can continue to point to `#` until it is developed, but its behavior is now specified separately.
- All five menu options must be left-aligned.
- All five menu options have the same navigation importance; only the active state should visually distinguish the current page.
- The menu must remain usable on mobile, tablet, and desktop.
- On narrow screens, the menu may collapse, become off-canvas, or move behind a standard menu button.
- The menu should not obscure the date picker, action buttons, table, or modals.
- Unauthorized users may still see the navigation shell, but the `Inici` content area must show only the access warning.

Global busy indicator rules:

- Every process that queries or writes database-backed data must show a centered busy indicator.
- The indicator applies to initial page load, date changes, refresh/import actions, main Save, saved-row deletion, popup data loading, popup Save, and navigation pages that read tables.
- The indicator should be visible until the server action finishes successfully or fails.
- If an action fails, hide the busy indicator and show a clear error message.
- Actions that can mutate data must prevent duplicate submissions while running.

Responsive layout rules:

- Use Bootstrap for responsive layout and base components.
- The page must work comfortably on mobile, tablet, and desktop.
- The date picker and table should fit narrow screens without horizontal page overflow.
- The table may use Bootstrap responsive table behavior on small screens.

Date picker rules:

- Default value: today.
- Display/input format: `dd/mm/yyyy`.
- Calendar week starts on Monday.
- Locale should be Spanish/Catalan-friendly where possible.
- Changing the date recalculates the table.

Table columns:

| Column | Source |
| --- | --- |
| blank action/status column | Empty by default. May show a check icon for rows already saved in the current client session. |
| `Alumne` | `llistat_anual`.`Alumne` |
| `Grup` | resolved from `llistat_anual`.`Grups` using `config`.`Grups` |
| `Punts` | sum of `llistat_anual`.`Puntuació` for the selected period |
| `Comentari` | User-editable text box, empty by default |
| `Mesura` | User-selectable dropdown loaded from `config`.`Mesures_restauratives`, with an empty default option |

Meeting-record prefill rules:

- When loading the main page for a selected date, also read `Incidències` -> `meeting_records`.
- Find records where `meeting_records`.`Data` equals the selected date and `meeting_records`.`Id` equals a student row `Id`.
- If a matching meeting record exists, prefill `Comentari` and `Mesura` in that student's row.
- A prefilled row should show the saved/check status icon because the information is already stored.
- A prefilled row must not be orange by default; orange is only for unsaved changes made after load.
- If the user edits a prefilled `Comentari` or `Mesura`, the row becomes orange again and Save appends a new record according to the normal save behavior.
- If more than one matching meeting record exists for the same `Data` and `Id`, use the most recent row in `meeting_records` by sheet order.
- Prefill must not change the calculated `Punts`; the main page still calculates points from `llistat_anual`.

Editable row rules:

- `Comentari` is a text input or textarea suitable for short free text.
- `Mesura` is a select/dropdown.
- The first `Mesura` option must be empty and selected by default.
- Dropdown options come from all non-empty values in `Incidències` -> `config` -> `Mesures_restauratives`.
- If the user writes any non-empty value in `Comentari`, the entire row changes color to orange.
- If the user selects any non-empty value in `Mesura`, the entire row changes color to orange.
- If the user clears both `Comentari` and `Mesura`, the row returns to its normal color.
- Orange means the row has unsaved meeting-record data.
- The status/check column remains empty by default.
- After a row is saved successfully during the current page session, the status/check column may show a check icon.

Saved-row clearing rules:

- Rows loaded from `meeting_records` or saved successfully in the current session may show a check icon in the first column.
- When the pointer hovers over that check icon, the icon should change to a ban/clear icon.
- Clicking the ban/clear icon deletes the saved record from `meeting_records`.
- Delete the same record used to prefill the row. If more than one matching record exists for the same selected `Data` and student `Id`, delete the most recent matching row by sheet order.
- While deletion is running, show the global busy indicator.
- After successful deletion, clear the row's `Comentari`, clear `Mesura`, remove the check icon, remove orange/saved styling, and leave calculated `Punts` unchanged.
- If deletion fails, keep the row as saved and show a clear error message.

Main page action buttons:

- Replace the existing floating action icon with a standard Refresh icon.
- Add a second floating/action button with a standard 3.5-inch disk Save icon.
- Use recognizable icon-only buttons with accessible labels/tooltips.
- Keep both buttons usable on mobile and desktop.

Refresh button behavior:

- The Refresh icon belongs to the existing update/import affordance.
- It should preserve access-control rules: unauthorized users must not see or use it.
- Existing update actions are still governed by [Incidents XLSX import spec](incidents-xlsx-import.md).

Save button behavior:

- The Save icon saves edited rows from the main table into `Incidències` -> `meeting_records`.
- A row is considered edited if `Comentari` is non-empty or `Mesura` is non-empty.
- If no rows are edited, pressing Save should show a light informational message and do nothing.
- Save should not recalculate the point table before writing; it should use the data currently rendered in the row.
- If more than one row is edited, the app processes rows one by one in visible table order.
- After Save is pressed, disable/block the Save button until the complete save workflow finishes or fails.
- After successful save, saved rows should clear their orange unsaved state.
- After successful save, saved rows may show a check icon in the first column.
- If save fails, unsaved rows should remain orange and the user should see a clear error message.

Student detail interaction:

- Student names are clickable controls.
- Clicking `Alumne` opens a popup/modal with that student's incident list.
- The popup uses incident details including `Missatge` and `Nota interna`.
- Full behavior is specified in [Student incident detail popup spec](student-incident-detail-popup.md).

Import interaction:

- Authorized users should see a Refresh action button.
- The Refresh button opens update/import actions:
  - `Upload and update`
  - `API update`
- These actions are specified in [Incidents XLSX import spec](incidents-xlsx-import.md).
- Unauthorized users must not see the refresh/import action.

Meeting-record save interaction:

- Authorized users can edit `Comentari` and `Mesura` directly in the main table.
- Unauthorized users must not receive or save meeting-record data.
- Saving appends one row per edited student to `meeting_records`.
- Saving does not modify `llistat_anual`.

Special `Mesura` behavior:

- If `Mesura` is empty, save the row only to `meeting_records` and do nothing extra.
- If `Mesura` is `Expulsió`, save the row to `meeting_records`, then open the `Expulsió` popup described below.
- If `Mesura` is `Dimarts tarda`, save the row to `meeting_records`, then open the study-group popup described below.
- If `Mesura` is `Equip 3R`, save the row to `meeting_records`, then open the `Equip 3R` popup described below.
- Unknown future `Mesura` values should default to save-only behavior unless a later spec defines special handling.

### `Expulsió` Popup

The `Expulsió` popup is shown when saving a row whose selected `Mesura` is exactly:

```text
Expulsió
```

Popup fields:

| Field | Type | Default/source | Saved to `expulsions` |
| --- | --- | --- | --- |
| `Data` | Spanish-format date picker | Today | `date` |
| `Creador del document` | Text box | Blank, placeholder `Qui signa el document?` | No |
| `Com a` | Combobox | Values from `config`.`expulsions_document_creators` | No |
| `Alumne` | Text box | Current row `Alumne` | `student` |
| `Classe` | Text box | Current row resolved `Grup` | `class` |
| `Data de començament` | Spanish-format date picker | Tomorrow, except Friday -> Monday | `start_date` |
| `Data de tornada` | Spanish-format date picker | Four work days after the start baseline, weekends excluded | `return_date` |
| `Incident` | Text box | Blank, placeholder `Escriu aquí els motius de l'expulsió` | `incident` |

Popup rules:

- Date pickers use `dd/mm/yyyy`, week starts Monday.
- `Data` defaults to today.
- `Data de començament` defaults to the next work day:
  - tomorrow normally
  - Monday if today is Friday
- `Data de tornada` defaults to four work days from the same start baseline, excluding Saturday and Sunday.
- `Com a` options are read from all non-empty values in `config`.`expulsions_document_creators`.
- The popup has a Save button.

Validation:

- `Data`, `Data de començament`, and `Data de tornada` must be valid dates.
- `Creador del document` is required for document generation.
- `Com a` is required and must match a configured creator value.
- `Alumne` is required.
- `Classe` is required.
- In this project, `Classe` and `Grup` are the same value.
- `Incident` is required.
- Expulsion config values `expulsions_email`, `expulsions_folder`, `expulsions_master_document`, and `expulsions_document_creators` must be present.

Save behavior:

- Append one row to `Incidències` -> `expulsions`.
- Create a Google Docs document from `config`.`expulsions_master_document`.
- Store the copied document in Drive folder `config`.`expulsions_folder`.
- Rename the copied document:

```text
Expulsió abreujada {Alumne} {Data}
```

- Replace template placeholders in the copied document.
- Share the copied document so an editor link can be created.
- Store the generated document edit URL in `expulsions`.`document`.
- Send an email to `config`.`expulsions_email`.
- After successful popup save/email, continue processing the next edited row, if any.
- Full table/storage rules are specified in [Expulsions spec](expulsions.md).

Document placeholder replacement:

- The master document contains placeholders wrapped in double angle brackets.
- Replace placeholders with popup values.
- Placeholder names are exactly:
  - `Data`
  - `Creador del document`
  - `Com a`
  - `Alumne`
  - `Classe`
  - `Data de començament`
  - `Data de tornada`
  - `Incident`

Example placeholder:

```text
<<Alumne>>
```

Document sharing:

- The copied document must be shareable by link.
- Create/use an editor link.
- Include the link in the email body.

Email:

- Recipient: `config`.`expulsions_email`.
- Subject format:

```text
Document de sanció greu {Alumne} {today date and time}
```

- Date/time in subject uses 24-hour format.
- Email body:

```text
Benvolgut claustre,

Aquest missatge es genera de manera automàtica cada vegada que es completa el formulari d'expedients abreujats. Us demanem que us fixeu en el nom de l'alumne per si és del vostre curs. Si ho és, assegureu-vos que no poseu falta injustificada a Dinantia i que faciliteu feina pels dies que estigui fora de l'institut.

Si creus que hi ha cap errada en la gestió del document, no et posis en contacte amb l'adreça d'aquest correu (admindomini@iernestlluch.cat), ja que només funciona per automatismes programats com aquest. És preferible derivar-ho a cap d'estudis o direcció.

Si ets la persona que has generat l'expulsió/sanció:

- Revisa el document adjunt per si vols fer cap retoc o revisar el redactat/faltes d'ortografia.
- Imprimeix dues còpies del document. Una és per la família, que l'ha de signar. Com alternativa, si has avisat prèviament la família, també podries enviar-la per Dinantia.una per a l'institut (a entregar al cap d'estudis) i una altra pel representant de la família. L'altra còpia, que també signa la família, ha de quedar guardar-se per part de la cap d'estudis.

Atentament,
```

- Add the generated document editor link to the email body after the fixed text.

### `Dimarts tarda` Popup

The `Dimarts tarda` popup is shown when saving a row whose selected `Mesura` is exactly:

```text
Dimarts tarda
```

Popup fields:

| Field | Type | Rules |
| --- | --- | --- |
| `Quants dimarts` | Numeric input | Required positive non-zero integer. |
| Date pickers | One Spanish-format date picker per requested Tuesday/study-group session | Defaults are generated from `config`.`Dia_Grup_Estudi`; user can change them. |

Rules:

- The popup is tied to one student row at a time.
- The app must read `config`.`Dia_Grup_Estudi`.
- `Dia_Grup_Estudi` is written in English: `monday`, `tuesday`, `wednesday`, `thursday`, or `friday`.
- The first generated date defaults to the next configured weekday after the main page selected date.
- Each following generated date defaults to the same configured weekday one week later.
- Date pickers use the same Spanish date format as the main page: `dd/mm/yyyy`, week starts Monday.
- The popup has a `Desa` button.
- On `Desa`, append one row to `study_group_students` for each selected date.
- `study_group_students`.`student` is the current row's `Alumne`.
- `study_group_students`.`comment` is blank.
- After successful popup save, continue processing the next edited row, if any.
- If the popup is cancelled or fails validation, do not continue silently; keep the main row visible as needing attention.

### `Equip 3R` Popup

The `Equip 3R` popup is shown when saving a row whose selected `Mesura` is exactly:

```text
Equip 3R
```

Popup layout:

- A positive non-zero integer number picker at the top.
- A Spanish-format date picker, defaulting to today, used as the grid start date.
- A `5 x 5` table below it.
- A floating Save button using the same style as other app save buttons.

Number picker rules:

- The selected number is the exact number of cells the user must select.
- If selected cells do not equal the number picker value, do not allow save.

Table rules:

- Header labels are Catalan weekdays:
  - `Dilluns`
  - `Dimarts`
  - `Dimecres`
  - `Dijous`
  - `Divendres`
- Body has 4 rows, each representing one week.
- Each cell represents a weekday date.
- Cell content:
  - date in `dd/mm/yyyy`
  - teacher name from `config`.`3r teacher` for that weekday
  - existing student from `3r_project` for that date, or a selectable radio button in the top-right corner if no student exists
- If a cell is selectable and the user selects it, the cell turns orange.
- If a cell is already occupied by an existing `3r_project` row, the cell is highlighted green.
- Empty cells are not selectable.
- Cells with existing students are not selectable.
- Cells without a configured teacher are not selectable.

Date range rules:

- Build the grid starting from the popup start-date picker, not from the main page selected date.
- The popup start-date picker defaults to today.
- Show available days from the selected start date in the first week.
- Example: if the selected start date is Tuesday, the first row's Monday cell is empty, and the first possible cell is Tuesday.
- Subsequent rows continue week by week.

Teacher mapping:

- Teacher availability is read from `config`.`3r day` and `config`.`3r teacher`.
- `3r day` uses English weekday names: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`.
- Display `3r teacher` for the matching weekday.

Existing assignment mapping:

- Read `Incidències` -> `3r_project`.
- If a row exists with `date` equal to the cell date, show the stored `student`.
- If no row exists for the cell date, show a selectable radio button in the top-right corner.

Save behavior:

- On floating Save, validate selected count equals the number picker value.
- Append one row to `3r_project` for each selected cell.
- `3r_project`.`date` is the selected cell date.
- `3r_project`.`student` is the current main-table row `Alumne`.
- `3r_project`.`id` is autogenerated or generated by the app if needed.
- After successful popup save, continue processing the next edited row, if any.
- Full table/storage rules are specified in [3R Project spec](3r-project.md).

## Access Control

Deployment model:

- The web app will execute as owner.
- The owner/executing account is expected to be `admindomini@iernestlluch.cat`.
- The deployed web app may be accessible to anyone with an `@iernestlluch.cat` email.
- App-level access is controlled by `Incidències` -> `config` -> `Users`.

Authorization rules:

- Read the active user's email from Apps Script.
- Normalize user emails by trimming whitespace and lowercasing.
- Load authorized users from all non-empty cells in `config`.`Users`.
- If the active user's email is in `Users`, continue with the normal endpoint flow.
- If the active user's email is not in `Users`, show only an access warning.
- Unauthorized users must not receive incident data, scores, internal notes, or family messages.

Unauthorized warning:

```text
No tens accés a aquesta aplicació
```

## Term Detection

The selected date determines the active academic period.

Term boundaries come from `Incidències` -> `config`:

- `1r trimestre`
- `2n trimestre`
- `3r trimestre`
- `Fi curs`

Rules:

- First term: `1r trimestre` <= selected date < `2n trimestre`
- Second term: `2n trimestre` <= selected date < `3r trimestre`
- Third term: `3r trimestre` <= selected date <= `Fi curs`
- Outside those ranges, no academic period is active.

Out-of-period message:

```text
Actualment no ens trobem en cap període acadèmic
```

Example:

- If the selected date is April 2 and that date is on or after `3r trimestre` and on or before `Fi curs`, the endpoint calculates the third term.

## Incident Filtering

After detecting the active term:

1. Determine `periodStart`.
2. Use selected date as `periodEnd`.
3. Load rows from `llistat_anual`.
4. Load existing meeting records from `meeting_records` for the selected date.
5. Keep only incident rows where `Data` is within:

```text
periodStart <= Data <= selected date
```

Rules:

- Parse `llistat_anual`.`Data` as a datetime.
- If `Data` is text, parse as `dd/mm/yyyy h:mm:ss`.
- Date comparisons should use `Europe/Madrid` calendar semantics.
- Rows outside the selected term-to-date range are ignored.
- Rows with invalid dates are excluded from calculations and should be available for validation/reporting.

## Score Calculation

For each included incident row:

```text
student_points[Id] += Puntuació
```

Rules:

- Each student starts the selected term with `0` points.
- Group by `llistat_anual`.`Id`.
- Use `llistat_anual`.`Alumne` as display name.
- Parse `Puntuació` as signed number.
- Positive values increase points.
- Negative values decrease points.
- `0` values keep the score unchanged but still count as incident rows.
- Rows with missing `Id` are invalid for aggregation.
- Rows with invalid `Puntuació` are excluded from score totals and should be surfaced in validation/reporting.

## Group Resolution

The `Grup` table column is resolved from:

- `llistat_anual`.`Grups`: comma-separated tags for the student.
- `config`.`Grups`: valid group list.

Resolution rules:

1. Split `llistat_anual`.`Grups` by comma.
2. Trim every tag.
3. Compare against configured groups from `config`.`Grups`.
4. If exactly one tag matches, use it as `Grup`.
5. If none match, `Grup` is unresolved.
6. If multiple match, `Grup` is ambiguous.

Unresolved or ambiguous groups should not prevent point calculation, but should be visible in validation/reporting.

## Recalculation Flow

Initial load:

1. Set date picker to today.
2. Load `config`.
3. Check active user against `config`.`Users`.
4. If unauthorized, show only the no-access warning.
5. If authorized, determine active term for today.
6. If outside academic period, show out-of-period message.
7. If inside academic period, load/filter `llistat_anual`.
8. Aggregate points by student.
9. Load restorative-measure options from `config`.`Mesures_restauratives`.
10. Load existing `meeting_records` for the selected date.
11. Prefill matching `Comentari` and `Mesura` controls.
12. Render table with editable `Comentari` and `Mesura` controls.

On date picker change:

1. Read selected date.
2. Recalculate active term.
3. If outside academic period, clear/hide table and show message.
4. If inside academic period, filter incidents from term start through selected date.
5. Recalculate points.
6. Reload restorative-measure options if needed.
7. Load existing `meeting_records` for the selected date.
8. Prefill matching `Comentari` and `Mesura` controls.
9. Re-render table.

Unsaved edit handling on date change:

- If there are unsaved orange rows and the user changes the selected date, the app should warn before discarding those edits.
- If the user confirms, discard unsaved edits and load the newly selected date.
- If the user cancels, keep the previous date and current table state.

## Empty States

Out of academic period:

```text
Actualment no ens trobem en cap període acadèmic
```

Inside academic period but no incident rows in range:

```text
No hi ha incidències en aquest període
```

Unauthorized user:

```text
No tens accés a aquesta aplicació
```

## Sorting

Default table sorting:

1. `Punts` ascending.
2. `Alumne` ascending as tie-breaker.

This means students with lower scores appear first. Example: a student with `-100` appears above a student with `-80`.

## Saving Meeting Records

The Save button creates rows in:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `meeting_records` |

Rows to save:

- Include only rows where `Comentari` is non-empty or `Mesura` is non-empty.
- Preserve current table sorting; save order can follow the visible order.
- Process rows one by one, not as a single opaque batch, so rows with special `Mesura` values can open their required popup flows.

For each edited row, write:

| `meeting_records` column | Source |
| --- | --- |
| `Id` | Current table row student `Id` |
| `Data` | Date selected in the main date picker |
| `Alumne` | Current table row `Alumne` |
| `Grup` | Current table row `Grup` |
| `Punts` | Current table row `Punts` |
| `Comentari` | Text written in the row's `Comentari` box |
| `Mesura` | Selected row `Mesura` value |

Validation before writing:

- Validate access against `config`.`Users`.
- Validate `meeting_records` required headers.
- Validate the selected date as `dd/mm/yyyy`.
- Validate each edited row has `Id`, `Alumne`, `Grup`, and numeric `Punts`.
- `Mesura` may be blank only when `Comentari` is non-empty.
- If `Mesura` is non-empty, it must exist in `config`.`Mesures_restauratives`.
- `Comentari` may be blank only when `Mesura` is non-empty.

Write behavior:

- Append one new `meeting_records` row per edited table row.
- Do not overwrite existing `meeting_records` rows.
- Do not deduplicate automatically unless a future spec defines duplicate handling.
- Do not write rows where both `Comentari` and `Mesura` are blank.
- On partial failure, the user must see which rows were not saved if that information is available.

Post-save special behavior:

| `Mesura` value | Behavior after meeting record is saved |
| --- | --- |
| blank | No extra action. |
| `Dimarts tarda` | Open study-group popup and write to `study_group_students`. |
| `Expulsió` | Open expulsion popup, write to `expulsions`, generate document, and send email. |
| `Equip 3R` | Open `Equip 3R` popup and write to `3r_project`. |
| any other value | No extra action unless future specs define it. |

## Privacy

The main endpoint table must not display:

- `Missatge`
- `Nota interna`

Only show the requested main-table columns:

- blank status/check column
- `Alumne`
- `Grup`
- `Punts`
- `Comentari`
- `Mesura`

Student detail popup:

- `Missatge` may be shown as the family-visible incident message.
- `Nota interna` may be shown only in internal/staff-facing detail views.
- Do not mix `Nota interna` into family-visible content.
