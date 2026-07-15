# 3R Project Spec

Project table:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `3r_project` |

Access pattern:

```javascript
const sheet = openTableSheet_('Incidències', '3r_project');
```

This sheet stores students assigned to `Equip 3R` project sessions.

## Headers

Row 1 contains headers. Data starts in row 2.

Required headers, in current order:

| Column | Header |
| --- | --- |
| A | `id` |
| B | `date` |
| C | `student` |
| D | `aprofitament` |

Code should validate headers by name, not only by column position.

## Field Definitions

### `id`

Autonumeric row identifier.

Rules:

- Identifies the `3r_project` row.
- If the sheet does not auto-generate this field, the app must generate the next numeric id when writing new records.
- New ids should be greater than the current maximum numeric `id` in the sheet.
- Preserve existing ids.

### `date`

`Equip 3R` session date.

Expected display format:

```text
dd/mm/yyyy
```

Rules:

- Parse as day/month/year.
- Apps Script may read this as a `Date` object or text.
- Use `Europe/Madrid` calendar semantics.
- This date is selected in the `Equip 3R` popup.

### `student`

Student full name.

Format:

```text
surnames, name
```

Rules:

- Same display format as `llistat_anual`.`Alumne`.
- Stored from the selected main-page student row.
- This sheet currently stores the student name, not the student `Id`.

### `aprofitament`

Study outcome for the assigned `Equip 3R` session.

Allowed values:

```text
Fet amb aprofitament
Absent o no aprofitat
```

Rules:

- This value can be blank when a row is first created from the main-page `Equip 3R` popup.
- The `Equip 3R` page lets the user select one of the allowed values for existing rows.
- Store exactly one of the allowed values when the user saves an outcome.
- Do not invent additional values in code.

## Relationship With Other Sheets

| Sheet | Relationship |
| --- | --- |
| `config` | Source for `3r day` and `3r teacher`. |
| `meeting_records` | The main Save flow writes a meeting record before optional `3r_project` rows. |
| `llistat_anual` | Source for the student display name shown in the main page. |

## `Equip 3R` Popup

When a main-page row is saved with `Mesura` equal to:

```text
Equip 3R
```

the app must ask for `Equip 3R` scheduling data.

Popup layout:

- Numeric picker at the top.
- Spanish-format date picker below/near the numeric picker.
- A `5 x 5` table below it.
- Floating Save button using the same style as the other app save buttons.

### Number Picker

Rules:

- Required positive non-zero integer.
- Represents how many available cells the user must select.
- If the selected-cell count does not equal this number, do not allow save.
- The app should show a clear validation message when the count is wrong.

### Start Date Picker

Rules:

- The popup includes a Spanish-format date picker, using the same behavior as the other app date pickers.
- Display/input format: `dd/mm/yyyy`.
- Calendar week starts on Monday.
- Default value: today.
- This date controls where the 4-week availability grid starts.
- Changing this date reloads/rebuilds the availability table from the selected start date.
- The date picker does not write directly to `3r_project`; only selected table cells are saved.

### Availability Table

Headers:

| Column | Label |
| --- | --- |
| 1 | `Dilluns` |
| 2 | `Dimarts` |
| 3 | `Dimecres` |
| 4 | `Dijous` |
| 5 | `Divendres` |

Rows:

- The table has 4 body rows.
- Each body row corresponds to one calendar week.
- The total visible grid is therefore 5 weekdays x 4 weeks.

Each cell should contain:

1. Date in `dd/mm/yyyy` format.
2. Teacher name configured for that weekday through `config`.`3r day` / `config`.`3r teacher`.
3. Either:
   - the already assigned student name from `3r_project`, if a row exists for that date, or
   - a radio/select control in the top-right corner if there is no assigned student for that date.

### Date Range Rules

The popup is opened while editing/saving from the main page.

Rules:

- Use the popup start-date picker when building the visible grid.
- Default start date is today.
- Show availability starting from the selected start date.
- If the selected start date is Tuesday, the first row's Monday cell is empty, and the first possible cell is Tuesday.
- More generally, weekdays earlier than the selected start date in the first week should be empty.
- The following rows continue week by week.
- Dates should be shown only for weekdays Monday through Friday.
- Empty cells must not be selectable.

### Teacher Mapping

For each visible weekday cell:

- Read configured teacher from `config`.
- Match weekday by English `3r day` values:
  - `monday`
  - `tuesday`
  - `wednesday`
  - `thursday`
  - `friday`
- Display the corresponding `3r teacher`.
- If no teacher is configured for that weekday, show the date but indicate no teacher is configured and do not allow selection for that cell.

### Existing Student Mapping

