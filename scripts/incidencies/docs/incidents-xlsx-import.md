# Incidents XLSX Import Spec

The XLSX import flow updates the main annual incidents table from a tracking report export by copying the incident table from the uploaded/downloaded first worksheet into the destination sheet.

This is a behavior spec only. Do not implement or deploy unless explicitly requested.

## Purpose

Allow an authorized user to upload or download a tracking report `.xlsx` file and replace the contents of:

| Logical table | Sheet |
| --- | --- |
| `Incidències` | `llistat_anual` |

The uploaded file may contain report metadata before the actual table. The importer must find the incident header row, discard all rows above it, and copy the header row plus all rows below it into `llistat_anual`.

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
- Do not validate individual data values.
- Do not require a fixed header row.
- Delete/discard all rows above the detected header row.
- Copy the detected header row and every row below it into the destination as displayed values.

## Import Behavior

High-level flow:

1. User uploads `.xlsx` tracking report.
2. System reads workbook.
3. System converts the XLSX to a temporary Google Spreadsheet.
4. System reads the first worksheet's displayed values.
5. System finds the required incident header row.
6. System discards metadata rows above the header.
7. System clears existing contents of `Incidències -> llistat_anual`.
8. System writes the header row and data rows into `llistat_anual`.

Replacement rule:

- This is a full replace, not an append.
- The previous `llistat_anual` contents are deleted before writing the uploaded values.
- The destination sheet should start at row 1 with the detected header row.
- Rows below the header should be copied below it.

Both manual upload and API update must use the same conversion and replacement pipeline after the XLSX file is available.

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
4. System prepares the uploaded file for replacement.
5. System asks for confirmation before replacing `llistat_anual`.
6. If confirmed, system runs the full replace import.
7. UI reports success, warnings, or failure.

### `API update`

Behavior:

1. User clicks `API update`.
2. System reads API configuration from script properties.
3. System calls the API to retrieve the tracking report `.xlsx`.
4. System prepares the downloaded file for replacement.
5. System asks for confirmation before replacing `llistat_anual`, unless implementation intentionally defines this action as one-click after download.
6. If confirmed, system runs the full replace import.
7. UI reports success, warnings, or failure.

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
7. Replace `Incidències -> llistat_anual`.
8. Return/log a summary with imported row count and any non-secret diagnostic information.

Rules:

- This is the function to attach to a daily time-driven Apps Script trigger.
- The function must call all lower-level helper methods required by the API import.
- If future implementation splits work into multiple helpers, this wrapper remains the single scheduled entry point.
- The function must fail without clearing `llistat_anual` if the API call, XLSX conversion, or header detection fails.
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
| `tracking_report_school_year` | School year sent in the JSON body, for example `2025-26`. |

API request shape:

| Part | Value |
| --- | --- |
| Method | `POST` |
| URL | `{tracking_report_api_url}` |
| Authorization header | `Bearer {tracking_report_bearer}` |
| Content-Type header | `application/json` |
| Body | `{"school_year":"{tracking_report_school_year}"}` |

The API response must be treated as an XLSX file and passed through the same conversion and replacement pipeline as a manual upload.

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
- Do not clear `llistat_anual`.
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
| 2+ | Rows below the detected header row |

The destination must not contain metadata rows above the header.

## Data Preservation

Preserve source displayed values as much as possible.

The importer should not recalculate scores. Score calculation belongs to the endpoint flow.

## Validation

Reject or stop before replacing the destination if:

- File is not readable as `.xlsx`.
- XLSX conversion to a temporary Google Spreadsheet fails.
- The converted first worksheet is empty.
- Required incident header row is not found.
- Required incident headers are duplicated.

The import process should not validate each data row before copying. In particular, do not scan every row for:

- blank `Id`
- invalid `Puntuació`
- invalid `Data`
- unresolved `Grups`

Those checks belong to later reporting/endpoint validation, not the import step. The import step finds the header row and copies the resulting table.

## Safety

Because this import replaces the whole destination table:

- Confirm the file can be converted and read before clearing `llistat_anual`.
- Prefer a clear confirmation step before replacement.
- If implementation supports it, keep a timestamped backup or restore point before clearing.
- Never partially clear the destination if uploaded data cannot be written.
- Report how many rows were imported.

## Access Control

The upload/import UI should use the same authorization source as the endpoint:

| Logical table | Sheet | Column |
| --- | --- | --- |
| `Incidències` | `config` | `Users` |

Unauthorized users must not be able to upload, preview, or replace data.
