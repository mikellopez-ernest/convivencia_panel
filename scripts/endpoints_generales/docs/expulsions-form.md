# Expulsions Form Endpoint Spec

Endpoint:

```text
?endpoint=expulsions_form
```

## Purpose

Allow any teacher with an `@iernestlluch.cat` email to create an expulsion outside the meeting/control-panel workflow.

## Access

- The deployed web app is domain scoped.
- The endpoint accepts any authenticated user whose email ends in `@iernestlluch.cat`.
- It does not use `Incidències` -> `config` -> `Users`.

## Data Sources

### Groups

| Logical table | Sheet |
| --- | --- |
| `Dinantia` | `dinantia_2_dades_alumnes` |

Headers:

```text
id, dinantia_group_name, dades_alumnes_sheet, dinantia_group_name_incidencies
```

Use:

- `dinantia_group_name` fills the class combo.

Ignore for now:

- `dades_alumnes_sheet`
- `dinantia_group_name_incidencies`

### Students

| Logical table | Sheet |
| --- | --- |
| `Dinantia` | `students_cache` |

Required headers:

```text
student_id, student_name, group_name
```

Use:

- Filter rows where `group_name` matches the selected `dinantia_group_name`.
- Show `student_name` in the student combo.
- Store `student_id` as the stable student identifier.

## Form Fields

- `Data`
- `Creador del document`
- `Com a`
- `Classe`
- `Alumne`
- `Data de començament`
- `Data de tornada`
- `Incident`

Defaults:

- `Data`: today.
- `Data de començament`: next work day after today.
- `Data de tornada`: four work days after start date.
- `Com a`: values from `Incidències` -> `config` -> `expulsions_document_creators`.

## Save Behavior

Write to:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `expulsions` |

Headers:

```text
id, student_id, row_id, date, student, class, start_date, return_date, incident, document, teacher_email
```

Mapping:

| Column | Source |
| --- | --- |
| `id` | Next numeric id |
| `student_id` | Selected `students_cache.student_id` |
| `row_id` | Blank |
| `date` | Form `Data` |
| `student` | Selected `students_cache.student_name` |
| `class` | Selected Dinantia group |
| `start_date` | Form `Data de començament` |
| `return_date` | Form `Data de tornada` |
| `incident` | Form `Incident` |
| `document` | Generated Google Docs edit URL |
| `teacher_email` | Active user email |

Blank `row_id` means the expulsion was created directly by a teacher, not from `meeting_records`.

After writing:

1. Copy `config.expulsions_master_document`.
2. Store the copy in `config.expulsions_folder`.
3. Replace placeholders in the document.
4. Share the document as editable by link.
5. Email `config.expulsions_email`.
6. Use sender display name `Equip de convivència`.
7. Show success message and generated document link.
