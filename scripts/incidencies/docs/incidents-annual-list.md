# Incidents Annual List Spec

Main project table:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `llistat_anual` |

Access pattern:

```javascript
const sheet = openTableSheet_('Incidències', 'llistat_anual');
```

This sheet is the annual incident log for students. It contains positive and negative incidents assigned during the school year. Each incident type has a point value, and the student's running score changes by that value. Every student starts the year with `0` points.

## Headers

Row 1 contains headers. Data starts in row 2.

Required headers, in current order:

| Column | Header |
| --- | --- |
| A | `Id` |
| B | `Alumne` |
| C | `Grups` |
| D | `Activitat` |
| E | `Assignatura` |
| F | `Puntuació` |
| G | `Data` |
| H | `Professor` |
| I | `Missatge` |
| J | `Nota interna` |

Code should validate headers by name, not only by column position.

## Field Definitions

### `Id`

Key field for every student.

Rules:

- Treat as the stable student identifier for aggregation.
- Do not infer uniqueness of rows from `Id`; one student can have many incident rows.
- Preserve as text when possible, even if it looks numeric.

### `Alumne`

Student full name.

Format:

```text
surnames, name
```

Rules:

- Use for display.
- Do not use as the primary key when `Id` is available.

### `Grups`

Comma-separated list of tags for each student.

Rules:

- One tag must identify the student's group.
- The group tag must be one of the configured groups in `Incidències` -> `config`.
- Store/read as raw text unless a feature explicitly needs parsed tags.
- When parsing, split by comma and trim each tag.
- If no parsed tag matches a configured group, the student's group is unresolved and should be surfaced in validation/reporting.

### `Activitat`

Incident type.

Known values:

- `FALTA GREU`
- `FLLEU`
- `POS/Bon comportament`
- `Ús inadequat del mòbil`
- `POS/Participació activa`
- `RETARD`
- `Falta de deures`
- `Falta de material`
- `Compensació parcial`
- `Compensació total`
- `Compensació mitjana`
- `Compensació per mesura restaurativa`

Rules:

- Treat as the incident category/type.
- Do not hardcode point values from the activity name; use `Puntuació`.
- Preserve accents and original display text.
- Unknown future values should not break the app.

### `Assignatura`

Subject where the incident was assigned.

Rules:

- Use for display and filtering.
- It may be blank depending on the incident source.

### `Puntuació`

Point value related to this incident.

Examples:

- `0`
- `-5`
- `+5`

Rules:

- Parse as a signed number for calculations.
- Positive incidents increase the student's score.
- Negative incidents decrease the student's score.
- Compensation/restorative incidents may increase points depending on their value.
- If blank or not parseable, treat as invalid data for score calculations and surface clearly in validation/reporting.

### `Data`

Incident datetime.

Expected display format:

```text
dd/mm/yyyy h:mm:ss
```

Example:

```text
23/10/2025 9:00:00
```

Rules:

- Treat as the incident timestamp.
- Apps Script may read this as a `Date` object or as text depending on sheet formatting.
- If read as text, parse as day/month/year, not month/day/year.
- Use `Europe/Madrid` timezone for date-based grouping unless another spec says otherwise.

### `Professor`

Teacher full name.

Format:

```text
surnames, name
```

Rules:

- Use for display and filtering.
- Do not assume it is a stable teacher identifier.

### `Missatge`

Text sent to the student's family notifying the incident.

Rules:

- This is family-visible communication.
- Preserve line breaks and punctuation.
- Do not expose `Nota interna` as part of this message.

### `Nota interna`

Internal note saved with the incident.

Rules:

- This text is not shared with families.
- Treat as confidential internal data.
- Do not render in family-facing views or exported family notifications.

## Score Model

Every student starts the year with:

```text
0 points
```

For each incident row:

```text
student_points += Puntuació
```

Aggregation rules:

- Group incidents by `Id`.
- Use `Alumne` as display name for the grouped student.
- Include all valid point rows in chronological or sheet order, depending on the feature.
- Preserve raw incidents for auditability.

Validation rules:

- Missing `Id` should be treated as invalid for student score aggregation.
- Missing `Alumne` should be surfaced but does not prevent aggregation if `Id` exists.
- Missing or invalid `Puntuació` should not silently count as `0`.
- Missing or invalid `Data` should not prevent point aggregation, but should be surfaced for date-based features.

## Privacy Rules

- `Missatge` is family-visible.
- `Nota interna` is internal-only.
- Never combine or expose internal notes in family-facing outputs.

## Minimal Read Flow

1. Open `Incidències` -> `llistat_anual`.
2. Open `Incidències` -> `config` when term dates or group resolution are needed.
3. Validate required headers.
4. Read rows from row 2 onward.
5. Convert each row into an incident record.
6. Parse `Puntuació` as signed number.
7. Parse `Data` defensively.
8. Resolve student group from `Grups` using configured groups when needed.
9. Group by `Id` when calculating student totals.
10. Keep raw row number for debugging and audit reports.
