# Featured Six Weekly Staff Email — Status Diagnosis

**Date:** 2026-06-30 20:58 UTC
**Type:** Read-only diagnosis
**Goal:** Verify what exists vs what's missing for a weekly staff email listing the six animals to rotate into the homepage featured section.

---

## 1. The Queue Table: `featured_rotation_queue`

**Schema:**
```sql
CREATE TABLE featured_rotation_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species TEXT NOT NULL,           -- 'cat', 'dog', or 'small'
  shelter_code TEXT NOT NULL,      -- animal identifier (unique index)
  position INTEGER NOT NULL,      -- ordering within species bucket (1-based)
  date_available TEXT NOT NULL,    -- ISO date the animal became adoptable
  added_at TEXT NOT NULL,          -- when the row was inserted
  last_featured_at TEXT            -- when last promoted to featured (nullable)
);
-- Indexes: (species, position) composite + unique on shelter_code
```

**Contents:** 76 rows, all seeded 2026-06-26T03:44:52Z.

| Species | Count |
|---------|-------|
| cat     | 21    |
| dog     | 35    |
| small   | 20    |
| **Total** | **76** |

**What rows represent:** Each row is an adoptable animal eligible for homepage featuring, ordered by `position` within its species bucket. Position 1 = longest-waiting. The `date_available` column reflects when the animal became adoptable (ranges from 2023-12-05 to 2026-06-24).

**Ordering:** Materialized. The `position` column explicitly orders animals within each species group, oldest-first. The index on `(species, position)` supports efficient ordered reads.

**Status tracking:** `last_featured_at` exists but is NULL for all 76 rows — no animal has been marked as featured through this system yet.

**Assessment:** The queue is fully populated and ready for selection.

---

## 2. The Slots Table: `featured_slots`

**Schema:**
```sql
CREATE TABLE featured_slots (
  slot_index INTEGER PRIMARY KEY,  -- 1-6
  shelter_code TEXT,
  media_id TEXT,
  media_type TEXT,
  updated_at TEXT NOT NULL
);
```

**Contents (all 6 rows):**

| slot_index | shelter_code | media_type | updated_at |
|------------|-------------|------------|------------|
| 1 | R2024018 | video | 2026-04-22 |
| 2 | A2024185 | video | 2026-06-01 |
| 3 | S2026133 | video | 2026-05-09 |
| 4 | S2025966 | video | 2026-06-25 |
| 5 | S2026047 | video | 2026-05-05 |
| 6 | S20241099 | video | 2026-06-25 |

**What this is:** The CURRENT six featured animals on the website homepage. These are what the dashboard's `/api/featured-slots` endpoint serves. Slots are manually managed via PUT/DELETE endpoints — staff select which animal+media to show in each slot.

**Relationship to queue:** None at the code level. `featured_slots` and `featured_rotation_queue` are independent tables. Nothing in the code automatically promotes queue entries to slots. The queue tells staff WHICH animals to feature; staff then manually update the slots through the dashboard. The `last_featured_at` column on the queue exists to track when an animal was featured but is currently unused.

---

## 3. Selection/Rotation Logic in Code

### Core module: `featuredRotation.ts` (459 lines)

**Exported functions:**
- `computeSeedQueues()` — builds the initial 76-row queue from live SM animal data (one-time seed)
- `insertSeedQueues()` — writes computed queues to DB (one-time seed)
- `writeSeedReport()` / `writeInsertReport()` — write markdown reports for seed operations
- `readQueuesFromDb()` — reads queue from DB, enriches with animal names from SM
- `computeEditionWindows(queues, weekIndex)` — **THE ROTATION LOGIC** — picks the six for a given week
- `renderEditionEmailHtml(edition)` — **THE EMAIL TEMPLATE** — renders HTML email body

### The rotation logic (`computeEditionWindows` + `getWindowForWeek`):

```typescript
function getWindowForWeek(
  queues: Record<'cat' | 'dog' | 'small', EditionAnimal[]>,
  weekIndex: number,
): EditionAnimal[] {
  const window: EditionAnimal[] = [];
  for (const bucket of ['cat', 'dog', 'small'] as const) {
    const perWeek = SLOTS_PER_SPECIES[bucket]; // cat=3, dog=2, small=1
    const q = queues[bucket];
    const offset = (perWeek * weekIndex) % (q.length || 1);
    window.push(...sliceWrapping(q, offset, perWeek));
  }
  return window;
}
```

This picks 3 cats, 2 dogs, 1 small animal for a given `weekIndex`, sliding through the position-ordered queue with wrapping. Oldest-first is guaranteed by the queue's position ordering.

