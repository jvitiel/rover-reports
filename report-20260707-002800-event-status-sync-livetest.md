# Event Status-Sync Live Test — Cancel + Delete

## Event A — Cancel Path

### Created
- Title: `ZZEVTSTATUS-CANCEL 1783398479`
- Dashboard ID: 25
- EN WP post: 483, ES WP post: 484 [VERIFIED — SELECT dashboard_events]

### Pre-action
- EN 483: `publish` [VERIFIED — authenticated GET `{"id":483,"status":"publish"}`]
- ES 484: `publish` [VERIFIED — authenticated GET `{"id":484,"status":"publish"}`]

### Cancel (POST /api/events/25/cancel)
- Response: `{"success":true}`

### Post-action
- EN 483: `draft` [VERIFIED — authenticated GET `{"id":483,"status":"draft"}`]
- ES 484: `draft` [VERIFIED — authenticated GET `{"id":484,"status":"draft"}`]

**PASS — ES post mirrored the EN draft action.**

---

## Event B — Delete Path

### Created
- Title: `ZZEVTSTATUS-DELETE 1783398511`
- Dashboard ID: 26
- EN WP post: 485, ES WP post: 486 [VERIFIED — SELECT dashboard_events]

### Pre-action
- EN 485: `publish` [VERIFIED — authenticated GET `{"id":485,"status":"publish"}`]
- ES 486: `publish` [VERIFIED — authenticated GET `{"id":486,"status":"publish"}`]

### Delete (DELETE /api/events/26)
- Response: `{"success":true}`

### Post-action
- EN 485: `trash` [VERIFIED — authenticated GET `{"id":485,"status":"trash"}`]
- ES 486: `trash` [VERIFIED — authenticated GET `{"id":486,"status":"trash"}`]

**PASS — ES post mirrored the EN trash action.**

---

## Cleanup

| Item | Action | Result |
|------|--------|--------|
| EN 483 (Event A) | WP REST DELETE (trash) | `{"id":483,"status":"trash"}` [VERIFIED] |
| ES 484 (Event A) | WP REST DELETE (trash) | `{"id":484,"status":"trash"}` [VERIFIED] |
| EN 485 (Event B) | Already trashed by handler | `trash` [VERIFIED] |
| ES 486 (Event B) | Already trashed by handler | `trash` [VERIFIED] |
| Dashboard rows 25, 26 | DELETE FROM dashboard_events | Gone [VERIFIED — SELECT returns empty] |
| WP ZZEVTSTATUS (publish/draft) | Search | `[]` — zero non-trash remain [VERIFIED] |

All test data removed. Zero ZZEVTSTATUS posts remain in publish or draft. Zero ZZEVTSTATUS dashboard rows remain.
