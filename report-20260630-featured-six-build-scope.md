# Featured Six Weekly Email — Build Scope

**Date:** 2026-06-30 21:17 UTC
**Type:** Implementation scoping (read-only)
**Prerequisite report:** report-20260630-featured-six-email-status.md

---

## 1. In-App Scheduler Pattern

### Existing pattern

The codebase has **7 in-app schedulers**, all in server.ts, all following the same structure:

```
1. Compute msUntilTarget (delay from now to next fire time)
2. setTimeout(callback, msUntilTarget)
3. Inside callback: run the job, then setInterval(job, intervalMs)
```

**Example — `scheduleDailyAdoptableCheck()` (server.ts:12683):**
```typescript
function scheduleDailyAdoptableCheck(): void {
  const msUntilNext9AM = (): number => {
    const now = new Date();
    const etOffsetMs = 4 * 60 * 60 * 1000;
    const nowEt = new Date(now.getTime() - etOffsetMs);
    const next9amEt = new Date(nowEt);
    next9amEt.setHours(9, 0, 0, 0);
    if (next9amEt.getTime() <= nowEt.getTime()) {
      next9amEt.setDate(next9amEt.getDate() + 1);
    }
    return next9amEt.getTime() - nowEt.getTime();
  };

  const initialDelay = msUntilNext9AM();
  setTimeout(() => {
    runAdoptableStatusCheck();
    setInterval(() => {
      runAdoptableStatusCheck();
    }, 24 * 60 * 60 * 1000);   // repeat every 24h
  }, initialDelay);
}
scheduleDailyAdoptableCheck();
```

### ET/DST handling — TWO patterns in the codebase

**Pattern A — Hardcoded EDT offset (4 hours):**
Used by: adoptable check (12683), nightly SM sync (12527), generic bio (13128)
```typescript
const etOffsetMs = 4 * 60 * 60 * 1000;  // hardcoded EDT
const nowEt = new Date(now.getTime() - etOffsetMs);
```
**⚠️ DST BUG:** These hardcode UTC-4 (EDT). During EST (Nov–Mar), Eastern is UTC-5. These jobs fire 1 hour early during winter. For a 2am or 9am job, 1 hour drift is tolerable — for a 4pm staff email, firing at 3pm or 5pm matters more.

**Pattern B — DST-aware toLocaleString:**
Used by: activity auto-close (12269), midnight feeding (12310), searcher snapshot (13158)
```typescript
const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const target = new Date(etNow);
target.setHours(16, 0, 0, 0);  // 4pm ET
if (target.getTime() <= etNow.getTime()) {
  target.setDate(target.getDate() + 1);
}
const etOffset = etNow.getTime() - now.getTime();
return target.getTime() - etOffset - now.getTime();
```
**✅ This handles DST correctly.** `toLocaleString` with `America/New_York` returns the real current Eastern time regardless of EDT/EST.

### Recommendation for the Wednesday-4PM-ET scheduler

Use **Pattern B (DST-aware)** — critical because:
- 4pm ET = 20:00 UTC during EDT, 21:00 UTC during EST
- Pattern A would fire at 3pm ET during winter or 5pm ET depending on which offset is hardcoded
- The activity auto-close and feeding schedulers already prove Pattern B works in this codebase

### Weekly interval — new territory

All existing schedulers are daily (24h setInterval). A Wednesday job needs either:
- `7 * 24 * 60 * 60 * 1000` interval (168 hours), or
- 24h interval with a day-of-week guard (`if (etNow.getDay() !== 3) return;`)

**Recommendation: 7-day interval.** The setTimeout computes delay until the next Wednesday 4pm ET. The setInterval repeats every 168 hours. This avoids 6 no-op wake-ups per week. The 24h+guard approach is safer against drift across DST transitions, but `toLocaleString` recomputes correctly each time anyway. Either works; 7-day is simpler.

**However:** 7-day setInterval can drift across DST transitions (a 168-hour interval can land at 3pm or 5pm after a clock change). **Safest approach:** use the same setTimeout→setInterval pattern but with the interval callback recomputing the delay to next Wednesday 4pm ET each time (effectively `setTimeout(recurse, msUntilNextWed4pm())` in a loop instead of setInterval). This is a minor departure from the existing pattern but eliminates DST drift entirely.

