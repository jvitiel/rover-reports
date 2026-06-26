# Email Seed Read-Path Audit — Domain Cutover Bearing

**Date:** 2026-06-26 15:10 UTC

---

## Seed 1: RG Email Routing (localDatabase.ts:3477)

### Table + Seed Statement

**Table:** `rg_email_routing`

```typescript
// localDatabase.ts:3474-3479
const categories: RGRequestCategory[] = ['general', 'records', 'adoption', 'complaint', 'media', 'legal'];
for (const category of categories) {
  addRGEmailRouting(category, 'flgnynjai@gmail.com', 'Test Staff');
}
```

Seeds 6 rows (one per category), all pointing to `flgnynjai@gmail.com`.

### Live DB State

```
id | category   | staff_email           | staff_name | active
1  | general    | flgnynjai@gmail.com   | Test Staff | 1
2  | records    | flgnynjai@gmail.com   | Test Staff | 1
3  | adoption   | flgnynjai@gmail.com   | Test Staff | 1
4  | complaint  | flgnynjai@gmail.com   | Test Staff | 1
5  | media      | flgnynjai@gmail.com   | Test Staff | 1
6  | legal      | flgnynjai@gmail.com   | Test Staff | 1
```

All 6 rows exist with the original seeded value. Never updated.

### Read-Path Trace

**3 runtime read sites** in server.ts, all calling `getRGEmailRoutingForCategory(category)`:

| Line | Feature | Context | Live? |
|------|---------|---------|-------|
| 11035 | `POST /api/rg/requests` | New RG request → sends email to routed staff | **YES** — route is wired and registered |
| 11116 | `POST /api/rg/requests/:id/messages` | RG follow-up message → sends email | **YES** — route is wired |
| 11958 | `checkDeadlineReminders()` | Hourly scheduled job (`setInterval`, line 12001) → sends deadline reminder emails | **YES** — runs every hour in the main event loop |

**All three read sites are LIVE.** The API routes are registered and functional. The deadline reminder is a running scheduled job. The RG dashboard tab is hidden (`style="display: none"` on the tab button), but the **API endpoints and scheduled job are fully active** — any request submitted via the RG portal (`/rg-portal`) or API would trigger email sends to the routed address.

**RG portal status:** The `/rg-portal` route (line 10822) is live. 4 RG requests exist in the DB (2 resolved, 1 in_progress, 1 open). The feature was used.

### Cutover Bearing

**LIVE — needs UPDATE at cutover.**

Table: `rg_email_routing`
Column to change: `staff_email`
Scope: all 6 rows (or selectively per category if different staff handle different categories)
Production recipient: not determinable from code/config — John must specify who should receive RG request notifications per category.

---

## Seed 2: Intake Alert Recipient (localDatabase.ts:3705)

### Table + Seed Statement

**Table:** `intake_alert_recipients`

```typescript
// localDatabase.ts:3698-3708
const existing = database.prepare(`SELECT COUNT(*) as count FROM intake_alert_recipients`).get() as { count: number };
if (existing.count > 0) {
  console.log('[Intake] Alert recipients already configured');
  return;
}
addIntakeAlertRecipient('flgnynjai@gmail.com', 'Test Staff');
```

Seeds 1 row (guarded — only if table is empty).

### Live DB State

```
id | email                      | name               | active
1  | flgnynjai@gmail.com        | Test Staff          | 1
3  | sheltersupervisor@4lg.org  | Shelter Supervisor  | 1
4  | info@4lg.org               | Info Distribution   | 1
```

The original seed row (id=1) still exists AND is active. Two production recipients were added later (ids 3, 4). **All three are active** — intake alerts currently go to all three addresses.

### Read-Path Trace

**4 runtime read sites** in server.ts, all calling `getIntakeAlertRecipients()` (which returns `WHERE active = 1`):

| Line | Feature | Context | Live? |
|------|---------|---------|-------|
| 11611 | `POST /api/intake` | New overnight intake form submission → schedules 90s deferred email alert | **YES** — route is wired |
| 11924 | `POST /api/intake/:id/voice` | Voice recording added to intake → sends immediate email (cancels deferred timer) | **YES** — route is wired |
| 12009 | Startup sweep (IIFE) | On server start, sends emails for any intakes from last 24h that never got emailed | **YES** — runs on every restart |
| 11788 | `GET /api/intake-recipients` | Dashboard admin: list recipients | **YES** — management UI |

Additionally, recipient management endpoints (POST/DELETE `/api/intake-recipients`) are wired for dashboard admin use.

**All read sites are LIVE.** The intake form (`POST /api/intake`) is a registered, functional route. 13 overnight intakes exist in the DB (most recent: 2026-05-13). The startup sweep runs on every server restart. This is an active email-sending feature.

### What triggers intake alerts

A new animal intake is submitted via `POST /api/intake` (overnight intake form — likely used by shelter staff/officers). On submission:
1. A 90-second deferred timer starts
2. If a voice recording is added within 90s, the timer is cancelled and an immediate email is sent with the transcript
3. If no voice arrives, the 90s timer fires and sends the email
4. On server restart, a sweep catches any intakes that never got emailed

All emails go to every active recipient in `intake_alert_recipients`.

### Cutover Bearing

**LIVE — needs UPDATE at cutover.**

The test address (id=1, `flgnynjai@gmail.com`) is receiving real intake alert emails alongside the two production addresses. This is a data cleanup — the test row should either be removed or deactivated.

Table: `intake_alert_recipients`
Options:
- **DELETE** row id=1 (the test seed) — the two production rows (sheltersupervisor@4lg.org, info@4lg.org) are already in place
- Or **UPDATE** `active = 0` for id=1 to soft-disable
- Column for recipient change if needed: `email`

No new production recipient needs to be added — the production recipients are already configured (ids 3, 4).

---

## Summary

| Seed | Table | Live Row? | Live Runtime Reader? | Cutover Action |
|------|-------|-----------|---------------------|----------------|
| RG routing (3477) | `rg_email_routing` | Yes, 6 rows, all `flgnynjai@gmail.com` | **YES** — 3 sites: new request email, follow-up email, hourly deadline reminder job | **UPDATE `staff_email`** for all 6 rows (production recipient TBD by John) |
| Intake alert (3705) | `intake_alert_recipients` | Yes, id=1 `flgnynjai@gmail.com` | **YES** — 4 sites: intake form email, voice path email, startup sweep, dashboard admin | **DELETE or deactivate id=1** (production recipients already in place at ids 3, 4) |
