# Study Group Teachers Spec

Project table:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `study_group_teachers` |

Access pattern:

```javascript
const sheet = openTableSheet_('Incidències', 'study_group_teachers');
```

This sheet stores teachers assigned to study-group sessions.

## Headers

Row 1 contains headers. Data starts in row 2.

Required headers, in current order:

| Column | Header |
| --- | --- |
| A | `id` |
| B | `data` |
| C | `teacher` |

Code should validate headers by name, not only by column position.

## Field Definitions

### `id`

Autonumeric row identifier.

Rules:

- Identifies the `study_group_teachers` row.
- If the sheet does not auto-generate this field, the app must generate the next numeric id when writing future records.
- Preserve existing ids.

### `data`

Study-group session date.

Expected display format:

```text
dd/mm/yyyy
```

Rules:

- Parse as day/month/year.
- Apps Script may read this as a `Date` object or text.
- Use `Europe/Madrid` calendar semantics.
- This field is used by the `Sessions dimarts` page to find teachers for the selected date.

### `teacher`

Teacher full name.

Format:

```text
surnames, name
```

Rules:

- Use for display in `Sessions dimarts`.
- Preserve the stored display text.
- Do not assume it is a stable teacher identifier.

## Relationship With Other Sheets

| Sheet | Relationship |
| --- | --- |
| `config` | Source for `Dia_Grup_Estudi`, used by the `Sessions dimarts` default date. |
| `study_group_students` | Same session date is used to show assigned students. |

## Minimal Read Flow

1. Open `Incidències` -> `study_group_teachers`.
2. Validate required headers.
3. Parse selected date as `dd/mm/yyyy`.
4. Keep rows where `data` equals the selected date.
5. Read teacher names from `teacher`.
6. Display the teacher list in the `Sessions dimarts` page.

## Privacy

`study_group_teachers` is internal/staff-facing.

Do not expose teacher assignments in family-facing views unless a future spec explicitly allows it.
