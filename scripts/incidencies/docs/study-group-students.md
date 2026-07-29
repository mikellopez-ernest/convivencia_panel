# Study Group Students Spec

Project table:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `study_group_students` |

Access pattern:

```javascript
const sheet = openTableSheet_('Incidències', 'study_group_students');
```

This sheet stores students assigned to study-group sessions.

## Headers

Row 1 contains headers. Data starts in row 2.

Required headers, in current order:

| Column | Header |
| --- | --- |
| A | `id` |
| B | `student_id` |
| C | `row_id` |
| D | `date` |
| E | `student` |
| F | `comment` |
| G | `teacher_email` |

Code should validate headers by name, not only by column position.

## Field Definitions

### `id`

Autonumeric row identifier.

Rules:

- Identifies the `study_group_students` row.
- If the sheet does not auto-generate this field, the app must generate the next numeric id.
- New ids should be greater than the current maximum numeric `id` in the sheet.
- Preserve existing ids.

### `student_id`

Student identifier.

Rules:

- Same stable student key as the source points row.
- Written when rows are generated from the `Dimarts tarda` workflow.
- Required for new rows.

### `row_id`

Parent meeting record identifier.

Rules:

- References `meeting_records`.`row_id`.
- Written by the `Dimarts tarda` flow after the parent meeting record is saved.
- Used by meeting summaries to list the exact study-group dates for a decision.
- Required for new rows.

### `date`

Study-group session date.

Expected display format:

```text
dd/mm/yyyy
```

Rules:

- Parse as day/month/year.
- Apps Script may read this as a `Date` object or text.
- Use `Europe/Madrid` calendar semantics.
- The default dates are proposed from `config`.`Dia_Grup_Estudi`, but the user may change them before saving.

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

### `comment`

Free text field.

Rules:

- Created blank when records are generated from the `Dimarts tarda` workflow.
- May be filled later.

### `teacher_email`

Email of the teacher who last saved the `comment`.

Rules:

- Created blank when records are generated from the `Dimarts tarda` workflow.
- Set to the active user email when `comment` is saved from the panel.
- Future teacher-facing endpoints must also set/overwrite this value when saving `comment`.
- Overwrite on every comment save.
- Preserve line breaks and punctuation.

## Relationship With Other Sheets

| Sheet | Relationship |
| --- | --- |
| `config` | Source for `Dia_Grup_Estudi`. |
| `meeting_records` | The main Save flow writes a meeting record before optional study-group rows. |
| `llistat_anual` | Source for the student display name shown in the main page. |

## `Dimarts tarda` Workflow

When a main-page row is saved with `Mesura` equal to:

```text
Dimarts tarda
```

the app must ask for study-group scheduling data.

Popup fields:

| Field | Type | Rules |
| --- | --- | --- |
| `Quants dimarts` | Numeric input | Required positive non-zero integer. |
| Date list | One date picker per requested session | Defaults are computed from `config`.`Dia_Grup_Estudi`; user may change each date. |

Default date calculation:

1. Read the selected main-page date.
2. Read `config`.`Dia_Grup_Estudi`.
3. Find the next date after the selected main-page date whose weekday matches `Dia_Grup_Estudi`.
4. Create one date picker for each requested session.
5. The first picker defaults to the next matching weekday.
6. Each following picker defaults to the same weekday in the following week.

Examples:

- If selected main date is a Monday and `Dia_Grup_Estudi` is `tuesday`, the first default date is the next Tuesday.
- If selected main date is Tuesday and `Dia_Grup_Estudi` is `tuesday`, the first default date is the following Tuesday, because it must be the next study-group day after the selected date.

Save behavior:

- The popup has a `Desa` button.
- On `Desa`, append one row to `study_group_students` for each selected date.
- `student` is the student name from the main table row.
- `comment` is blank.
- `date` is the selected date from each popup date picker.
- `id` is generated or left to the sheet if the sheet has autonumeric behavior.

Validation:

- `Quants dimarts` must be a positive non-zero integer.
- Every generated date picker must have a valid `dd/mm/yyyy` date.
- `Dia_Grup_Estudi` must be present and valid.
- The student name must be present.

## Minimal Write Flow

1. Save the main row to `meeting_records`.
2. If `Mesura` is not `Dimarts tarda`, do not write `study_group_students`.
3. If `Mesura` is `Dimarts tarda`, open the study-group popup.
4. Read and validate `Quants dimarts`.
5. Generate default dates from `config`.`Dia_Grup_Estudi`.
6. Allow the user to edit the dates.
7. On `Desa`, validate selected dates.
8. Open `Incidències` -> `study_group_students`.
9. Validate required headers.
10. Append one row per selected date.

## Privacy

`study_group_students` is internal/staff-facing.

Do not expose study-group assignments in family-facing views unless a future spec explicitly allows it.