`computeEditionWindows(queues, weekIndex)` returns three sets:
- `currentSix` — what's currently featured (previous week's pick)
- `newSix` — what to swap in now (this week's pick)
- `nextSix` — preview of next week

### API endpoints (in server.ts):

| Endpoint | Purpose |
|----------|---------|
| `GET /api/featured-slots` (line 2853) | Returns current 6 slots with enriched animal data — serves the **website homepage** |
| `PUT /api/featured-slots/:index` (line 2904) | Manually set a slot's animal+media — **dashboard use** |
| `DELETE /api/featured-slots/:index` (line 2964) | Clear a slot — dashboard use |
| `POST /api/dashboard/featured-rotation/dry-run` (line 12945) | Compute seed queues without DB writes |
| `POST /api/dashboard/featured-rotation/seed-commit` (line 12973) | Insert seed queues to DB |
| `POST /api/dashboard/featured-rotation/test-four-editions` (line 12998) | Generate 4 weeks of edition emails and send them all to flgnynjai@gmail.com |

**Note:** There is NO endpoint that returns "this week's six to feature" as a standalone API call. The test-four-editions endpoint hardcodes 4 editions and sends all 4 to a hardcoded recipient.

### The website homepage

The website pulls from `GET /api/featured-slots`, which reads the `featured_slots` table — NOT the rotation queue. The rotation queue is advisory (tells staff what to change); the slots table is what the site actually displays.

---

## 4. The Email

### Email template: EXISTS

`renderEditionEmailHtml()` in `featuredRotation.ts` (line 440) produces a styled HTML email with:
- Title: "Four Legs Good — Weekly Website Update"
- Three sections: Currently Featured / Swap In Now / Coming Next Week
- Each section is a table: Name, Species, Code, Days Listed
- Footer: "Automated by the 4LG shelter app. Animals are ordered oldest-listed-first."

### Send function: EXISTS

`sendFeaturedRotationEmail()` in `emailService.ts` (line 1437):
```typescript
export async function sendFeaturedRotationEmail(
  html: string,
  recipient: string,      // single string, NOT an array
  subject: string,
): Promise<{ success: boolean; id?: string }>
```

Sends via Resend with `from: FROM_EMAIL` ('No-Reply@4lg.org'), `to: [recipient]` (wraps single string in array).

**Note:** The function signature takes a single `recipient: string`, not an array. To send to multiple recipients, either the caller loops or the signature needs updating.

### Scheduler: DOES NOT EXIST

- No `setInterval`/`setTimeout`/cron reference to featured rotation in server.ts or featuredRotation.ts
- No VPS crontab entries (root, shelter, or rover) for featured rotation
- No OpenClaw cron jobs configured
- The test-four-editions endpoint is manually triggered, not scheduled
- No "Wednesday scheduler" exists anywhere — not even parked/stubbed

---

## 5. The Gap — What Exists vs What's Missing

### EXISTS (fully built):
- ✅ **Queue table** — 76 animals, position-ordered, oldest-first, three species buckets
- ✅ **Rotation/selection logic** — `computeEditionWindows()` picks 3 cats + 2 dogs + 1 small per week, sliding window with wrapping
- ✅ **Email HTML template** — `renderEditionEmailHtml()` produces a styled email with current/new/next sections
- ✅ **Email send function** — `sendFeaturedRotationEmail()` sends via Resend

### MISSING:
1. **Week counter / state tracking** — Nothing tracks "which week are we on." `computeEditionWindows` takes a `weekIndex` parameter but nothing persists or increments it. The test endpoint just runs weeks 0-3 in a loop. A production scheduler needs to know the current edition number.

2. **Scheduler** — No automated trigger exists. Needs either:
   - A VPS cron job that hits an endpoint, or
   - An OpenClaw cron job, or
   - A `setInterval` inside the server process
   
3. **Production recipient routing** — The test endpoint hardcodes `flgnynjai@gmail.com`. A production send needs the actual staff recipient list (similar to the `ADOPTION_TO_EMAILS` / `VOLUNTEER_TO_EMAILS` pattern just implemented).

4. **Single-edition endpoint** — The existing test endpoint sends 4 editions at once. Production needs a "send this week's edition" endpoint or function that sends exactly one edition to the staff list.

5. **Multi-recipient support** — `sendFeaturedRotationEmail()` takes a single `recipient: string`. If the email goes to multiple staff members, the function needs to accept an array (or the caller needs to loop, but looping sends separate Resend API calls with separate message IDs).

### VERDICT

**It is NOT "just add a recipient and send."** The rotation logic, queue, template, and send function all exist and are tested (the test-four-editions endpoint was used to send 4 preview editions on 2026-06-25). But there's no scheduler, no week counter, no production recipient config, and no single-edition trigger. These are the four pieces that need building to go from "tested prototype" to "weekly operational email."

The work is modest — the hard parts (queue population, rotation algorithm, HTML template) are done. What remains is plumbing: a weekly trigger, a way to track which edition to send, and routing to the right recipients.