---

## 2. Edition State — Where to Store It

### Existing settings/config table: NONE

No `settings`, `config`, `app_state`, or `kv` table exists in the schema. The 48 existing tables are all domain-specific.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A. New `app_settings` KV table** | Reusable for future settings; clean | New table for one key |
| **B. New `featured_rotation_state` table** | Purpose-specific; clear schema | Single-purpose table |
| **C. Derive from anchor date** | No persistence needed for edition number | Can't track "already sent this week" |
| **D. File on disk** | Zero schema changes | Fragile; not queryable |

### Recommendation: Option B — `featured_rotation_state`

```sql
CREATE TABLE featured_rotation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),    -- singleton row
  anchor_date TEXT NOT NULL,                 -- '2026-07-08' (first edition date)
  last_sent_edition INTEGER,                -- edition number of last sent email (NULL = never sent)
  last_sent_at TEXT                          -- ISO timestamp of last send (NULL = never sent)
);

INSERT INTO featured_rotation_state (id, anchor_date, last_sent_edition, last_sent_at)
VALUES (1, '2026-07-08', NULL, NULL);
```

**Edition number derivation:**
```typescript
const anchor = new Date('2026-07-08T00:00:00');
const now = new Date();
const msElapsed = now.getTime() - anchor.getTime();
const currentEdition = Math.max(0, Math.floor(msElapsed / (7 * 24 * 60 * 60 * 1000)));
```

The `last_sent_edition` column provides idempotency — if `last_sent_edition >= currentEdition`, skip the send.

Why not Option A: there are no other settings that need a KV table, and a typed schema is better than a generic key-value for a thing with specific fields.

Why not Option C: edition number CAN be derived from anchor, but we need "already sent" tracking for idempotency, so we need a row anyway.

---

## 3. Idempotency — Don't Double-Send

**The failure scenario:** Server restarts Wednesday at 4:05pm. Scheduler recomputes delay to "next Wednesday 4pm" — but it's past 4pm today, so it targets next Wednesday. However, if the restart happens at 3:59pm, it fires at 4pm, then the setInterval fires again 7 days later. The real risk is: did it send before the restart?

**Mechanism:**

```typescript
async function runWeeklyFeaturedEmail(): Promise<void> {
  const db = getDatabase();
  const state = db.prepare('SELECT * FROM featured_rotation_state WHERE id = 1').get();
  
  // Compute current edition from anchor
  const anchorMs = new Date(state.anchor_date + 'T00:00:00Z').getTime();
  const nowMs = Date.now();
  if (nowMs < anchorMs) return;  // before first edition
  const currentEdition = Math.floor((nowMs - anchorMs) / (7 * 24 * 60 * 60 * 1000));
  
  // Idempotency check
  if (state.last_sent_edition !== null && state.last_sent_edition >= currentEdition) {
    console.log(`[Featured Email] Edition ${currentEdition} already sent, skipping`);
    return;
  }
  
  // ... compute, render, send ...
  
  // Record sent AFTER successful send
  db.prepare('UPDATE featured_rotation_state SET last_sent_edition = ?, last_sent_at = ? WHERE id = 1')
    .run(currentEdition, new Date().toISOString());
}
```

**Key properties:**
- Edition number is derived from wall-clock time vs anchor — deterministic, survives restarts
- `last_sent_edition` is written AFTER successful send — crash before send = retry on next wake
- `last_sent_edition >= currentEdition` check prevents double-send
- A server restart mid-week recomputes delay to next Wednesday; if this Wednesday's edition already sent, it no-ops

---

## 4. Single-Edition Send Function

### What to extract from test-four-editions

The existing `test-four-editions` endpoint (server.ts:12998) does:
```typescript
const queues = await readQueuesFromDb();
for (let w = 0; w < 4; w++) {
  const edition = computeEditionWindows(queues, w);
  const html = renderEditionEmailHtml(edition);
  await sendFeaturedRotationEmail(html, recipient, subject);
}
```

### Single-edition function (new)

