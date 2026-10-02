# Incidents XLSX Import Spec

The XLSX import flow refreshes a date interval in the main annual incidents table from the uploaded/downloaded first worksheet.

## Purpose

Allow an authorized user to upload or download a complete or partial tracking report `.xlsx` file and make the covered date interval authoritative in:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `llistat_anual` |

The uploaded file may contain report metadata before the actual table. The importer must find the incident header row, discard all rows above it, determine the earliest and latest imported `Data`, remove destination rows in that inclusive interval, and then insert all imported rows.

The import can be started from either source:

- Manual XLSX upload.
- API download of the same tracking report XLSX.

## Observed Example

Reference file:

```text
docs/tracking-report_example.xlsx
```

Observed structure:

- Sheet name: `Worksheet`
- Rows `1-12`: report metadata and filters.
- Row `13`: incident table headers.
- Row `14+`: incident data.
- Columns: exactly the same logical fields as `Incidències -> llistat_anual`.

This row position is useful for understanding the file, but it is not a rule. The import process must find the header row dynamically.

## Required Headers

The importer must locate the table by finding the row containing these required headers:

| Header |
| --- |
| `Id` |
| `Alumne` |
| `Grups` |
| `Activitat` |
| `Assignatura` |
| `Puntuació` |
| `Data` |
| `Professor` |
| `Missatge` |
| `Nota interna` |

Import rules:

- Scan rows only until the required header row is found.
- Do not validate individual data values except `Data`, which is required to calculate the replacement interval.
- Do not require a fixed header row.
- Delete/discard all rows above the detected header row.
- Treat the rows below the detected header as candidate incident rows.
- Ignore fully blank candidate rows.
- Preserve candidate row values as displayed by the converted workbook.

## Import Behavior

High-level flow:

1. User uploads `.xlsx` tracking report.
2. System reads workbook.
3. System converts the XLSX to a temporary Google Spreadsheet.
4. System reads the first worksheet's displayed values.
5. System finds the required incident header row.
6. System discards metadata rows above the header.
7. System parses `Data` in every nonblank candidate row.
8. System calculates the earliest and latest imported calendar dates.
9. System reads the existing rows from `Incidències -> llistat_anual`.
10. System removes existing rows whose `Data` is inside that inclusive interval.
11. System preserves existing rows before or after the interval, including rows whose dates cannot be parsed.
12. System writes the preserved rows followed by all incoming rows.
13. System reports the refreshed interval, imported-row count, and removed-row count.

Date-window replacement rules:

- The interval starts on the earliest imported `Data` date and ends on the latest imported `Data` date, inclusive.
- Time values do not affect interval membership; comparison uses calendar dates in the Apps Script timezone.
- Every existing row within the interval is removed, even when no matching incoming row replaces it.
- Every nonblank incoming row is written. The importer does not compare it with the rows being removed.
- Incoming source order is preserved.
- Existing rows outside the interval retain their relative order and appear before the newly imported rows.
- Existing rows with blank or unreadable `Data` are preserved because they cannot safely be assigned to the interval.
- If the incoming workbook has no incident rows or any nonblank incoming row has invalid `Data`, stop without modifying `llistat_anual`.
- If `llistat_anual` is empty, write the canonical header to row 1 before writing data.
- If `llistat_anual` is not empty, row 1 must contain the canonical headers in the expected order; otherwise stop without writing.
- The destination read and date-window replacement must run under a script lock to prevent concurrent imports from overwriting one another.

Both manual upload and API update must use the same conversion and date-window replacement pipeline after the XLSX file is available.

## Import UI

The endpoint should include a Refresh action button with a standard refresh icon.

Rules:

- Show the Refresh action only for authorized users.
- Keep the action responsive and usable on mobile.
- The Refresh action opens a small menu with two actions:
  - `Upload and update`
  - `API update`
- Unauthorized users must not see or use the import actions.

### `Upload and update`

Behavior:

1. User clicks `Upload and update`.
2. UI opens an upload page, modal, or browser file picker.
3. User selects a `.xlsx` file.
4. System prepares the uploaded file and calculates its date interval.
5. System asks for confirmation before refreshing that interval in `llistat_anual`.
6. If confirmed, system runs the date-window replacement.
7. UI reports success, warnings, or failure.

### `API update`

Behavior:

1. User clicks `API update`.
2. UI shows a single-select control with these exact options and payload values:
   - `Avui`
   - `Ahir`
   - `Últims 7 dies`
   - `2026-27`
3. The default manual selection is `Ahir`.
4. System reads the API URL and bearer token from script properties.
5. System sends the selected text unchanged in the `school_year` JSON property.
6. System calls the API to retrieve the tracking report `.xlsx`.
7. System prepares the downloaded file and calculates its date interval.
8. System asks for confirmation before refreshing that interval in `llistat_anual`.
9. If confirmed, system runs the date-window replacement.
10. UI reports success, warnings, or failure.

The server must reject a manual value outside those four options. The manual selection does not overwrite `tracking_report_school_year`.

## Scheduled API Refresh

There must be one public server function whose only purpose is to run the complete API refresh flow in the background.

Required function name:

```javascript
refreshIncidentTableFromApi
```

Responsibilities:

1. Read API script properties.
2. Call the tracking report API.
3. Receive the XLSX file.
4. Convert the XLSX to a temporary Google Spreadsheet.
5. Find the incident header row in the first worksheet.
6. Discard rows above the header.
7. Calculate the earliest and latest imported `Data` dates.
8. Replace that inclusive date interval in `Incidències -> llistat_anual`.
9. Return/log the interval, imported-row count, removed-row count, and any non-secret diagnostic information.

