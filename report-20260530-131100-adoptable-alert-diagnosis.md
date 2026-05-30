# Adoptable Status Alert — Pre-Implementation Diagnosis

**Date:** 2026-05-30 13:11 ET
**Scope:** Read-only investigation of SM status flow, email infrastructure, and daily timer pattern

---

## A. SM Status Sync and Storage

### A1. Sync function location

The SM data source is `fetchAnimals()` in `server/src/shelterManagerService.ts` (184 lines total).

- **`fetchAnimals()`** — line 94–148: fetches from SM API `json_shelter_animals`, normalizes via `normalizeAnimal()`, caches in-memory with 15-min TTL
- **`normalizeAnimal()`** — line 40–89: maps `raw.ADOPTABLE === 1` → `isAvailable: true`, `status: 'available'`

Key grep output from server.ts:
```
15:  fetchAnimals,
20:} from './shelterManagerService.js';
903:    const animals = await fetchAnimals();
974:    // Always include all animals regardless of adoptable status (for Staff App profiler)
1027:    const animals = await fetchAnimals(true);
1092:// Get all adoptable animals from SM with behavior notes for dashboard
1329:    let adoptableCount = 0;
1336:      if (sm.isAvailable) adoptableCount++;
10954:function scheduleNightlySMPhotoSync(): void {
11011:scheduleNightlySMPhotoSync();
```

### A2. Schema

**animals table:** Does NOT exist in SQLite [VERIFIED]. Animal data lives exclusively in SM and is fetched live via API + 15-min in-memory cache.

**animal_metadata table** [VERIFIED via `.schema`]:
```sql
CREATE TABLE animal_metadata (
  shelter_code TEXT PRIMARY KEY,
  animal_id TEXT,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  date_of_birth TEXT,
  sex TEXT,
  fiv_status TEXT,
  felv_status TEXT,
  updated_at TEXT NOT NULL,
  adoption_pending INTEGER DEFAULT 0,
  bonded_pair INTEGER DEFAULT 0
);
```

`animal_metadata` is a **local overlay** for locally-managed flags (`adoption_pending`, `bonded_pair`). It does NOT store SM's `ADOPTABLE` status. The ADOPTABLE field is read live from SM API on every `fetchAnimals()` call.

### A3. How status is persisted

**It isn't.** [VERIFIED] There is no INSERT/UPDATE/upsert of adoptable status into any local table. The full `shelterManagerService.ts` (184 lines) contains zero database writes. `ADOPTABLE` is:
1. Read from SM API response as `raw.ADOPTABLE` (integer 0 or 1)
2. Mapped to `isAvailable` boolean and `status` string in `normalizeAnimal()`
3. Held in an in-memory cache (`cache` / `allAnimalsCache`) with 15-min TTL
4. Served to all API consumers from cache or fresh fetch

### A4. Prior status tracking

**None exists.** [VERIFIED]

- No prior-status column in any table
- No status history table
- No diff/comparison logic in `shelterManagerService.ts`
- No before/after comparison anywhere in server.ts for the `isAvailable` / `ADOPTABLE` field
- Grep for `history`, `changelog`, `status_change`, `previous_status`, `prior_status`, `last_status`, `was_adoptable`, `became_adoptable` across all server/src/ — zero relevant hits

**Implication for the alert feature:** To detect "newly became adoptable," the implementation will need to either:
1. Snapshot the current adoptable state to a local table and diff on each check, or
2. Compare the current SM API response against a stored prior snapshot

There is no existing mechanism to build on. This is net-new state tracking.

---

## B. Email Send Pattern

### B5. Exported send functions in emailService.ts

```
47:export async function sendApplicationEmail(
180:export async function sendApplicantConfirmationEmail(
292:export async function sendRGNewRequestEmail(
382:export async function sendRGDeadlineReminderEmail(
445:export async function sendRGStaffResponseEmail(
505:export async function sendRGResolvedEmail(
567:export async function sendRGFollowUpEmail(
866:export async function sendIntakeAlertEmail(
954:export async function sendIntakeOfficerReceiptEmail(
1062:export async function sendVolunteerReviewerEmail(
1229:export async function sendVolunteerApplicantConfirmationEmail(
1333:export async function sendContactFormEmail(
1398:export async function sendSubscribeNotificationEmail(email: string, lang: 'en' | 'es'): Promise<boolean>
```

