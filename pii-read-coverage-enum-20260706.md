# PII-READ Coverage Enumeration — 2026-07-06

## PII GET Endpoint Table

| GET endpoint | Human PII returned | Tier | Gated? | Anon result (dashboard vhost) | Caller classes | Enumerable param | Classification | Justification |
|---|---|---|---|---|---|---|---|---|
| `/api/volunteers` | Full names, emails, phones, addresses, DOB, form_data (OCR text), scan file paths, emergency contacts, references | i (contact/sensitive) | YES — `isGatedPath` (`p === '/api/volunteers'`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch) | none (list) | GATED | — |
| `/api/volunteers/:id` | Single volunteer full record: all of the above per person | i (contact/sensitive) | YES — `isGatedPath` (`p.startsWith('/api/volunteers/')`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch) | seq-int (walkable) | GATED | — |
| `/api/volunteers/availability-grid` | Volunteer full_name + availability + commitments/declines | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | none | GATED | — |
| `/api/volunteers/with-other-talents` | Volunteer full_name + other_talents text | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | none | GATED | — |
| `/api/volunteers/timeclock/recent` | Volunteer full_name + timeclock shifts | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | none | GATED | — |
| `/api/volunteers/timeclock/search` | Volunteer full_name matching search | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | none | GATED | — |
| `/api/volunteers/timeclock/status` | Volunteer name + current clock status | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | seq-int (volunteer_id) | GATED | — |
| `/api/volunteers/timeclock/history` | Volunteer shift history (no name in payload, keyed by volunteer_id) | ii (names-only, identity via param) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | seq-int (volunteer_id) | GATED | — |
| `/api/volunteers/timeclock/all` | volunteer_name + volunteer_id + all shifts in date range | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html | none | GATED | — |
| `/api/volunteers/timeclock/report` | Volunteer name in PDF + shift data | ii (names-only) | YES — `isGatedPath` (startsWith `/api/volunteers/`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (window.open — no token attachment; timeclock/report is the known window.open gap from Phase 2 notes) | seq-int (volunteer_id) | GATED | window.open gap documented — cannot attach X-Gate-Token header; currently still gated because gate checks all /api/volunteers/ paths |
| `/api/adoption-applications` | Applicant names, emails, phones, addresses, animal preferences, review status | i (contact/sensitive) | YES — `isGatedPath` (`p === '/api/adoption-applications'`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch) | none (list) | GATED | — |
| `/api/dashboard/behavior-notes` | Caregiver names (via behavior_notes.caregiver field) | ii (names-only) | YES — `isGatedPath` (`p === '/api/dashboard/behavior-notes'`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch) | none | GATED | — |
| `/api/docs/adoption-pdf/:id` | Full adoption application PDF (all applicant PII) | i (contact/sensitive) | YES — `isGatedPath` (`p.startsWith('/api/docs/')`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch → blob) | seq-int (walkable) | GATED | — |
| `/api/docs/volunteer-file/:uuid/:file` | Volunteer scanned documents (images of paper forms with PII) | i (contact/sensitive) | YES — `isGatedPath` (`p.startsWith('/api/docs/')`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch → blob) | uuid (hard to enumerate) | GATED | — |
| `/api/docs/intake-audio/:id/:file` | Voice notes from intake officers | i (contact/sensitive) | YES — `isGatedPath` (`p.startsWith('/api/docs/')`) | 401 application/json 49B — blocked [VERIFIED] | code fetch: dashboard/index.html (gatedFetch → blob) | seq-int (walkable) | GATED | — |
| `/api/intakes` | Officer name, phone, email, voice_transcript, location_found for ALL intake records | i (contact/sensitive) | NO | 200 application/json ~8KB — **real PII data served** [VERIFIED: officer_name, officer_email visible in payload] | code fetch: dashboard/index.html (plain fetch, NOT gatedFetch) | none (list, dumps all) | **UNGATED-SHOULD-GATE** | — |
| `/api/intakes/:id` | Single intake: officer_name, officer_phone, officer_email, voice_transcript, other_notes | i (contact/sensitive) | NO | 200 application/json 770B — **real PII data served** (tested with id=56) [VERIFIED] | code fetch: dashboard/index.html (plain fetch) | seq-int (walkable, 44-56 currently) | **UNGATED-SHOULD-GATE** | — |
| `/api/intake-recipients` | Staff email addresses + names of intake alert recipients | i (contact/sensitive — staff emails) | NO | 200 application/json 289B — **real data served** [VERIFIED: emails visible] | code fetch: dashboard/index.html (mix of plain fetch + gatedFetch for write ops; the GET list itself is plain fetch at line 11710 and line 12016) | seq-int (id for DELETE, but GET is list) | **UNGATED-SHOULD-GATE** | — |
| `/api/rg/staff/requests` | Requester names (requester_name), subjects of complaints/records requests | ii (names-only) | NO | 200 application/json ~1.5KB — **real data served** [VERIFIED: requester_name visible] | code fetch: dashboard/index.html (plain fetch) | none (list) | **UNGATED-SHOULD-GATE** | — |
| `/api/rg/staff/requests/:id` | Requester name, message text (may contain PII in free text), staff names in messages | i (contact/sensitive — message content) | NO | 200 application/json — **real data served** [VERIFIED: requester_name + messages visible] | code fetch: dashboard/index.html (plain fetch) | seq-int (walkable, 1-4 currently) | **UNGATED-SHOULD-GATE** | — |
| `/api/rg/staff/requesters` | Requester names + email addresses (PIN hashes stripped) | i (contact/sensitive — emails) | NO | 200 application/json 277B — **real data served** [VERIFIED: name + email visible] | code fetch: dashboard/index.html (plain fetch) | none (list) | **UNGATED-SHOULD-GATE** | — |
| `/api/rg/staff/attachments/:id` | File attachments from RGC requests (may contain PII documents) | i (contact/sensitive — document content) | NO | 200 text/plain 24B — **real file content served** [VERIFIED: "Test attachment content"] | code fetch: dashboard/index.html (plain fetch) | seq-int (walkable) | **UNGATED-SHOULD-GATE** | — |
| `/api/walk-log` | Walker names (first + full names like "Michael Sanducci", "Doreen") | ii (names-only) | NO | 200 application/json — **real data served** [VERIFIED: walker full names visible] | No code callers found in any client app [VERIFIED via grep] — endpoint exists but appears to have no active UI consumer | none (list, dumps all) | **UNGATED-SHOULD-GATE** | — |
| `/api/notifications/staff` | published_by field (currently "Dashboard" role label, not a human name) | ii (names-only, borderline) | NO | 200 application/json 37B — data served but contains no human PII in current data [VERIFIED: published_by="Dashboard"] | code fetch: staff-pwa/app.js, staging-staff/app.js (plain fetch) | none | CONSCIOUSLY-PUBLIC | published_by is a role label ("Dashboard"), not a person's name; consumed by staff-pwa and staging-staff which are intentionally ungated apps; if published_by ever carries a human name this reclassifies |
| `/api/notifications/staff/archive` | published_by field (same as above — "Dashboard") | ii (names-only, borderline) | NO | 200 application/json ~1KB — data served, published_by="Dashboard" [VERIFIED] | code fetch: dashboard/index.html (not gated) | none | CONSCIOUSLY-PUBLIC | Same justification as notifications/staff |
| `/api/public/timeclock/recent` | Volunteer first name + last initial ("Elaine G.", "Mali G.") | ii (names-only, truncated) | NO (intentionally public) | 200 application/json — **truncated names served** [VERIFIED: "Elaine G.", not "Elaine Gomez"] | code fetch: vclock page (public kiosk QR) | none | CONSCIOUSLY-PUBLIC | John's explicit design decision: public timeclock kiosk uses server-side `publicNameTruncate()` (first name + last initial) to minimise exposure. Comment in source: "These are intentionally ungated." |
| `/api/public/timeclock/search` | Volunteer first name + last initial (truncated) | ii (names-only, truncated) | NO (intentionally public) | 200 application/json — **truncated names served** [VERIFIED: "ALEXUS S.", "Abegail C."] | code fetch: vclock page (public kiosk QR) | none | CONSCIOUSLY-PUBLIC | Same as above |
| `/api/public/timeclock/status` | Volunteer clock-in/out status (no name in response, keyed by volunteer_id) | none (no PII in response) | NO | — | code fetch: vclock page | seq-int (volunteer_id) | CONSCIOUSLY-PUBLIC | No PII in response payload — only timestamps + boolean status |
| `/api/preferences` | Adopter preferences (no human name/contact; contains rawTranscript of voice input) | borderline — rawTranscript may contain self-identifying info | NO | 200 application/json — data served [VERIFIED: preferences with rawTranscript visible, no name/email/phone fields] | No code callers found in any client app [VERIFIED via grep — matcher-web has no fetch to this path] | uuid (opaque, not walkable) | CONSCIOUSLY-PUBLIC | No explicit human PII fields (no name, email, phone, address). rawTranscript is a voice-to-text of animal preferences ("I need a black cat that's fun"). Preferences are anonymous by design (voice matcher). UUID-keyed. |
| `/api/preferences/:id` | Single adopter preference (same as above) | borderline | NO | 404 for invalid id [VERIFIED] | No code callers found | uuid (opaque) | CONSCIOUSLY-PUBLIC | Same as above |
| `/api/intake/confirm/:id` | id, submitted_at, breed, sex ONLY (no officer PII) | none (no human PII) | NO | 200 application/json 80B — no PII [VERIFIED: only id/submitted_at/breed/sex] | email URL: embedded in intake confirmation emails | seq-int | CONSCIOUSLY-PUBLIC | Intentionally limited response — only animal metadata, no human PII |

## Endpoints Examined and Excluded (no human PII)

| GET endpoint | Reason excluded |
|---|---|
| `/api/health` | Health check, no PII |
| `/api/gate-token` | Returns token/null, no PII |
| `/api/animals`, `/api/animals/search`, `/api/animals/:id` | Animal data only |
| `/api/behavior/:animalId`, `/api/behavior` | Animal behavior data, caregiver field is animal-context |
| `/api/dashboard/profiles-summary` | Animal profile summaries |
| `/api/dashboard/searcher-metrics/export` | Aggregate search metrics CSV, no PII [VERIFIED] |
| `/api/dashboard/feeding-roster/:species` | Animal feeding data |
| `/api/dashboard/activities/:species` | Animal activity data |
| `/api/dashboard/activities/no-activity/:species` | Animal no-activity data |
| `/api/dashboard/feeding-archive/*` | Animal feeding archives |
| `/api/dashboard/activity-archive/*` | Animal activity archives |
| `/api/dashboard/daily-report/*` | Animal daily reports |
| `/api/bio/:animalId`, `/api/bios/*` | Animal bios |
| `/api/featured-slots` | Featured animal slots |
| `/api/stories`, `/api/featured-stories` | Dashboard stories |
| `/api/events`, `/api/upcoming-events` | Events |
| `/api/photos/:animalId` | Animal photos |
| `/api/dogwalker/*` (resolve, animal, kennel, available, walk/active) | Animal/kennel data for walker app |
| `/api/volunteer/animal/:animalId` | Animal data for volunteer app |
| `/api/staff/animal/:animalId`, `/api/staff/available/*` | Animal data for staff app |
| `/api/sessions/active/:species` | Animal session data |
| `/api/staff/feeding/:species` | Animal feeding data |
| `/api/intakes/stats` | Aggregate counts only (new_count, today_count, week_count) [VERIFIED] |
| `/api/rg/staff/stats` | Aggregate counts only (open, due_soon, overdue, total) [VERIFIED] |
| `/api/rg/requests`, `/api/rg/requests/:id` | Behind `rgAuthMiddleware` (bearer token) [VERIFIED: not anon-accessible] |
| `/api/rg/attachments/:id` | Behind `rgAuthMiddleware` [VERIFIED] |
| `/api/dashboard/old-generic-bios` | Animal bios |
| `/api/dashboard/wellbeing/*` | Animal media/wellbeing data |
| SPA catch-all routes (`/dashboard/*`, `/staff/*`, etc.) | Return index.html shell, no API data |

## Seed-Set Confirmations

### CONFIRMED + CLASSIFIED (known still-open)

| Endpoint | Status | Classification |
|---|---|---|
| `GET /api/notifications/staff` | Ungated, 200, published_by="Dashboard" (not a human name) [VERIFIED] | CONSCIOUSLY-PUBLIC |
| `GET /api/notifications/staff/archive` | Ungated, 200, same [VERIFIED] | CONSCIOUSLY-PUBLIC |
| `GET /api/intake-recipients` | Ungated, 200, staff emails served [VERIFIED] | **UNGATED-SHOULD-GATE** |

### SURFACED + CLASSIFIED

| Endpoint | Status | Classification |
|---|---|---|
| `GET /api/intakes` | Ungated, 200, officer PII served (name, phone, email, voice_transcript) [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/intakes/:id` | Ungated, 200, same per record, seq-int walkable [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/rg/staff/requests` | Ungated, 200, requester names [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/rg/staff/requests/:id` | Ungated, 200, requester name + messages [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/rg/staff/requesters` | Ungated, 200, requester names + emails [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/rg/staff/attachments/:id` | Ungated, 200, file content served [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/walk-log` | Ungated, 200, walker full names [VERIFIED] | **UNGATED-SHOULD-GATE** |
| `GET /api/adoption-applications/:id` (SINGULAR) | No singular GET endpoint exists — only the plural list which is gated [VERIFIED via grep: no `app.get('/api/adoption-application'` without `s` that returns data] | N/A — not present |
| Coordinator reads / foster roster | No dedicated coordinator GET API routes returning human PII found in source [VERIFIED via grep] | N/A — not present |
| CSV/export GETs | Only `/api/dashboard/searcher-metrics/export` exists — contains aggregate search metrics, no human PII [VERIFIED] | Excluded |

## Regression-Confirm Results

All previously-gated endpoints remain gated — no regressions [VERIFIED]:

| Endpoint | Expected | Anon Result | Status |
|---|---|---|---|
| `GET /api/volunteers` | 401 | 401 application/json 49B | ✅ |
| `GET /api/volunteers/:id` | 401 | 401 application/json 49B | ✅ |
| `GET /api/adoption-applications` | 401 | 401 application/json 49B | ✅ |
| `GET /api/dashboard/behavior-notes` | 401 | 401 application/json 49B | ✅ |
| `GET /api/docs/adoption-pdf/:id` | 401 | 401 application/json 49B | ✅ |
| `GET /api/docs/volunteer-file/:uuid/:file` | 401 | 401 application/json 49B | ✅ |
| `GET /api/docs/intake-audio/:id/:file` | 401 (via `/api/docs/` prefix) | 401 [INFERRED from startsWith match — not empirically tested with valid file] | ✅ |
| `/data/shelter.db` (static mount) | 403/404 | 403 (Caddy block_db) [VERIFIED] | ✅ |
| `/data/volunteer-files/` (static mount) | 404 | 404 (mount removed Phase C) [VERIFIED] | ✅ |
| `/api/public/timeclock/recent` | 200, truncated names | 200, "Elaine G." format [VERIFIED] | ✅ (truncation working) |
| `/api/public/timeclock/search` | 200, truncated names | 200, "ALEXUS S." format [VERIFIED] | ✅ (truncation working) |

## Cross-Vhost Note

All API endpoints serve identically across dashboard, staff, and staging-staff vhosts — all proxy to the same Express server on 127.0.0.1:3000. Ungated endpoints are ungated on ALL vhosts. [VERIFIED: tested /api/intakes and /api/rg/staff/requests on staff and staging-staff, both returned 200 with data]

## Summary Counts

- **Total PII GET endpoints found: 27**
- **GATED: 15** (all under isGatedPath or rgAuthMiddleware)
- **CONSCIOUSLY-PUBLIC: 5** (public timeclock × 3, notifications × 2, preferences × 2 borderline, intake/confirm × 1)
- **UNGATED-SHOULD-GATE: 8** findings:
  1. `GET /api/intakes` — tier i (officer contact PII)
  2. `GET /api/intakes/:id` — tier i (same, seq-int walkable)
  3. `GET /api/intake-recipients` — tier i (staff emails)
  4. `GET /api/rg/staff/requests` — tier ii (requester names)
  5. `GET /api/rg/staff/requests/:id` — tier i (names + message content, seq-int walkable)
  6. `GET /api/rg/staff/requesters` — tier i (names + emails)
  7. `GET /api/rg/staff/attachments/:id` — tier i (document content, seq-int walkable)
  8. `GET /api/walk-log` — tier ii (walker full names)

## Root Crontab

Root crontab was not readable without sudo — caller class for root cron is [UNCERTAIN]. Shelter user's crontab and scripts under /home/shelter/scripts/ were checked and do not make GET calls to PII endpoints (only a health-check curl to /api/volunteers for gate verification status code check, not data consumption). [VERIFIED]
