# Incidents Config Spec

Configuration table:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `config` |

Access pattern:

```javascript
const sheet = openTableSheet_('Incidències', 'config');
```

This sheet configures the incidents endpoint. It defines term start dates, the end-of-year date, valid student groups used to resolve group tags from `llistat_anual`, authorized endpoint users, allowed restorative-measure values, the weekday used to schedule study-group sessions, teacher availability for `Equip 3R`, and expulsion document/email settings.

## Headers

Row 1 contains headers. Data starts in row 2.

Required headers, in current order:

| Column | Header |
| --- | --- |
| A | `1r trimestre` |
| B | `2n trimestre` |
| C | `3r trimestre` |
| D | `Fi curs` |
| E | `Grups` |
| F | `Users` |
| G | `Mesures_restauratives` |
| H | `Dia_Grup_Estudi` |
| I | `3r day` |
| J | `3r teacher` |
| K | `expulsions_email` |
| L | `expulsions_folder` |
| M | `expulsions_master_document` |
| N | `expulsions_document_creators` |

Code should validate headers by name, not only by column position.

## Field Definitions

### `1r trimestre`

Date when the first term starts.

Expected display format:

```text
dd/mm/yy
```

Rules:

- Parse as day/month/year.
- Apps Script may read this as a `Date` object or text.
- Use as the lower bound for first-term incident grouping.

### `2n trimestre`

Date when the second term starts.

Expected display format:

```text
dd/mm/yy
```

Rules:

- Parse as day/month/year.
- Use as the lower bound for second-term incident grouping.
- Incidents before this date and on or after `1r trimestre` belong to the first term.

### `3r trimestre`

Date when the third term starts.

Expected display format:

```text
dd/mm/yy
```

Rules:

- Parse as day/month/year.
- Use as the lower bound for third-term incident grouping.
- Incidents before this date and on or after `2n trimestre` belong to the second term.

### `Fi curs`

Date when the school year ends.

Expected display format:

```text
dd/mm/yy
```

Rules:

- Parse as day/month/year.
- Use as the upper bound for school-year incident grouping.
- Incidents after this date are outside the configured school year and should be surfaced in validation/reporting.

### `Grups`

Valid student group value.

Rules:

- This column contains the allowed groups for students.
- Every student belongs to exactly one of these groups.
- `llistat_anual`.`Grups` contains comma-separated tags; one of those tags must match one configured group.
- Compare group tags after trimming whitespace.
- Preserve the configured group text for display.
- Blank rows in `Grups` should be ignored.

### `Users`

Authorized endpoint user email.

Rules:

- This column contains the email addresses allowed to use the endpoint.
- Deployment may allow anyone in `@iernestlluch.cat` to access the web app, but the app must still check this list before showing data.
- Compare emails after trimming whitespace and lowercasing.
- Blank rows in `Users` should be ignored.
- If the active user's email is not listed, the endpoint must not load or display incident data.
- The owner/executing account is expected to be `admindomini@iernestlluch.cat`; this does not replace the active-user authorization check.

### `Mesures_restauratives`

Allowed restorative measure value.

Rules:

- This column contains the values that can be selected in `meeting_records`.`Mesura`.
- Read all non-empty cells in this column as the allowed restorative-measure list.
- Compare selected/stored values after trimming whitespace.
- Preserve the configured text for display and storage.
- Blank rows in `Mesures_restauratives` should be ignored.
- If a feature writes to `meeting_records`, it should only write `Mesura` values that exist in this configured list.

### `Dia_Grup_Estudi`

Weekday used to schedule study-group sessions.

Expected values:

```text
monday
tuesday
wednesday
thursday
friday
```

Rules:

- Values are written in English.
- Compare after trimming whitespace and lowercasing.
- Use the first non-empty value in this column as the configured study-group weekday.
- Surface a clear error if the value is missing or not one of the allowed weekdays when a study-group workflow needs it.
- This value is used when `Mesura` is `Dimarts tarda` to prefill the next study-group dates.

### `3r day`

Weekday where a teacher is available for `Equip 3R`.

Expected values:

```text
monday
tuesday
wednesday
thursday
friday
```

Rules:

- Values are written in English.
- Compare after trimming whitespace and lowercasing.
- Each non-empty `3r day` row should have a corresponding non-empty `3r teacher`.
- Multiple rows can define different weekdays.
- A weekday should have at most one active configured teacher unless a future spec allows multiple teachers for the same day.
- Surface a clear error if a required `Equip 3R` weekday has no configured teacher.

### `3r teacher`

Teacher available for `Equip 3R` on the weekday from `3r day`.

Format:

```text
surnames, name
```

Rules:

- Preserve the configured display text.
- Use this value in the `Equip 3R` popup table.
- Do not assume it is a stable teacher identifier.
- Blank rows should be ignored only when both `3r day` and `3r teacher` are blank.

### `expulsions_email`

Destination email address for expulsion document notifications.

Rules:

- Read the first non-empty value.
- Compare/store after trimming whitespace.
- Must be present before running the `Expulsió` workflow.
- Used as the recipient of the generated email.

### `expulsions_folder`

Google Drive folder ID where generated expulsion documents are stored.

Rules:

- Read the first non-empty value.
- Treat as a Drive folder ID.
- Must be present before running the `Expulsió` workflow.
- The app must create/copy generated documents into this folder.

### `expulsions_master_document`

Google Docs master/template document ID for expulsion documents.

Rules:

- Read the first non-empty value.
- Treat as a Google Docs file ID.
- Must be present before running the `Expulsió` workflow.
- The app must copy this document before replacing placeholders.
- Never modify the master document directly.

### `expulsions_document_creators`

Allowed values for the `Com a` combobox in the `Expulsió` popup.

Rules:

- Read all non-empty cells in this column.
- Preserve display text.
- The popup `Com a` value must be one of these configured values.
- If no values are configured, surface a clear error before the `Expulsió` workflow can be completed.

## Shape Assumption

The config sheet may contain one or more rows.

Recommended read behavior:

- Read term dates from the first non-empty config row containing term/date values.
- Read valid groups from all non-empty cells in the `Grups` column.
- Read authorized users from all non-empty cells in the `Users` column.
- Read restorative measure values from all non-empty cells in the `Mesures_restauratives` column.
- Read the study-group weekday from the first non-empty cell in the `Dia_Grup_Estudi` column when study-group scheduling is needed.
- Read `Equip 3R` teacher availability from paired `3r day` and `3r teacher` cells.
- Read expulsion email/folder/master-document settings from the first non-empty values in their columns.
- Read expulsion document creator options from all non-empty cells in `expulsions_document_creators`.
- Surface an error if required term dates are missing.
- Surface an error if no groups are configured.
- Surface an error if no authorized users are configured.
- Features that create meeting records should surface an error if no restorative measures are configured.
- Features that create study-group records should surface an error if `Dia_Grup_Estudi` is missing or invalid.
- Features that create `Equip 3R` records should surface an error if required `3r day` / `3r teacher` configuration is missing or invalid.
- Features that create expulsion records should surface an error if expulsion email, folder, master document, or document creators are missing.

## Term Boundaries

Given an incident date:

- First term: `1r trimestre` <= date < `2n trimestre`
- Second term: `2n trimestre` <= date < `3r trimestre`
- Third term: `3r trimestre` <= date <= `Fi curs`

Dates before `1r trimestre` or after `Fi curs` are outside the configured school year.

## Group Resolution From `llistat_anual`

To resolve a student's group:

1. Read `llistat_anual`.`Grups`.
2. Split by comma.
3. Trim every tag.
4. Compare each tag with configured groups from `config`.`Grups`.
5. If exactly one tag matches, that is the student's group.
6. If none match, group is unresolved.
7. If multiple match, group is ambiguous and should be surfaced in validation/reporting.

## Minimal Read Flow

1. Open `Incidències` -> `config`.
2. Validate required headers.
3. Read term dates.
4. Read valid groups.
5. Parse dates defensively as `dd/mm/yy` if not already `Date` objects.
6. Validate chronological order: first term < second term < third term <= end of year.
7. Read authorized users from `Users`.
8. Use valid groups to resolve student groups from `llistat_anual`.`Grups`.
9. Read restorative measure options from `Mesures_restauratives` when creating or validating meeting records.
10. Read `Dia_Grup_Estudi` when creating study-group date proposals.
11. Read `3r day` / `3r teacher` pairs when creating `Equip 3R` availability proposals.
12. Read expulsion settings when creating expulsion records/documents/emails.
