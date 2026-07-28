# Tuesday Sessions Spec

`Sessions dimarts` is a future section in the left navigation menu.

This is a behavior spec only. Do not implement or deploy unless explicitly requested.

## Purpose

Show the study-group session for a selected date:

- which teachers are assigned
- which students are assigned
- editable student comments for that session

Even though the page label is `Sessions dimarts`, the actual weekday is configured by `Incidències` -> `config` -> `Dia_Grup_Estudi`.

## Data Sources

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Incidències` | `config` | Access control and `Dia_Grup_Estudi` |
| `Incidències` | `study_group_teachers` | Teachers assigned to the selected session date |
| `Incidències` | `study_group_students` | Students assigned to the selected session date and their comments |

Access examples:

```javascript
const configSheet = openTableSheet_('Incidències', 'config');
const teachersSheet = openTableSheet_('Incidències', 'study_group_teachers');
const studentsSheet = openTableSheet_('Incidències', 'study_group_students');
```

## Navigation

The left navigation menu includes:

```text
Sessions dimarts
```

Initial implementation can keep the link target as:

```text
#
```

When developed, selecting `Sessions dimarts` should show this page inside the same app shell.

## Access Control

Use the same access-control rules as `Inici`:

- Read authorized users from `Incidències` -> `config` -> `Users`.
- If the active user is not authorized, show only the no-access warning.
- Unauthorized users must not receive study-group data.

Unauthorized warning:

```text
No tens accés a aquesta aplicació
```

## Default Date

The page has a Spanish-format date picker at the top.

Rules:

- Display/input format: `dd/mm/yyyy`.
- Calendar week starts on Monday.
- Read `config`.`Dia_Grup_Estudi`.
- If today is the configured weekday, default the date picker to today.
- If today is not the configured weekday, default the date picker to the next configured weekday after today.
- `Dia_Grup_Estudi` values are English weekday names:
  - `monday`
  - `tuesday`
  - `wednesday`
  - `thursday`
  - `friday`
- Compare `Dia_Grup_Estudi` after trimming whitespace and lowercasing.
- Surface a clear error if `Dia_Grup_Estudi` is missing or invalid.

Examples:

- If today is Tuesday and `Dia_Grup_Estudi` is `tuesday`, default to today.
- If today is Wednesday and `Dia_Grup_Estudi` is `tuesday`, default to the next Tuesday.
- If today is Monday and `Dia_Grup_Estudi` is `wednesday`, default to the next Wednesday.

Changing the selected date reloads teachers and students for the configured study-group weekday in the same week.

Selected-date normalization:

- The date picker may receive any date.
- The app must resolve the selected date to the configured `Dia_Grup_Estudi` date in the same Monday-Sunday week.
- Example: if `Dia_Grup_Estudi` is `tuesday` and the user selects Monday, load that week’s Tuesday.
- Example: if `Dia_Grup_Estudi` is `tuesday` and the user selects Thursday, load that same week’s Tuesday.
- After loading, the date picker should display the resolved study-group date.

Week navigation:

- Add a left arrow button next to the date picker.
- Add a right arrow button next to the date picker.
- Left arrow moves to the previous week’s configured study-group date.
- Right arrow moves to the next week’s configured study-group date.
- Arrows reload teachers and students after changing the date.

## Teacher Text

Below the filter/date picker, show the teachers assigned to the selected date.

Source:

```text
study_group_teachers where data == selected date
```

Rules:

- Read teacher names from `study_group_teachers`.`teacher`.
- Display the list as text.
- Preserve the teacher name display format: `surnames, name`.
- If no teachers are assigned, show a clear empty message.

Empty teacher message:

```text
No hi ha professorat assignat.
```

## Student Table

The table shows all `study_group_students` rows for the selected date.

Source:

```text
study_group_students where date == selected date
```

Columns:

| Column | Source | Behavior |
| --- | --- | --- |
| `id` | `study_group_students`.`id` | Read-only |
| `date` | `study_group_students`.`date` | Read-only |
| `student` | `study_group_students`.`student` | Read-only |
| `comment` | `study_group_students`.`comment` | Editable text box |

Rules:

- Keep the same column names as the sheet.
- `comment` must be rendered as an editable text box.
- Other columns are read-only.
- Preserve existing comments when loading.
- Editing a comment should mark the row as unsaved.
- The table should be responsive with Bootstrap behavior on narrow screens.

## Save Behavior

The page has a Save button like the main page.

Rules:

- Save only changed `comment` fields.
- Use `study_group_students`.`id` to identify the row to update.
- Update the existing row; do not append a new row when saving comments.
- Do not modify `date` or `student`.
- If there are no changed comments, show an informational message and do nothing.
- After successful save, clear the unsaved state.
- If save fails, keep the changed rows marked as unsaved and show a clear error message.

Validation:

- The selected date must be valid.
- Each edited row must have a valid `id`.
- `comment` may be blank; saving a blank comment clears the previous comment.

## Empty States

If there are no student rows for the selected date:

```text
No hi ha alumnat assignat a aquesta sessió.
```

If there are no assigned teachers:

```text
No hi ha professorat assignat.
```

## Minimal Runtime Flow

1. Load `config`.
2. Check active user against `config`.`Users`.
3. If unauthorized, show only the no-access warning.
4. Read and validate `config`.`Dia_Grup_Estudi`.
5. Set date picker default to today or the next configured weekday.
6. Load `study_group_teachers` for selected date.
7. Load `study_group_students` for selected date.
8. Render teacher text.
9. Render student table with editable `comment` boxes.
10. On date change, resolve the selected date to the configured weekday in the same week.
11. Reload teacher and student data for the resolved date.
12. On Save, update changed `comment` values in `study_group_students`.

## Privacy

`Sessions dimarts` is internal/staff-facing.

Do not expose study-group student assignments or teacher assignments in family-facing views unless a future spec explicitly allows it.
