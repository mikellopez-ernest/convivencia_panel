# Dimarts Endpoint Spec

Endpoint:

```text
?endpoint=dimarts
```

## Purpose

Allow any teacher with an `@iernestlluch.cat` email to view and update study-group session comments.

This endpoint mirrors the `Sessions dimarts` page in the control panel, but with domain-wide teacher access instead of control-panel role access.

## Access

- The deployed web app is domain scoped.
- The endpoint accepts any authenticated user whose email ends in `@iernestlluch.cat`.
- It does not use `Incidències` -> `config` -> `Users`.
- It does not use the control-panel `access_granted` property.

## Data Sources

### Configuration

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `config` |

Required header:

```text
Dia_Grup_Estudi
```

Use:

- Read the first non-empty `Dia_Grup_Estudi`.
- Accepted values: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`.
- If the teacher selects any day in the date picker, resolve it to the configured study-group weekday in that same week.

### Teachers

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `study_group_teachers` |

Required headers:

```text
id, data, teacher
```

Use:

- Show all `teacher` values where `data` matches the resolved study-group date.

### Students

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `study_group_students` |

Required headers:

```text
id, student_id, row_id, date, student, comment, teacher_email
```

Use:

- Show all rows where `date` matches the resolved study-group date.
- Render `student` as read-only text.
- Render `comment` as an editable text area.

## UI

The page shows:

- Title: `Sessions dimarts`.
- Spanish-format date picker: `dd/mm/yyyy`.
- Left/right arrow buttons to move one week backward or forward.
- Assigned-teacher text for the resolved date.
- Student table with columns:
  - `Alumne`
  - `Comentari`
- Save button.

If the chosen date is not the configured study-group weekday, the server returns the matching configured weekday in the same week. The date picker is updated to that resolved date.

Default date:

- Today if today is the configured study-group weekday.
- Otherwise, the next configured study-group weekday.

## Save Behavior

When the teacher presses Save:

1. Validate the active user is an `@iernestlluch.cat` user.
2. Find each submitted row by `study_group_students.id`.
3. Overwrite `comment`.
4. Overwrite `teacher_email` with the active user email.

The endpoint does not create new study-group rows. Rows are created by the control panel when a meeting decision uses `Dimarts tarda`.

## Empty States

No teachers:

```text
No hi ha professorat assignat.
```

No students:

```text
No hi ha alumnat assignat per aquesta data.
```
