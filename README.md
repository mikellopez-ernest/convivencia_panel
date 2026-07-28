# Apps Script School Tools

Workspace for Google Apps Script projects used by the school.

Each script lives in its own folder under `scripts/`, with its own source files, docs, README, clasp configuration template, and deployment lifecycle.

## Scripts

| Script | Folder | Purpose |
| --- | --- | --- |
| Incidències / Convivència | [`scripts/incidencies`](scripts/incidencies) | Incident-points, meeting records, study-group, 3R, and expulsion workflows. |
| Endpoints generals | [`scripts/endpoints_generales`](scripts/endpoints_generales) | General teacher-facing endpoint infrastructure. |

## Layout

```text
docs/
  README.md
scripts/
  incidencies/
    README.md
    project-context.md
    clasp.example.json
    docs/
    src/
  endpoints_generales/
    README.md
    clasp.example.json
    docs/
    src/
```

Local `.clasp.json` files are ignored and should stay inside the corresponding script folder.

The top-level [`docs`](docs) folder is the documentation index. Detailed specs live beside each script in `scripts/*/docs`.

## Common Database Pattern

Both scripts use the shared database registry pattern:

1. Read script property `db`.
2. Open the registry spreadsheet stored in `db`.
3. Read registry sheet `tables`.
4. Resolve logical table names to spreadsheet IDs.
5. Open the requested sheet inside the resolved logical table spreadsheet.

Do not hardcode logical table spreadsheet IDs in source code.

## Working With A Script

Run `clasp` commands from the script folder:

```sh
cd scripts/incidencies
clasp status
clasp push -f
```

```sh
cd scripts/endpoints_generales
clasp status
clasp push -f
```

## Public Repository Notes

Safe to publish:

- `README.md`
- `scripts/*/README.md`
- `scripts/*/docs/`
- `scripts/*/src/`
- `scripts/*/clasp.example.json`

Do not publish secrets or local metadata:

- `.clasp.json`
- `.clasprc*`
- `.env*`
- credentials, service accounts, exported spreadsheets, and reports
