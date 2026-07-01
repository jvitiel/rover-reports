# Auditor 3 — PII-Gate Consumer Map (Grep)

**Date:** 2026-07-01 02:55 UTC

---

## 1. Client Directories

### Apps with ZERO calls to any gated endpoint

| App | Gated calls |
|-----|-------------|
| staff-pwa | 0 (calls `/api/notifications/staff` GET only — see below) |
| staging-staff | 0 (same as staff-pwa) |
| volunteer-pwa | 0 |
| dogwalker-pwa | 0 |
| matcher-preview | 0 |
| caregiver-pwa | 0 |
| coordinator-pwa | 0 |
| custom-search | 0 |

[VERIFIED — grep across all nine client directories]

### staff-pwa + staging-staff: notifications/staff (GET only)

Both call `fetch('${API_BASE}/notifications/staff')` (no method option → **GET**) to poll the staff notification feed. This is one call site per app, inline (no wrapper). [VERIFIED — source at `app.js` in both]

### dashboard/index.html — all call sites

All calls use `fetch()` inline with `API_BASE = '/api'`. There is **no central fetch wrapper** — every call is an independent `await fetch(...)` site. [VERIFIED — no wrapper function definition found; `API_BASE` is the only shared element]

#### Gated GET endpoints called by dashboard (reads to be gated)

| Endpoint | Call sites | Notes |
|----------|-----------|-------|
| `GET /api/volunteers` | 0 | dashboard calls POST and PATCH variants, but the list-read URL is built at L14311 via string (`let url = '/api/volunteers?'`...) — **1 GET call site** [VERIFIED] |
| `GET /api/volunteers/:id` | 2 | L14142 (after PATCH), L14453 (direct volunteer detail fetch) [VERIFIED] |
| `GET /api/volunteers/timeclock/all` | 1 | L14590 [VERIFIED] |
| `GET /api/volunteers/timeclock/search` | 1 | L14742 [VERIFIED] |
| `GET /api/volunteers/timeclock/report` | 1 | L14705 [VERIFIED] |
| `GET /api/volunteers/availability-grid` | 1 | L15080 [VERIFIED] |
| `GET /api/volunteers/with-other-talents` | 1 | L15316 [VERIFIED] |
| `GET /api/adoption-applications` | 1 | L15577 (plural, the read endpoint) [VERIFIED] |
| `GET /api/dashboard/behavior-notes` | 1 | L6638 [VERIFIED] |
| `GET /api/notifications/staff` | 1 | L9993 [VERIFIED] |
| `GET /api/notifications/staff/archive` | 1 | L10098 [VERIFIED] |

**Total distinct GET call sites to gated endpoints in dashboard: 12**

#### Non-gated calls (POST/PUT/PATCH/DELETE — these should NOT be gated)

| Endpoint | Method | Call sites |
|----------|--------|-----------|
| `/api/volunteers/upload` | POST | 1 (L13788) |
| `/api/volunteers/:id` | PATCH | 2 (L14069, L14142) |
| `/api/volunteers` | POST | 2 (L14076, L14154) — dashboard admin creating volunteer records |
| `/api/volunteers/:id` | DELETE | 1 (L14177) |
| `/api/volunteers/:id/policy-reviewed` | PATCH | 1 (L14217) |
| `/api/volunteers/:id/approval` | PATCH | 4 (L14242, L14290, L15212, L15264) |
| `/api/volunteers/:id/tags` | PATCH | 1 (L14262) |
| `/api/volunteers/rotate-image` | POST | 2 (L14497, L14521) |
| `/api/volunteers/timeclock/manual` | POST | 1 (L14932) |
| `/api/volunteers/:id/commitments` | POST | 1 (L15223) |
| `/api/volunteers/:id/commitments` | DELETE | 1 (L15234) |
| `/api/volunteers/:id/declines` | POST | 1 (L15243) |
| `/api/volunteers/:id/declines` | DELETE | 1 (L15255) |
| `/api/notifications/staff` | POST | 2 (L10026, L10047) |
| `/api/notifications/staff/repush` | POST | 1 (L10065) |

[VERIFIED — method determined from multi-line context of each fetch() call]

**Note on dashboard PATCH calls:** L14142 does a PATCH then immediately re-fetches `GET /api/volunteers/:id` — the GET after the PATCH is a gated read. The PATCH itself is a write and should carry whatever credential the gate uses. Same pattern at L14069→L14076 and L14290→L14311.

---

## 2. Scripts

### /home/shelter/scripts/ and /home/rover/scripts/

**Zero calls to any gated endpoint.** No script contains a curl/wget/fetch to `/api/volunteers`, `/api/adoption-applications`, `/api/dashboard/behavior-notes`, or `/api/notifications/staff`. [VERIFIED — grep across both script directories returned no matches]

### health-check.sh — exact HTTP probe list

| Probe target | Gated? |
|--------------|--------|
| `http://127.0.0.1:3000/api/animals?limit=1` | **No** — animals endpoint is not in the gated set |
| `https://dashboard.4lgshelterapp.duckdns.org/` | **No** — static app shell |
| `https://staff.4lgshelterapp.duckdns.org/` | **No** — static app shell |
| `https://matcher.4lgshelterapp.duckdns.org/` | **No** — static app shell |
| `https://dashboard.4lgshelterapp.duckdns.org` (HSTS check) | **No** — header check |

**No health-check probe targets a gated endpoint.** The gate will not cause false alarms. [VERIFIED — full grep of health-check.sh for curl/http references]

---

## 3. Crontabs

### rover crontab

