# Featured Six Rotation Email — Scoping Diagnosis

Read-only. Queried 2026-06-26 03:10 UTC.

---

## 1. LISTING-AGE FIELD

### Available date fields from SM API (via `json_shelter_animals`):

| SM Field | Normalized As | Description | Populated |
|----------|--------------|-------------|-----------|
| `DATEBROUGHTIN` | `dateIntake` | Date animal was brought into shelter system | 188/188 (100%) |
| `MOSTRECENTENTRYDATE` | *(not normalized)* | Most recent entry/re-entry date | 188/188 (100%) |
| `DATEAVAILABLEFORADOPTION` | *(not normalized)* | Date animal became available for adoption | 188/188 (100%) |
| `ACTIVEMOVEMENTDATE` | *(not normalized)* | Date of current active movement (e.g. foster placement) | 65/188 (only foster animals) |
| `CREATEDDATE` | *(not normalized)* | Record creation timestamp | 188/188 |
| `LASTCHANGEDDATE` | *(not normalized)* | Last record modification timestamp | 188/188 |
| `DATEOFBIRTH` | `dateOfBirth` | Birth date | 188/188 |

### Best field for "days listed as adoptable": **`DATEAVAILABLEFORADOPTION`**

This is the exact date SM marks the animal as available for adoption. It's 100% populated for all adoptable animals (both shelter and foster). `DATEBROUGHTIN` is the intake date (when the animal entered the system), which may predate availability (e.g. hold period, medical). `MOSTRECENTENTRYDATE` tracks re-entries (returns from foster/trial), so it can reset for long-stay animals.

`DATEAVAILABLEFORADOPTION` is NOT currently normalized into the `Animal` interface — `shelterManagerService.ts` only extracts `dateIntake` (DATEBROUGHTIN) and `dateOfBirth` (DATEOFBIRTH). A new feature would need to either:
- Add it to `normalizeAnimal` in shelterManagerService.ts, or
- Access it from the raw API response directly (as the foster roster diagnosis did)

---

## 2. SPECIES CLASSIFICATION

**Field:** `SPECIESNAME` from SM API → normalized to `animal.species` via `raw.SPECIESNAME || 'Unknown'` (shelterManagerService.ts:55).

**Distinct values in current adoptable set (188 animals):**

| SM SPECIESNAME | Count | App classification |
|---------------|-------|--------------------|
| Cat | 128 | cat |
| Dog | 38 | dog |
| Rabbit | 17 | small-animal |
| Guinea Pig | 3 | small-animal |
| Chinchilla | 1 | small-animal |
| Ferret | 1 | small-animal |

The app maps species to three buckets in various places:
- **Searcher/matcher** (server.ts:4504): `{ cat: ['Cat'], dog: ['Dog'], small_animal: ['Rabbit', 'Guinea Pig', 'Chinchilla', 'Ferret'] }`
- **Custom search validation** (server.ts:1479): accepts `'dog'`, `'cat'`, `'small'`
- The raw `SPECIESNAME` is always the SM value (Cat/Dog/Rabbit/etc.); the three-bucket mapping is done at the consumer level

---

## 3. ADOPTABLE PREDICATE

**Exact predicate:** `raw.ADOPTABLE === 1` (shelterManagerService.ts:49)

This returns the animal as `isAvailable: true`. The default `fetchAnimals()` call filters to `isAvailable` only.

**Foster animals ARE included:** Yes. ADOPTABLE===1 is true for animals in foster (ACTIVEMOVEMENTTYPE===2). Current count: 65 foster animals are ADOPTABLE===1 out of 188 total adoptable. The foster roster diagnosis confirmed 70 animals are both adoptable AND in foster (the 5 additional are ACTIVEMOVEMENTTYPE===null with "4LG Foster House" location).

**How to get the full adoptable set including foster:**
- `fetchAnimals()` (default) — returns all ADOPTABLE===1 animals, foster included
- `fetchAnimals({ includeUnavailable: true })` — returns ALL animals regardless of ADOPTABLE flag
- For rotation, use the default `fetchAnimals()` — it already includes foster animals

---

## 4. FOSTER-FORM GATE