All use Resend SDK (`getResend().emails.send()`). Recipients are passed as `to: [email]` or `to: [TO_EMAIL]` arrays in each function's send call.

### B6. SANDBOX_MODE and FROM_EMAIL

```typescript
29: const FROM_EMAIL = 'No-Reply@4lg.org';
33: const SANDBOX_MODE = (FROM_EMAIL as string) === 'onboarding@resend.dev';
34: const SANDBOX_ALLOWED_EMAIL = 'flgnynjai@gmail.com';
```

**SANDBOX_MODE is false** [VERIFIED — `FROM_EMAIL` is `'No-Reply@4lg.org'`, which !== `'onboarding@resend.dev'`].
**FROM_EMAIL is exactly `'No-Reply@4lg.org'`** [VERIFIED].

### B7. Subscribe endpoint call site

```typescript
84: import { sendApplicationEmail, sendApplicantConfirmationEmail, sendRGNewRequestEmail, sendRGDeadlineReminderEmail, sendRGStaffResponseEmail, sendRGResolvedEmail, sendRGFollowUpEmail, sendIntakeAlertEmail, sendIntakeOfficerReceiptEmail, sendVolunteerReviewerEmail, sendVolunteerApplicantConfirmationEmail, sendContactFormEmail, sendSubscribeNotificationEmail } from './emailService.js';

11241: // POST /api/subscribe - Website mailing list signup
11242: app.post('/api/subscribe', subscribeLimiter, async (req: Request, res: Response) => {
```

The call at line ~11273:
```typescript
const sent = await sendSubscribeNotificationEmail(email.trim(), lang);
```

Pattern: import the function, call it with arguments, check the boolean return for success/failure.

---

## C. Daily Timer Pattern

### C8. scheduleNightlySMPhotoSync() — lines 10954–11011

Full implementation:

```typescript
function scheduleNightlySMPhotoSync(): void {
  // Target: 2am Eastern daily. Uses EDT (-4hr) offset to match existing timezone pattern.
  const msUntilNext2AM = (): number => {
    const now = new Date();
    const etOffsetMs = 4 * 60 * 60 * 1000;
    const nowEt = new Date(now.getTime() - etOffsetMs);
    const next2amEt = new Date(nowEt);
    next2amEt.setHours(2, 0, 0, 0);
    if (next2amEt.getTime() <= nowEt.getTime()) {
      next2amEt.setDate(next2amEt.getDate() + 1);
    }
    return next2amEt.getTime() - nowEt.getTime();
  };
  
  const initialDelay = msUntilNext2AM();
  const hoursUntil = (initialDelay / 1000 / 60 / 60).toFixed(2);
  console.log(`[SM Photo Sync] First run scheduled in ${hoursUntil} hours`);
  
  setTimeout(() => {
    runNightlySMPhotoSync();
    setInterval(() => {
      runNightlySMPhotoSync();
    }, 24 * 60 * 60 * 1000);
  }, initialDelay);
}

// Registered at startup (line 11011):
scheduleNightlySMPhotoSync();
```

Also present: `scheduleMidnightFeedingJob()` (lines 10982–11009) using the identical pattern — compute ms-until-target, `setTimeout` for first run, `setInterval(24h)` for recurrence.

**Pattern:** Both use hardcoded EDT offset (4 hours). Note: this will be wrong during EST (November–March) — the fire time will drift by 1 hour. Not a bug for photo sync (2am vs 3am doesn't matter), but worth noting if the new alert has a tighter timing requirement.

---

## Key Findings Summary

1. **No local persistence of SM adoptable status.** ADOPTABLE is read live from SM API every request (cached 15 min). No table stores it. No history tracked.
2. **New state tracking required.** A "newly adoptable" alert needs a snapshot table to compare against. This is net-new — no existing mechanism to extend.
3. **Email infra is production-ready.** Resend SDK with verified domain, SANDBOX_MODE=false, FROM_EMAIL='No-Reply@4lg.org'. All send functions follow the same pattern.
4. **Timer pattern is established.** `setTimeout` + `setInterval(24h)` with manual ET offset calculation. Two existing examples to copy from.
5. **EDT offset hardcoded.** Both existing timers use `-4hr` offset. Consider whether the new alert should follow suit or use a more robust timezone approach.