```typescript
async function runWeeklyFeaturedEmail(): Promise<void> {
  // 1. Read state, compute current edition, idempotency check (see §3)
  
  // 2. Compute this week's edition
  const queues = await readQueuesFromDb();
  const edition = computeEditionWindows(queues, currentEdition);
  
  // 3. Render email
  const html = renderEditionEmailHtml(edition);
  
  // 4. Send to all recipients
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: FEATURED_TO_EMAILS,
    subject: 'Weekly Website Update',
    html,
  });
  
  // 5. Record as sent (idempotency stamp)
  
  // 6. Optionally stamp last_featured_at on the 6 animals
}
```

**Reused from existing code:**
- `readQueuesFromDb()` — reads queue, enriches with names (featuredRotation.ts:377)
- `computeEditionWindows()` — picks the 6 for a given week (featuredRotation.ts:363)
- `renderEditionEmailHtml()` — produces HTML body (featuredRotation.ts:440)

**New:**
- Edition number derivation from anchor
- Idempotency check + stamp
- Multi-recipient send (via updated function or direct Resend call)

---

## 5. Recipients — Configuration Pattern

### Current pattern (just implemented)

In `emailService.ts`, lines 30-31:
```typescript
const ADOPTION_TO_EMAILS = ['adopt@4lg.org', 'gentlesouls@aol.com', 'flgnynjai@gmail.com'];
const VOLUNTEER_TO_EMAILS = ['volunteer@4lg.org', 'flgnynjai@gmail.com'];
```

These are **module-level constants in emailService.ts**, not environment variables or config file values. Callers pass the array directly to Resend's `to` field.

### Recommendation

Add to `emailService.ts` at line 32 (after VOLUNTEER_TO_EMAILS):
```typescript
const FEATURED_TO_EMAILS = ['Martha.underwood17@gmail.com', 'flgnynjai@gmail.com'];
```

Same pattern — constant array, same file, same block.

### Send function signature

Current `sendFeaturedRotationEmail` takes `recipient: string` (single). Two options:

| Option | Change | Match with adoption/volunteer? |
|--------|--------|-------------------------------|
| **A. Widen to `recipients: string[]`** | Change param type, remove `[recipient]` wrapper, pass array directly | ✅ Matches — adoption/volunteer pass arrays directly to `to:` |
| **B. Caller loops** | No signature change; caller sends N times | ❌ Sends N separate emails with separate Resend message IDs |

**Recommendation: Option A.** Change signature to:
```typescript
export async function sendFeaturedRotationEmail(
  html: string,
  recipients: string[],    // was: recipient: string
  subject: string,
): Promise<{ success: boolean; id?: string }> {
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: recipients,         // was: [recipient]
    subject,
    html,
  });
  // ...
}
```

This matches how `sendApplicationEmail` and `sendVolunteerReviewerEmail` pass their arrays. The test-four-editions endpoint (the only existing caller) would need its call updated from `sendFeaturedRotationEmail(html, recipient, subject)` to `sendFeaturedRotationEmail(html, [recipient], subject)` — or better, it should also use `FEATURED_TO_EMAILS`.

---

## 6. `last_featured_at` Column

**Current state:** Column exists on all 76 `featured_rotation_queue` rows, all NULL.

**What reads it:** Nothing. Only reference is in the INSERT statement in `insertSeedQueues()` (featuredRotation.ts:259) which sets it to NULL on initial seed.

**Recommendation: Stamp it on send, but as optional bookkeeping.** When an edition is sent, update the 6 featured animals:
```sql
UPDATE featured_rotation_queue
SET last_featured_at = ?
WHERE shelter_code IN (?, ?, ?, ?, ?, ?)
```

This costs one SQL statement per weekly send and provides operational visibility ("when was this animal last featured?"). Nothing reads it today, but it's useful for:
- Future "don't feature the same animal twice within N weeks" logic
- Dashboard display of queue status
- Debugging if animals seem to repeat too soon

**Not blocking:** Can be deferred to a follow-up if scope needs trimming.

---

## 7. The Build Plan

### File changes

**File 1: `emailService.ts`**

| Change | Location | Detail |
|--------|----------|--------|
| Add `FEATURED_TO_EMAILS` constant | Line 32 (after VOLUNTEER_TO_EMAILS) | `const FEATURED_TO_EMAILS = ['Martha.underwood17@gmail.com', 'flgnynjai@gmail.com'];` |
| Widen `sendFeaturedRotationEmail` signature | Line 1437 | `recipient: string` → `recipients: string[]`; remove `[recipient]` wrapper |
| Export `FEATURED_TO_EMAILS` | Line 32 | `export const` so server.ts can import it (or keep private and have the email function reference it internally — see note) |