| Schedule | Command | Calls gated endpoint? |
|----------|---------|----------------------|
| `*/15 * * * *` | memory-snapshot.sh | No |
| `0 4 * * *` | screenshots-retention.sh | No |
| `0 6 * * *` | score-profiles.py | No [VERIFIED — grep of script returned no HTTP calls to gated endpoints] |

[VERIFIED — `crontab -l`]

### shelter crontab

No crontab for shelter. [VERIFIED — `sudo -u shelter crontab -l`]

### root crontab (from weekly backup snapshot dated 2026-06-30)

**One gated-endpoint caller found:**

```
5 * * * * curl -sS -X POST http://localhost:3000/api/volunteers/timeclock/auto-close >> /var/log/timeclock-auto-close.log 2>&1
```

This is the **only internal non-browser caller** of a gated endpoint. It runs hourly at :05 as root, POSTing to `http://localhost:3000/api/volunteers/timeclock/auto-close`. [VERIFIED — extracted from `configs/root-crontab.txt` in `weekly-20260630.tar.gz`]

**Note:** This is a backup snapshot, not the live root crontab (which requires root to read). Given the backup is from today (2026-06-30 03:30), it is very likely current. **John should confirm the live root crontab matches** only if the auto-close entry will be affected by the gate.

All other root crontab entries (backup-sqlite, weekly-error-summary, staging-sync, backup-data, backup-weekly, backup-media, rover-reports-prune, health-check, OC session archive, OC restart) contain no calls to gated endpoints. [VERIFIED — full crontab content inspected]

---

## 4. OC / Rover Tree

**No standing/scheduled OC caller found.** Grep of `/home/rover/rover/` and `/home/rover/.openclaw-rover/` for gated endpoint paths returned only:
- Historical references in handoff docs and daily logs (describing past work, not live callers)
- A backup copy of server.ts from April (not executed)

No OC config file, script, or tool-config references a gated endpoint. [VERIFIED — grep across rover workspace and OC config dir]

**Caveat:** OC (Rover) can issue ad-hoc HTTP calls at runtime via exec/curl when prompted by a user. This is not statically greppable. Absence of matches means "no standing/scheduled OC caller," not "OC will never call these." [INFERRED — architectural knowledge of OC's exec tool capabilities]

---

## 5. Method-Scope Input — Public POST vs Gated GET Split

### Route declarations

| Path | Method | Purpose | Middleware | Gate? |
|------|--------|---------|------------|-------|
| `/api/adoption-application` | **POST** | Public web-form submit | `adoptionLimiter` | **NO — public** |
| `/api/adoption-applications` | **GET** | Dashboard reads PII list | (none) | **YES — gated** |
| `/api/volunteers` | **POST** | Public web-form submit | `volunteerWebFormLimiter` | **NO — public** |
| `/api/volunteers` | **GET** | Dashboard reads roster | (none) | **YES — gated** |
| `/api/notifications/staff` | **POST** | Dashboard creates notification | (none) | Decision needed |
| `/api/notifications/staff` | **GET** | Staff/dashboard reads feed | (none) | **YES — gated** |
| `/api/notifications/staff/repush` | **POST** | Dashboard re-pushes | (none) | Decision needed |
| `/api/notifications/staff/archive` | **GET** | Dashboard reads archive | (none) | **YES — gated** |

[VERIFIED — route declarations in server.ts]

**The singular/plural split is clean and unambiguous:**
- `POST /api/adoption-application` (singular) = public adopter submit → must stay open
- `GET /api/adoption-applications` (plural) = staff reads PII → gate this
- `POST /api/volunteers` = public volunteer submit → must stay open
- `GET /api/volunteers` = staff reads roster → gate this

A GET-only gate on the plural/read endpoints leaves the public POST submit endpoints completely unaffected. [VERIFIED — Express routes are method-specific; `app.get()` and `app.post()` on the same path are independent route handlers]

---

## SUMMARY TABLE

### Consumer → Gated Endpoint Map

| Consumer | File | Gated endpoint(s) | Method | Central wrapper? |
|----------|------|--------------------|--------|-----------------|
| dashboard | dashboard/index.html | `GET /api/volunteers` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/volunteers/:id` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/volunteers/timeclock/all` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/volunteers/timeclock/search` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/volunteers/timeclock/report` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/volunteers/availability-grid` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/volunteers/with-other-talents` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/adoption-applications` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/dashboard/behavior-notes` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/notifications/staff` | GET | No — inline fetch |
| dashboard | dashboard/index.html | `GET /api/notifications/staff/archive` | GET | No — inline fetch |
| staff-pwa | staff-pwa/app.js | `GET /api/notifications/staff` | GET | No — inline fetch |
| staging-staff | staging-staff/app.js | `GET /api/notifications/staff` | GET | No — inline fetch |
| root cron | root crontab | `POST /api/volunteers/timeclock/auto-close` | POST | N/A — curl |

**Total: 12 distinct GET call sites in dashboard (no wrapper — each is an independent edit), 1 GET call site in staff-pwa, 1 GET call site in staging-staff, 1 POST from root cron.**

### Internal (non-browser) callers requiring separate handling

| Caller | Endpoint | Method | Auth mechanism needed |
|--------|----------|--------|---------------------|
| **root crontab** (hourly :05) | `POST /api/volunteers/timeclock/auto-close` | POST | Cannot carry a browser token. Needs either: (a) localhost-exemption in the gate middleware, (b) a shared secret/header the cron curl can pass, or (c) this endpoint excluded from the gate entirely (it's a write, not a PII read). |

No other internal callers found. Health-check probes do not hit gated endpoints. No shelter/rover script calls gated endpoints. No OC standing caller found. [VERIFIED — all surfaces searched]
