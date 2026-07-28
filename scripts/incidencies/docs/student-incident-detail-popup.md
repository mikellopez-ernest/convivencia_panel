# Student Incident Detail Popup Spec

Clicking a student name in the points table opens a popup/modal with that student's incidents for the selected academic term.

This is a behavior spec only. Do not implement or deploy unless explicitly requested.

## Trigger

The main points table displays student names in column `Alumne`.

Behavior:

- Clicking a student's name opens a popup window/modal.
- The popup is scoped to the clicked student.
- The popup uses the same selected date and detected term as the main table.

## Data Window

The incident list must include only rows between:

```text
selected term start date <= Data <= today
```

Notes:

- Use the selected term start date from `Incidències -> config`.
- The upper bound is today, not necessarily the date currently selected in the main date picker.
- Date comparisons use `Europe/Madrid` calendar semantics.
- If today is outside the selected term, use the same out-of-period behavior as the main endpoint or show an empty scoped result.

## Student Matching

The popup is for one student.

Preferred matching:

- Use `Id` as the stable student key.

Display:

- Show the student name (`Alumne`) in the popup title.
- Optionally show the resolved group (`Grup`) near the title.

## Popup Table

Columns:

| Column | Source / Derivation |
| --- | --- |
| `Date` | Date part of `llistat_anual`.`Data` |
| `Time` | Time part of `llistat_anual`.`Data` |
| `Subject` | `llistat_anual`.`Assignatura` |
| `Activity` | `llistat_anual`.`Activitat` |
| `Points` | `llistat_anual`.`Puntuació` |
| `Teacher` | `llistat_anual`.`Professor` |
| `Message` | `llistat_anual`.`Missatge` |
| `Intern note` | `llistat_anual`.`Nota interna` |

Sorting:

- Sort by `Data` descending.
- More recent incidents appear first.
- If two incidents have the same datetime, preserve sheet order as tie-breaker.

## Filters

Above the popup table, show combo boxes for:

| Filter | Values |
| --- | --- |
| `Activity` | Distinct `Activitat` values from the displayed student's incident list |
| `Teacher` | Distinct `Professor` values from the displayed student's incident list |

Filter rules:

- Include an all-values option for each combo.
- Filter options are derived from the incidents currently in the popup's term window.
- Changing either combo filters the visible popup rows immediately.
- Filters can be combined.
- If filters produce no rows, show an empty-state message.

Suggested empty state:

```text
No hi ha incidències amb aquests filtres
```

## Privacy

This popup is internal/staff-facing.

Rules:

- `Missatge` can be shown as the family-visible message sent for the incident.
- `Nota interna` can be shown in this popup because the endpoint is restricted by `config.Users`.
- Do not expose this popup to unauthorized users.
- Unauthorized users must not receive popup incident data in server responses.

## Responsive Behavior

- Use Bootstrap modal or equivalent responsive popup.
- The table should scroll inside the modal on small screens.
- Long `Message` and `Intern note` values should wrap cleanly.
- Avoid horizontal page overflow.

## Server Payload

The server should provide a clean payload for one student:

```javascript
{
  studentId: '...',
  alumne: '...',
  grup: '...',
  term: {
    label: '...',
    start: 'dd/mm/yyyy',
    end: 'dd/mm/yyyy'
  },
  incidents: [
    {
      date: 'dd/mm/yyyy',
      time: 'HH:mm',
      subject: '...',
      activity: '...',
      points: '...',
      teacher: '...',
      message: '...',
      internalNote: '...'
    }
  ],
  filters: {
    activities: ['...'],
    teachers: ['...']
  }
}
```

Implementation may use localized display labels in the UI while keeping payload keys stable.