For each visible date:

- Look for an existing `3r_project` row where `date` equals the cell date.
- If found, show `3r_project`.`student` in the cell.
- A cell with an existing student is not selectable.
- A cell with an existing student must be visually highlighted in green.
- If multiple rows exist for the same date, show all student names or surface that the date has multiple assigned students; do not allow selecting that cell unless a future spec supports multiple students per date.

### Selection Rules

- Only empty cells with a configured teacher are selectable.
- Selectable cells use a radio button positioned in the top-right corner of the cell.
- Selecting a cell turns it orange.
- Unselecting a cell returns it to normal.
- The selected-cell count must equal the number picker value before save.
- If the count is lower or higher, disable save or show a blocking validation error.

### Save Behavior

On floating Save:

- Validate number picker.
- Validate selected-cell count equals the number picker value.
- Append one row to `3r_project` per selected cell.
- `date` is the selected cell date.
- `student` is the student name from the main table row.
- `aprofitament` is initially blank.
- `id` is generated or left to the sheet if the sheet has autonumeric behavior.
- After successful popup save, continue processing the next edited main-page row, if any.

## `Equip 3R` Page

The left navigation menu includes:

```text
Equip 3R
```

Selecting this menu item should show an `Equip 3R` calendar page inside the same app shell.

### Calendar View

Rules:

- Show one complete month at a time, laid out like a calendar.
- Default month is the current month.
- Show only weekdays Monday through Friday.
- Do not render Saturday or Sunday columns.
- Each visible weekday cell should show:
  - date in `dd/mm/yyyy` format
  - configured teacher for that weekday from `config`.`3r day` / `config`.`3r teacher`
  - existing student assignment from `3r_project`, when present
  - an `aprofitament` combobox for each existing assignment
- The page should use the global busy indicator while loading month data.

### Month Navigation

At the top of the `Equip 3R` page, show:

- left arrow button
- month combobox
- right arrow button

Month combobox values must be Catalan month names:

```text
Gener
Febrer
Març
Abril
Maig
Juny
Juliol
Agost
Setembre
Octubre
Novembre
Desembre
```

Rules:

- Default selected month is the current month.
- The left arrow moves one month backward.
- The right arrow moves one month forward.
- Changing the combobox reloads the calendar for that month.
- Month navigation preserves the selected year internally.
- If the user moves from January backward, year decreases by one and month becomes December.
- If the user moves from December forward, year increases by one and month becomes January.
- The calendar body reloads after every month/year change.

### Outcome Combobox

For each existing `3r_project` row shown in the calendar, render a combobox with:

```text
Fet amb aprofitament
Absent o no aprofitat
```

Rules:

- The combobox value comes from `3r_project`.`aprofitament`.
- If the stored value is blank, show an empty/default option.
- Changing a combobox marks that assignment as edited.
- The page has a floating Save button using the same visual style as the main page.
- The Save button updates only edited `aprofitament` values.
- Disable/block the Save button while saving.
- Use the global busy indicator while saving.

### Page Data Rules

- Load `config`.`3r day` / `config`.`3r teacher` mappings.
- Load all `3r_project` rows whose `date` is inside the visible month.
- Match rows by `id` when saving `aprofitament`.
- If several students exist for the same date, show all of them in that date cell.
- A missing or blank `aprofitament` value must not hide the assignment.
- Do not create new `3r_project` rows from the calendar page unless a future spec explicitly adds that behavior.

## Minimal Write Flow

1. Save the main row to `meeting_records`.
2. If `Mesura` is not `Equip 3R`, do not write `3r_project`.
3. If `Mesura` is `Equip 3R`, open the popup.
4. Load `config`.`3r day` / `config`.`3r teacher` mappings.
5. Show the popup start-date picker with today selected by default.
6. Load existing `3r_project` rows for the visible 4-week range starting from the selected start date.
7. Render the 5 x 5 table.
8. User selects exactly the requested number of available cells.
9. On Save, validate selection.
10. Open `Incidències` -> `3r_project`.
11. Validate required headers.
12. Append one row per selected date.

## Minimal Page Flow

1. User selects `Equip 3R` from the left navigation menu.
2. Show the app shell and global busy indicator.
3. Show month navigation with the current month selected.
4. Load config teacher availability.
5. Load `3r_project` rows for the visible month.
6. Render the full-month weekday-only calendar.
7. User edits `aprofitament` comboboxes.
8. On floating Save, validate edited values.
9. Update only changed `aprofitament` cells in existing rows.

## Privacy

`3r_project` is internal/staff-facing.

Do not expose `Equip 3R` assignments in family-facing views unless a future spec explicitly allows it.
