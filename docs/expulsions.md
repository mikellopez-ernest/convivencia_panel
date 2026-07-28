# Expulsions Spec

Project table:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `expulsions` |

Access pattern:

```javascript
const sheet = openTableSheet_('Incidències', 'expulsions');
```

This sheet stores expulsion/sanction records created from the `Expulsió` restorative measure workflow.

## Headers

Row 1 contains headers. Data starts in row 2.

Required headers, in current order:

| Column | Header |
| --- | --- |
| A | `id` |
| B | `row_id` |
| C | `date` |
| D | `student` |
| E | `class` |
| F | `start_date` |
| G | `return_date` |
| H | `incident` |
| I | `document` |

Code should validate headers by name, not only by column position.

## Field Definitions

### `id`

Autonumeric row identifier.

Rules:

- Identifies the `expulsions` row.
- If the sheet does not auto-generate this field, the app must generate the next numeric id when writing new records.
- New ids should be greater than the current maximum numeric `id` in the sheet.
- Preserve existing ids.

### `row_id`

Parent meeting record identifier.

Rules:

- References `meeting_records`.`row_id`.
- Written by the `Expulsió` flow after the parent meeting record is saved.
- Used by meeting summaries to find the generated expulsion document link for the decision.
- Required for new rows.

### `date`

Creation date.

Expected display format:

```text
dd/mm/yyyy
```

Rules:

- Comes from the `Data` field in the `Expulsió` popup.
- Defaults to today.
- Parse as day/month/year.
- Apps Script may store this as a Date object formatted as `dd/mm/yyyy` or as text.

### `student`

Student full name.

Format:

```text
surnames, name
```

Rules:

- Comes from the `Alumne` field in the popup.
- Defaults to the main table row student name.
- Store the display value shown to the user.

### `class`

Student class/group.

Rules:

- Comes from the `Classe` field in the popup.
- Defaults to the main table row resolved `Grup`.
- In this project, `Classe` and `Grup` are the same value.
- Store the display value shown to the user.

### `start_date`

Date when the expulsion starts.

Expected display format:

```text
dd/mm/yyyy
```

Rules:

- Comes from the `Data de començament` field in the popup.
- Defaults to the next school/work day:
  - tomorrow by default
  - if today is Friday, default to Monday
- Parse as day/month/year.

### `return_date`

Date when the student returns to class.

Expected display format:

```text
dd/mm/yyyy
```

Rules:

- Comes from the `Data de tornada` field in the popup.
- Defaults to four work days after the expulsion start baseline.
- Do not count weekends.
- Parse as day/month/year.

### `incident`

Free text field explaining why the student is expelled.

Rules:

- Comes from the `Incident` field in the popup.
- Preserve line breaks and punctuation.
- This text is inserted into the generated document.

### `document`

Generated Google Docs edit URL.

Rules:

- Store the editor URL created after copying, filling, and sharing the expulsion document.
- The value is used by the `Expulsions` page to let authorized users open the generated document.
- If document generation fails, do not silently write a blank successful expulsion record; surface the error clearly.

## Configuration

The workflow also uses these config values from `Incidències` -> `config`:

| Config header | Purpose |
| --- | --- |
| `expulsions_email` | Destination email address. |
| `expulsions_folder` | Drive folder ID where generated documents are stored. |
| `expulsions_master_document` | Google Docs template/master document ID. |
| `expulsions_document_creators` | Allowed values for the popup `Com a` combobox. |

## Popup Form Mapping

| Popup field | Saved to `expulsions`? | Target/source |
| --- | --- | --- |
| `Data` | Yes | `date` |
| `Creador del document` | No | Used for document placeholder replacement |
| `Com a` | No | Used for document placeholder replacement |
| `Alumne` | Yes | `student` |
| `Classe` | Yes | `class` |
| `Data de començament` | Yes | `start_date` |
| `Data de tornada` | Yes | `return_date` |
| `Incident` | Yes | `incident` |
| Generated document edit URL | Yes | `document` |

## Minimal Write Flow

1. Save the main row to `meeting_records`.
2. If `Mesura` is not `Expulsió`, do not write `expulsions`.
3. If `Mesura` is `Expulsió`, open the popup.
4. Validate popup fields.
5. Open `Incidències` -> `expulsions`.
6. Validate required headers.
7. Append one row to `expulsions`.
8. Create the Google Docs document from the master template.
9. Replace placeholders.
10. Share the generated document.
11. Store the generated document edit link in `expulsions`.`document`.
12. Send email with the generated document edit link.

## `Expulsions` Page

The left navigation menu includes:

```text
Expulsions
```

Selecting this menu item should show an `Expulsions` page inside the same app shell.

### Filters

At the top of the page, show a student search text box.

Rules:

- The user can type a student's name or surnames.
- While the user types, query/filter existing `expulsions`.`student` values and offer matching options.
- Matching should be case-insensitive and accent-insensitive.
- Selecting an option filters the table to that student.
- If the text box is empty, the page may show all expulsion records or a prompt to search, depending on performance.
- Use the global busy indicator while loading/filtering database-backed results.

### Table

After filtering, show a read-only table with the same content as `Incidències` -> `expulsions`.

Columns:

| Column |
| --- |
| `id` |
| `date` |
| `student` |
| `class` |
| `start_date` |
| `return_date` |
| `incident` |
| `document` |

Rules:

- Render `document` as an openable link when the value is present.
- Preserve the stored date display format.
- Do not expose edit controls on this page unless a future spec adds them.
- Unauthorized users must not receive expulsion table data.

## Privacy

`expulsions` is internal/staff-facing and contains sanction information.

Do not expose expulsion records in family-facing views unless a future spec explicitly allows it.
