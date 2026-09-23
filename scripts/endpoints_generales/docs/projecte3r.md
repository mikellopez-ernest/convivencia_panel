# Projecte 3R Endpoint Spec

Endpoint:

```text
?endpoint=projecte3r
```

## Purpose

Allow any teacher with an `@iernestlluch.cat` email to view the monthly `Equip 3R` calendar and record each student's outcome.

This endpoint mirrors the control-panel `Equip 3R` calendar view, but with domain-wide teacher access instead of control-panel role access.

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

Required headers:

```text
3r day, 3r teacher
```

Use:

- Read all non-empty `3r day` / `3r teacher` pairs.
- Accepted day values: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`.
- Use the configured teacher name for each weekday cell in the calendar.

### Project Assignments

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `3r_project` |

Required headers:

```text
id, student_id, row_id, date, student, aprofitament, teacher_email
```

Use:

- Show rows where `date` belongs to the visible monthly calendar.
- Render `student` as read-only text.
- Render `aprofitament` as an editable combo.

## UI

The page shows:

- Title: `Projecte 3R`.
- Month combo with Catalan month names:
  - `Gener`, `Febrer`, `Març`, `Abril`, `Maig`, `Juny`, `Juliol`, `Agost`, `Setembre`, `Octubre`, `Novembre`, `Desembre`.
- Left/right arrow buttons to move one month backward or forward.
- Weekday-only calendar with columns:
  - `Dilluns`
  - `Dimarts`
  - `Dimecres`
  - `Dijous`
  - `Divendres`
- Each in-month cell shows:
  - date;
  - configured teacher;
  - assigned student rows;
  - one `aprofitament` combo per student.

Saturday and Sunday are not rendered.

Default month:

- Current month.

## Outcome Options

The combo values match the control panel:

```text
Fet amb aprofitament
Absent o no aprofitat
```

The empty value is allowed and clears the outcome.

## Save Behavior

When the teacher presses Save:

1. Validate the active user is an `@iernestlluch.cat` user.
2. Find each submitted row by `3r_project.id`.
3. Overwrite `aprofitament`.
4. Overwrite `teacher_email` with the active user email.

The endpoint does not create new `3r_project` rows. Rows are created by the control panel when a meeting decision uses `Equip 3R`.

## Empty State

No assignments in the selected month:

```text
No hi ha assignacions 3R en aquest mes.
```
