# Endpoints Generales

Google Apps Script web app for general teacher-facing interactions.

This project is separate from the incident-points endpoint. It shares the same database discovery pattern but keeps its own Apps Script project, source folder, manifest, and deployment lifecycle.

## Apps Script Project

Script ID:

```text
1qIMmFTma2DHaZF4XIb-T3jRlzwkJnV8CB3pTjPQxj97Du4YDLOlcVzrB
```

Local clasp config:

```text
scripts/endpoints_generales/.clasp.json
```

The local `.clasp.json` is ignored by Git. Use `clasp.example.json` as the public-safe template.

## Scope

The goal is to offer every teacher a general way to interact with school tools.

Initial infrastructure includes:

- Apps Script web app shell.
- Bootstrap UI.
- Active-user detection.
- Domain-based access for `@iernestlluch.cat`.
- Shared database registry connector using script property `db`.
- Routed endpoint `?endpoint=expulsions_form` for direct teacher-created expulsions.

## Required Script Property

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the shared database registry spreadsheet. |

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| default / `teacher_portal` | General landing page. |
| `expulsions_form` | Teacher-facing expulsion form. |

Specs:

- [Expulsions form endpoint](docs/expulsions-form.md)

## Local Commands

From this folder:

```sh
clasp push -f
clasp deploy -d "Initial teacher portal infrastructure"
```

From the repository root:

```sh
cd scripts/endpoints_generales
clasp push -f
```