**Note on architecture:** The cleaner option is to NOT export `FEATURED_TO_EMAILS`. Instead, have `sendFeaturedRotationEmail` always use the module-level constant (like a hypothetical `sendFeaturedRotationEmailToStaff()` that knows its own recipients). This matches how `sendApplicationEmail` doesn't take a recipient param — it uses `ADOPTION_TO_EMAILS` internally. However, the existing function IS parameterized (the test endpoint sends to a hardcoded `flgnynjai@gmail.com`). Recommendation: keep the parameterized signature for test flexibility, but have the production scheduler call it with `FEATURED_TO_EMAILS` (exported).

**File 2: `server.ts`**

| Change | Location | Detail |
|--------|----------|--------|
| Import `FEATURED_TO_EMAILS` | Line 98 (existing emailService import) | Add to the import destructure |
| Create `featured_rotation_state` table | Near DB init block (find with grep) | `CREATE TABLE IF NOT EXISTS` — idempotent |
| Add `runWeeklyFeaturedEmail()` function | After line ~13199 (after `scheduleDailySearcherSnapshot()` call) | The single-edition send logic |
| Add `scheduleWeeklyFeaturedEmail()` function | After `runWeeklyFeaturedEmail` | DST-aware Wednesday 4pm ET scheduler |
| Call `scheduleWeeklyFeaturedEmail()` | After the function definition | Top-level invocation like other schedulers |
| Update test-four-editions endpoint | Line 13014 | Update `sendFeaturedRotationEmail` call to pass array |

**File 3: Schema migration (inline in server.ts)**

```sql
CREATE TABLE IF NOT EXISTS featured_rotation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  anchor_date TEXT NOT NULL,
  last_sent_edition INTEGER,
  last_sent_at TEXT
);
INSERT OR IGNORE INTO featured_rotation_state (id, anchor_date)
VALUES (1, '2026-07-08');
```

### Insertion points (server.ts line numbers)

1. **Import update:** Line 98 — add `FEATURED_TO_EMAILS` to the emailService import
2. **Table creation:** Locate the DB init/migration block (grep for `CREATE TABLE IF NOT EXISTS` near startup) — add the state table there
3. **run function + scheduler:** After line 13199 (`scheduleDailySearcherSnapshot()`) — this is where all scheduler registrations end, before the one-shot publish endpoints
4. **test-four-editions fix:** Line 13014 — update the `sendFeaturedRotationEmail(html, recipient, subject)` call

### Design-review-worthy items (flag for Auditor)

1. **Date-anchored counter + DST:** The edition number derivation (weeks since 2026-07-08) and the DST-aware Wednesday-4pm scheduling are the two places where subtle bugs hide. The anchor math is simple but should be eyeballed for off-by-one (does edition 0 fire ON 2026-07-08 or one week after?).

2. **Idempotency edge case:** If the server is down for multiple weeks and comes back, the current edition number will jump ahead. The scheduler will fire once and send the current edition (correct), skipping the missed weeks (acceptable — staff don't need a backlog of stale rotation emails). But confirm this is the desired behavior.

3. **7-day setInterval vs recursive setTimeout:** A 7-day setInterval drifts at DST boundaries (±1 hour). Recursive setTimeout with delay recomputation is safer. Minor point but worth confirming which approach.

4. **Queue exhaustion:** With 76 animals and wrapping math, the queue wraps after ~12 weeks for cats (21÷3), ~17 weeks for dogs (35÷2), and 20 weeks for small (20÷1). The existing `sliceWrapping` handles this correctly. But: if animals are adopted and removed from the queue without new ones being added, the pool shrinks. Nothing currently removes adopted-out animals from `featured_rotation_queue`. This is a future maintenance concern, not a build blocker.

### Estimated scope

- emailService.ts: ~10 lines changed (constant + signature)
- server.ts: ~80-100 lines added (state table, run function, scheduler, scheduler registration)
- featuredRotation.ts: 0 lines changed (all reuse)
- Total: ~100 lines, single commit, single restart