### Existing signal: **YES — `behavior_notes.source = 'form'`**

The `behavior_notes` table has a `source` field (types.ts:107-108):
- `'app'` = voice profiler (in-person staff profiling)
- `'form'` = foster profile form (emailed to foster families)

**Current state:**
- Distinct sources in DB: `app`, `form`
- Foster form notes count: **1** (only 1 foster profile form has been submitted so far)
- The foster profile form is served at `/profile-form` (server.ts:10828-10830) and stored as a behavior_note with `source='form'`

**Gate implementation:** To check "has this foster animal had its profiler form completed," query:
```sql
SELECT COUNT(*) FROM behavior_notes WHERE shelter_code = ? AND source = 'form'
```
Or use the existing `getBehaviorNotesCount(animalId)` (localDatabase.ts:1331) — but this counts ALL notes (both app and form). A source-filtered variant would be needed for a form-only gate.

**Caveat:** Only 1 form has been submitted, so this gate would currently exclude nearly all foster animals. The gate may need to be optional or deferred until form adoption is wider.

---

## 5. PERSISTENCE — featured_slots TABLE

### Schema (exists):
```sql
CREATE TABLE featured_slots (
  slot_index INTEGER PRIMARY KEY,    -- 1-6
  shelter_code TEXT,                  -- e.g. 'R2024018'
  media_id TEXT,                     -- UUID of video/photo media
  media_type TEXT,                   -- 'video' or 'photo'
  updated_at TEXT NOT NULL           -- ISO timestamp
);
```

### Current data (6 rows):
| Slot | shelter_code | media_type | updated_at |
|------|-------------|------------|------------|
| 1 | R2024018 | video | 2026-04-22 |
| 2 | A2024185 | video | 2026-06-01 |
| 3 | S2026133 | video | 2026-05-09 |
| 4 | S2025966 | video | 2026-06-25 |
| 5 | S2026047 | video | 2026-05-05 |
| 6 | S20241099 | video | 2026-06-25 |

### How it's populated:
**Manual curation via dashboard.** `PUT /api/featured-slots/:index` (server.ts:2897) accepts a `media_id`, resolves the animal, and updates the slot. Staff select videos in the dashboard and assign them to slots 1-6. There is no automated rotation — slots are entirely staff-controlled.

### Could it hold a rotation queue?
**No — wrong shape.** `featured_slots` has exactly 6 rows (slots 1-6) with no species column, no queue ordering, and no history. It tracks "what's currently on the homepage" but not "what's next in line." A NEW table (e.g. `featured_rotation_queue`) would be cleaner for an ordered per-species queue with position, species, shelter_code, and added_at columns.

---

## 6. HOMEPAGE FEATURED SOURCE

### Mechanism: **Manual curation in WordPress + one-way sync for stories**

Two separate "featured" concepts exist:

**A. Featured Animals (the "Featured Six" homepage slots):**
- Staff manually assign videos to slots 1-6 via the dashboard (`PUT /api/featured-slots/:index`)
- The WordPress homepage reads these via `GET /api/featured-slots` (proxied via bare IP at http://66.228.37.38)
- WordPress renders them as the homepage carousel/grid
- **This is what the rotation email would recommend changes to — staff would then update slots via the dashboard**

**B. Featured Stories (separate concept):**
- `syncFeaturedStatusFromWordPress()` (server.ts:600-654) runs on app startup and syncs the `featured_on_homepage` flag from WordPress stories metadata to local `dashboard_stories` table
- This is WordPress → local (one-way), for stories only, unrelated to the animal slots

The rotation email will show "current six / recommended next six / queue preview" — staff would then manually update `featured_slots` via the dashboard.

---

## 7. SCHEDULER

### Existing scheduled jobs (all in-app, no system crontab for shelter):

| Job | Schedule | Mechanism | Location |
|-----|----------|-----------|----------|
| SM Photo Sync | 2am ET daily | `setTimeout` + `setInterval(24h)` | server.ts:12521 `scheduleNightlySMPhotoSync()` |
| Activity auto-close | 11:55pm ET daily | `setTimeout` + `setInterval(24h)` | server.ts:12281 `scheduleActivityAutoClose()` |
| Midnight feeding job | midnight ET | `setTimeout` + `setInterval(24h)` | server.ts:12548 `scheduleMidnightFeedingJob()` |
| Adoptable status check | 9am ET daily | `setTimeout` + `setInterval(24h)` | server.ts:12677 `scheduleDailyAdoptableCheck()` |
| Generic bio job | 9:30am ET daily | `setTimeout` + `setInterval(24h)` | server.ts:13001 `scheduleGenericBioJob()` |
| Searcher snapshot | daily | `setTimeout` + `setInterval(24h)` | server.ts:13031 `scheduleDailySearcherSnapshot()` |
| Deadline reminders | hourly | `setInterval(1h)` | server.ts:11998 |
| Cache refresh | periodic | `setInterval` | server.ts:6635 |

**Additional (rover crontab, not in-app):**
- `*/15 * * * *` — memory snapshot
- `0 4 * * *` — screenshots retention
- `0 6 * * *` — profile scoring (runs as shelter)

**No system crontab exists for the shelter user.** All shelter-app scheduled jobs use the in-app `setTimeout` + `setInterval` pattern with ET offset calculation.

### Adding a Wednesday afternoon job:
Follow the existing pattern: write a `scheduleWeeklyFeaturedEmail()` function using the same `setTimeout` → `setInterval(7 * 24h)` pattern, targeting Wednesday ~2pm ET (18:00 UTC). Call it from server startup alongside the other schedulers. No external crontab needed.

---

## 8. EMAIL SENDING

### Service: **Resend** (`emailService.ts`)

| Config | Value/Variable |
|--------|---------------|
| Library | `resend` npm package (import at emailService.ts:2) |
| API key | `secrets.resend.apiKey` (shelter-secrets.json) |
| From address | `FROM_EMAIL = 'No-Reply@4lg.org'` (emailService.ts:29) |
| Default to | `TO_EMAIL = 'flgnynjai@gmail.com'` (emailService.ts:30, comment: "Will change to adopt@4lg.org later") |
| Sandbox mode | `SANDBOX_MODE = (FROM_EMAIL === 'onboarding@resend.dev')` — currently **FALSE** (FROM_EMAIL is No-Reply@4lg.org) |
| Sandbox allowed | `SANDBOX_ALLOWED_EMAIL = 'flgnynjai@gmail.com'` (emailService.ts:35) |

### Existing email functions (all in emailService.ts):
`sendApplicationEmail`, `sendApplicantConfirmationEmail`, `sendRGNewRequestEmail`, `sendRGDeadlineReminderEmail`, `sendRGStaffResponseEmail`, `sendRGResolvedEmail`, `sendRGFollowUpEmail`, `sendIntakeAlertEmail`, `sendIntakeOfficerReceiptEmail`, `sendVolunteerReviewerEmail`, `sendVolunteerApplicantConfirmationEmail`, `sendContactFormEmail`, `sendAdoptableAlertEmail`

### Can it send to flgnynjai@gmail.com?
**YES — no flag or allowlist change needed.** SANDBOX_MODE is false (FROM_EMAIL is the production No-Reply@4lg.org domain). When sandbox is off, Resend can send to any verified domain/recipient. `flgnynjai@gmail.com` is already the adoptable alert recipient (server.ts:771) and receives email successfully today.

### Adding a new email:
Add a `sendFeaturedRotationEmail(html, recipient)` function to emailService.ts following the existing pattern: call `getResend().emails.send({ from: FROM_EMAIL, to: recipient, subject: ..., html: ... })`. Export it, import in server.ts, call from the weekly scheduler.

---

## 9. TIMEZONE

| | Value |
|---|---|
| Server system timezone | `Etc/UTC (UTC, +0000)` |
| In-app scheduled jobs | All compute ET offset manually (e.g. `new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })`) |
| "Wednesday afternoon" | Target ~2pm ET = 18:00 UTC (EDT, summer) or 19:00 UTC (EST, winter) |

The existing pattern handles DST transitions by computing the ET offset at each scheduling check rather than hardcoding a UTC hour.
