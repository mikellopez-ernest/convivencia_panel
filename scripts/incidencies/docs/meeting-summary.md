# Meeting Summary Popup Spec

The `Inici` page has three floating buttons:

| Button | Purpose |
| --- | --- |
| Save | Save edited meeting rows and run special measure flows. |
| Refresh | Open the update/import menu. |
| Summary | Open a copy-ready summary of the meeting decisions. |

## Trigger

The Summary button is visible only on `Inici` for authorized users.

When clicked:

1. Read the date selected in the main `Inici` date picker.
2. Load `Incidències` -> `meeting_records`.
3. Filter rows where `meeting_records`.`Data` equals the selected date.
4. Use `meeting_records`.`row_id` to load linked rows from:
   - `study_group_students`
   - `3r_project`
   - `expulsions`
5. Render a modal with a copyable text area and a Copy button.

## Text Format

Title:

```text
Reunió de l'equip de convivència (dd/mm/yyyy)
```

The title date is today's date in `dd/mm/yyyy` format.

Intro:

```text
Reunit l'equip de convivència el dia dd/mm/yyyy, s'han pres les decisions següents:
```

The intro date is the selected `Inici` date used to filter `meeting_records`.

Each meeting row must include:

- Student name from `meeting_records`.`Alumne`.
- Student group from `meeting_records`.`Grup`.
- Points from `meeting_records`.`Punts`, rendered as `xx punts`.
- `Comentari: ` plus `meeting_records`.`Comentari`.
- Extra measure text depending on `meeting_records`.`Mesura`.

After all student decisions, append the next study-group teacher reminder:

```text
Recordem que els professors encarregats de vigilar els alumnes el proper dimarts dd/mm/yyyy són:
```

Rules:

- Calculate the next Tuesday strictly after the selected `Inici` date.
- Load teachers from `study_group_teachers` where `data` equals that next Tuesday.
- Show one list item per teacher.
- If no teachers are registered for that date, show a clear placeholder line.

Final closing:

```text
Per a qualsevol informació, podeu adreçar-vos als membres de l'equip de convivència.

Salut,
```

## Measure-Specific Text

### Blank `Mesura`

Do not add extra measure text.

### `Expulsió`

Use `meeting_records`.`row_id` to find linked `expulsions` rows.

Show the generated document edit URL from `expulsions`.`document`.

If no linked document exists, show that the document is pending.

### `Equip 3R`

Use `meeting_records`.`row_id` to find linked `3r_project` rows.

For each linked date:

- Show the date.
- Resolve the teacher from `config`.`3r day` / `config`.`3r teacher` according to that date's weekday.

Example:

```text
27/07/2026, 04/08/2026 i 11/08/2026 amb Germán Flores Caparrós
```

If the dates have different teachers, group dates by teacher.

### `Dimarts tarda`

Use `meeting_records`.`row_id` to find linked `study_group_students` rows.

Show the selected study-group dates.

Example:

```text
27/07/2026, 04/08/2026 i 11/08/2026
```

## Empty State

If there are no `meeting_records` rows for the selected date, the modal should still open and show:

```text
No hi ha decisions registrades per aquesta data.
```

## Access

Use the same `config`.`Users` access control as the rest of the web app.

Unauthorized users must not receive meeting-summary content.
