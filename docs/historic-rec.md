# Historic REC Spec

`Històric REC` is a future section in the left navigation menu.

This is a behavior spec only. Do not implement or deploy unless explicitly requested.

## Purpose

Show saved restorative/meeting records from `Incidències` -> `meeting_records` in a read-only view.

This page helps staff review previous REC records without editing them.

## Data Sources

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Incidències` | `meeting_records` | Saved REC/meeting records |
| `Incidències` | `config` | Valid groups and access control users |

Access examples:

```javascript
const recordsSheet = openTableSheet_('Incidències', 'meeting_records');
const configSheet = openTableSheet_('Incidències', 'config');
```

## Navigation

The left navigation menu includes:

```text
Històric REC
```

Initial implementation can keep the link target as:

```text
#
```

When developed, selecting `Històric REC` should show this read-only historic records page inside the same app shell.

## Access Control

Use the same access-control rules as `Inici`:

- Read authorized users from `Incidències` -> `config` -> `Users`.
- If the active user is not authorized, show only the no-access warning.
- Unauthorized users must not receive `meeting_records` data.

Unauthorized warning:

```text
No tens accés a aquesta aplicació
```

## Filters

Filters appear at the top of the page.

### Date Filter

Spanish-format date picker.

Rules:

- Same date picker behavior as `Inici`.
- Display/input format: `dd/mm/yyyy`.
- Calendar week starts on Monday.
- Filters `meeting_records`.`Data`.
- Empty date means no date filtering, unless future UX decides to default it.

### Group Filter

Combo box containing existing groups.

Rules:

- Options come from `Incidències` -> `config` -> `Grups`.
- Include an empty/default option meaning all groups.
- Filters `meeting_records`.`Grup`.

### Student Filter

Text box to filter student names.

Rules:

- Filters `meeting_records`.`Alumne`.
- Matching should happen on the fly as the user types.
- Matching is case-insensitive.
- Normalize accents/diacritics for comparison when practical.
- Match any part of the displayed student name.
- The table updates immediately without a full page reload.

## Table

The table is read-only.

It shows the same logical information as the main page meeting-record controls, but without editable fields.

Columns:

| Column | Source |
| --- | --- |
| `Data` | `meeting_records`.`Data` |
| `Alumne` | `meeting_records`.`Alumne` |
| `Grup` | `meeting_records`.`Grup` |
| `Punts` | `meeting_records`.`Punts` |
| `Comentari` | `meeting_records`.`Comentari` |
| `Mesura` | `meeting_records`.`Mesura` |

Rules:

- Do not render text boxes or dropdowns.
- Do not allow edits from this page.
- Preserve line breaks in `Comentari` where reasonable.
- Use Bootstrap responsive table behavior on narrow screens.

## Sorting

Default sorting:

1. `Data` descending, most recent records first.
2. `Alumne` ascending as tie-breaker.

## Empty States

If no records exist:

```text
No hi ha registres REC.
```

If filters produce no matches:

```text
No hi ha registres amb aquests filtres.
```

## Minimal Runtime Flow

1. Load `config`.
2. Check active user against `config`.`Users`.
3. If unauthorized, show only the no-access warning.
4. Load valid groups from `config`.`Grups`.
5. Load rows from `meeting_records`.
6. Validate required `meeting_records` headers.
7. Render filters.
8. Render the read-only table.
9. Apply filter changes client-side when possible.

## Privacy

`Històric REC` is internal/staff-facing.

Do not expose `meeting_records`.`Comentari` or `meeting_records`.`Mesura` in family-facing views unless a future spec explicitly allows it.