Rules:

- This is the function to attach to a daily time-driven Apps Script trigger.
- The function must call all lower-level helper methods required by the API import.
- If future implementation splits work into multiple helpers, this wrapper remains the single scheduled entry point.
- The function must fail without modifying `llistat_anual` if the API call, XLSX conversion, header detection, or destination-header validation fails.
- Secrets must not be logged.

Reference terminal command currently used by the user:

```sh
curl \
  "https://automation.hetzner.iernestlluch.info/api/v1/dinantia/tracking/export" \
  --request POST \
  --header "Authorization: Bearer <token>" \
  --header "Content-Type: application/json" \
  --data '{"school_year":"2025-26"}' \
  --output tracking-report.xlsx
```

## API Script Properties

Secrets and variables must be stored in Apps Script script properties, not hardcoded.

Required properties:

| Property | Meaning |
| --- | --- |
| `tracking_report_api_url` | API endpoint URL for the tracking report download. Default/current value: `https://automation.hetzner.iernestlluch.info/api/v1/dinantia/tracking/export`. |
| `tracking_report_bearer` | Bearer token used in the `Authorization` header. |
| `tracking_report_school_year` | Value sent by the unattended `refreshIncidentTableFromApi` function. The manual API action uses its selected UI value instead. |

API request shape:

| Part | Value |
| --- | --- |
| Method | `POST` |
| URL | `{tracking_report_api_url}` |
| Authorization header | `Bearer {tracking_report_bearer}` |
| Content-Type header | `application/json` |
| Body for manual update | `{"school_year":"Avui"}`, `{"school_year":"Ahir"}`, `{"school_year":"Últims 7 dies"}`, or `{"school_year":"2026-27"}` |
| Body for scheduled update | `{"school_year":"{tracking_report_school_year}"}` |

The API response must be treated as an XLSX file and passed through the same conversion and date-window replacement pipeline as a manual upload.

## API Failure Handling

The API update can fail. The UI must show a clear failure message and enough diagnostic detail for troubleshooting.

Failure cases:

- Network error or timeout.
- Missing API script property.
- HTTP response status is not OK, meaning outside the `200-299` range.
- Response body is empty.
- Response body is not a valid `.xlsx` file.
- Response is an error payload instead of a workbook.
- Download succeeds but XLSX conversion/copy fails.

If the API returns a not-OK HTTP status:

- Do not run the import.
- Do not modify `llistat_anual`.
- Show an API failure message.
- Include full non-secret response details available to Apps Script.

User-facing failure details should include:

| Detail | Include? |
| --- | --- |
| Request URL | Yes |
| HTTP method | Yes |
| HTTP status code | Yes |
| HTTP status text, if available | Yes |
| Response headers, if available | Yes |
| Response body preview | Yes |
| Request `school_year` | Yes |
| Bearer token | No |

Secrets must never be shown in the UI or logs:

- Do not display `tracking_report_bearer`.
- Do not display the raw `Authorization` header.
- If logging request headers, redact authorization as `Bearer ***`.

Suggested user-facing summary:

```text
No s'ha pogut descarregar l'informe des de l'API
```

Suggested diagnostic block:

```text
URL: {tracking_report_api_url}
Method: POST
Status: {status_code} {status_text}
School year: {tracking_report_school_year}
Response: {response_body_preview}
```

Response body preview rules:

- Include plain text or JSON error details when available.
- Limit preview length to avoid flooding the page.
- If response is binary or unreadable, show a note such as `Response body is not text-readable`.

Implementation note:

- Apps Script `UrlFetchApp.fetch` should use `muteHttpExceptions: true` so non-2xx responses can be inspected and reported instead of becoming opaque exceptions.
- Only proceed to XLSX conversion when the HTTP status is OK and the response appears to be a workbook.

## Sheet Selection

Use the first worksheet in the uploaded/downloaded workbook.

## Destination Shape

After import, `Incidències -> llistat_anual` should contain:

| Row | Content |
| --- | --- |
| 1 | Detected incident header row |
| 2+ | Existing rows outside the refreshed interval, followed by all imported rows |

The destination must not contain metadata rows above the header.

## Data Preservation

Preserve source displayed values as much as possible.

The importer should not recalculate scores. Score calculation belongs to the endpoint flow.

## Validation

Reject or stop before modifying the destination if:

- File is not readable as `.xlsx`.
- XLSX conversion to a temporary Google Spreadsheet fails.
- The converted first worksheet is empty.
- Required incident header row is not found.
- Required incident headers are duplicated.
- The source contains no nonblank incident rows.
- Any nonblank source row has blank or invalid `Data`.
- A non-empty destination does not have the canonical headers in row 1 and in the expected order.

The import process should not validate each data row before copying. In particular, do not scan every row for:

- blank `Id`
- invalid `Puntuació`
- unresolved `Grups`

Those checks belong to later reporting/endpoint validation, not the import step. `Data` is the exception because the importer requires it to calculate a safe replacement interval.

## Safety

Because the import replaces an interval:

- Confirm the file can be converted and read before modifying `llistat_anual`.
- Calculate and validate the complete source interval before modifying the destination.
- Keep a clear confirmation step before replacement.
- Preserve every existing row outside the inclusive interval.
- Perform the destination read and replacement inside the script lock.
- Write the complete final table before clearing obsolete trailing cells.
- Report the refreshed interval, imported-row count, and removed-row count.

## Access Control

The upload/import UI should use the same `access_granted` role/email authorization source as the endpoint.

Unauthorized users must not be able to upload, preview, or refresh data.
