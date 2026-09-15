# Role-Based Access Control Spec

The control panel uses role-based access control backed by Apps Script properties and `Càrrega lectiva`.

## Purpose

Only selected people from the `iernestlluch.cat` workspace may use the control panel. Access is checked before rendering the web app and again before every browser-callable server method.

## Deployment Model

- The web app deployment must use domain access: `access: "DOMAIN"`.
- The web app executes as the deploying owner: `executeAs: "USER_DEPLOYING"`.
- The active visitor is still identified with `Session.getActiveUser().getEmail()`.
- If the active visitor cannot be identified, the app shows the no-access page.

## Script Property

Required script property:

| Property | Meaning |
| --- | --- |
| `access_granted` | Comma-separated list of allowed roles/càrrecs and/or direct institutional email addresses. |

Example:

```text
Coord. 3ESO,COCOBE,mikellopez@iernestlluch.cat
```

Entries containing `@` are direct allowed emails. Entries without `@` are role names resolved through `Càrrega lectiva`.

## Database Sources

The script continues to use the shared registry through script property `db`.

Required logical table:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Càrrega lectiva` | `carrecs` | Resolve allowed role names to assigned people. |
| `Càrrega lectiva` | `professors` | Resolve assigned people to institutional email addresses. |

### `carrecs`

Required columns by position:

| Column | Meaning |
| --- | --- |
| A | Role/càrrec name. |
| D | Assigned person or comma-separated assigned people. |

Role names from `access_granted` are matched to column A after trimming, removing accents, and lowercasing.

### `professors`

Required columns by position:

| Column | Meaning |
| --- | --- |
| L | Institutional email. |
| Q | Full teacher/person lookup key. |

People from `carrecs` column D are matched to column Q after trimming, removing accents, and lowercasing. Matching rows contribute column L emails to the authorized email set.

## Authorization Rules

1. Read the active user email.
2. Read script property `access_granted`.
3. Split the property by commas.
4. Treat entries containing `@` as direct allowed emails.
5. Treat all other entries as role/càrrec names.
6. Resolve role/càrrec names through `Càrrega lectiva`.`carrecs`.
7. Resolve assigned people through `Càrrega lectiva`.`professors`.
8. Allow access only if the active user email is in the direct or resolved email set.

## No-Access Behavior

If access is denied, `doGet()` renders a small standalone no-access page.

The app must not render the normal Bootstrap shell, navigation, tables, forms, internal notes, family messages, or meeting/expulsion data for unauthorized users.

Browser-callable server methods must also call the same access check. Unauthorized direct calls return an error payload through the standard web-action wrapper.

## Legacy `config.Users`

`Incidències`.`config`.`Users` is no longer the access-control source for the control panel.

It may remain in the spreadsheet for historical compatibility, but new authorization decisions must use `access_granted`.

## Permission Helper

The script exposes `grantRequiredPermissions()` for manual authorization in Apps Script. It touches:

- script properties `db` and `access_granted`;
- active user email;
- `Càrrega lectiva`.`carrecs`;
- `Càrrega lectiva`.`professors`.

Run it manually if Apps Script needs to request new permissions.
