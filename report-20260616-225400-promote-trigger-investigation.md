# promoteDraftSize Trigger Investigation — Correction to Prior Report

**Date:** 2026-06-16 22:54 UTC  
**Scope:** Read-only — no changes  
**Corrects:** report-20260616-224403 (wrong conclusion about "someone promoted via a promote button")

---

## 1. ALL CALLERS OF promoteDraftSize [VERIFIED]

**One call site in the entire codebase:**

```
server/src/server.ts:2397:    const result = promoteDraftSize(shelterCode, size as 'long' | 'short', expectedGeneratedAt);
```

This is inside the API endpoint:

```typescript
// server/src/server.ts:2383
app.post('/api/bio/draft/:shelterCode/promote/:size', express.json(), async (req, res) => {
    const shelterCode = req.params.shelterCode;
    const size = req.params.size;  // 'long' or 'short'
    const { expectedGeneratedAt } = req.body;
    const result = promoteDraftSize(shelterCode, size, expectedGeneratedAt);
    // ...
});
```

**No automatic caller.** No cron job, no daily pass, no profile-save trigger, no background task calls `promoteDraftSize`. It is ONLY invoked via this HTTP endpoint. [VERIFIED]

---

## 2. THE 'LONG'-ONLY PROMOTION [VERIFIED]

### What happened at 2026-06-15 23:12:37

The dashboard's **"✓ Approve for Public Use"** button (line 7600) calls `approveBio()` (line 7769). Inside `approveBio()`:

```javascript
// dashboard/index.html:7778-7783
const useDraft = draft && ((size === 'long' && !draft.promotedLong) || (size === 'short' && !draft.promotedShort));

if (useDraft) {
    // New path: promote from animal_bio_drafts
    const response = await fetch(`${API_BASE}/bio/draft/${shelterCode}/promote/${size}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedGeneratedAt: draft.generatedAt }),
    });
```

When a draft exists with an unpromoted size, clicking "Approve for Public Use" calls `POST /api/bio/draft/:shelterCode/promote/:size`, which internally calls `promoteDraftSize()`. **The "Approve for Public Use" button IS the promote trigger.** There is no separate "Promote" button — the prior report's language was misleading. [VERIFIED]

### Why only long?

The user clicked "✓ Approve for Public Use" on the **long bio section only** and did not click the corresponding button on the short bio section. Both buttons were available and enabled. This is a **per-size user action** — each section has its own Approve button (line 7600 for long, line 7628 for short). [VERIFIED]

---

## 3. DASHBOARD BUTTON WIRING [VERIFIED]

### "✓ Approve for Public Use" (per size) — `approveBio(animalId, bioId, size)`

```
dashboard/index.html:7600  — long button
dashboard/index.html:7628  — short button
```

**When draft exists with unpromoted size:**
→ Calls `POST /api/bio/draft/:shelterCode/promote/:size` (server.ts:2383)
→ Internally calls `promoteDraftSize()` (server.ts:2397)
→ Uses `ON CONFLICT DO UPDATE SET` — updates ONLY the target size's columns
→ Other size untouched

**When NO draft (legacy path):**
→ Calls `POST /api/bio/:bioId/approve/:size` (approveAnimalBioLong or approveAnimalBioShort)
→ Flips status to 'approved' + sets approved_at on that size directly

### "💾 Re-translate Edits and Save" (per size) — `saveBio(animalId, bioId, size)`

```
dashboard/index.html:7599  — long button
dashboard/index.html:7627  — short button
```

→ Calls `POST /api/bio/:bioId/save/:size` (if draft exists, saves to draft via `saveAnimalBioDraftSize`)
→ Updates text only for that size, resets status to 'draft'

### "🔄 Regenerate" (per size) — `regenerateBio(animalId, size)`

```
dashboard/index.html:7601  — long button
dashboard/index.html:7629  — short button
```

→ Calls `POST /api/bio/regenerate/:shelterCode/:size`
→ Regenerates ONLY that size via AI, saves to draft

**All three buttons are per-size. There is no "Approve Both" or "Promote Both" button.** [VERIFIED]

---

## 4. PIPELINE vs USER EXPECTATION [VERIFIED]

### What the user expects:

> When an animal has generic bios and a caregiver profile comes in, the system should automatically generate BOTH long and short as non-generic (profile-derived) bios in PENDING/draft state awaiting approval. Not auto-approved, not partially promoted — both sizes, profile-derived, pending.

### What actually happens:

**Step 1 — Automatic (profile-save trigger, server.ts:5060-5075):**

When a caregiver profile is saved → `generateBioDraftForAnimal(shelterCode)` runs in the background. This:
- Generates BOTH long AND short from profile data via AI [VERIFIED at server.ts:2088-2093]
- Saves BOTH to `animal_bio_drafts` with `source_long=from_profile, source_short=from_profile` [VERIFIED at localDatabase.ts:1710-1727]
- Does NOT touch the approved `animal_bios` table [VERIFIED]
- Does NOT auto-approve or auto-promote anything [VERIFIED]

**This matches the user's expectation.** ✅

**Step 2 — Dashboard display (what the user sees):**

When the bio panel renders and a draft exists:
- `useDraftLong = draft && !draft.promotedLong` → shows draft text (profile-derived), status "Pending Draft" [VERIFIED at dashboard:7534]
- `useDraftShort = draft && !draft.promotedShort` → shows draft text (profile-derived), status "Pending Draft" [VERIFIED at dashboard:7535]
- Both "Approve for Public Use" buttons are enabled [VERIFIED]

**This also matches the user's expectation.** ✅ Both sizes show as pending, profile-derived.

**Step 3 — The gap (user approval):**

Each size must be approved independently. There is no "Approve Both" button. If the user approves long but not short, the long gets promoted to `from_profile` while the short remains showing the draft. The APPROVED short (visible publicly via the API) remains the old `adult_generic` text until the short is also approved.

**This is where divergence occurs.** The system DOES generate both sizes from profile. But it requires TWO separate clicks to approve them, and the user apparently only clicked one.

### Charlie's specific case:

The complication is the **adult intake pass** (age-crossing, server.ts:11938-11950). For `has_profile` animals, the pass:
1. **First** writes generic to BOTH sizes as approved (saveAnimalBio with source generic_adult) [VERIFIED at server.ts:11792-11803]
2. **Then** generates a profile-seeded draft for BOTH sizes [VERIFIED at server.ts:11943-11945]

This means the **publicly visible bio immediately becomes generic** (step 1), even though a profile-derived draft exists (step 2). The user must then go approve both sizes to replace the generics with the profile versions.

**This partially contradicts the user's expectation.** The user expects profile data to produce pending/draft bios — but the intake pass writes approved generics FIRST, then creates the draft on top. The generics are immediately public. The draft requires manual approval to replace them.

---

## CONCLUSION

**(a) What triggered Charlie's long-only promotion:** The user clicked "✓ Approve for Public Use" on the long bio section in the dashboard. This called `POST /api/bio/draft/R2023007/promote/long`, which internally called `promoteDraftSize('R2023007', 'long', ...)`. No automatic process did this. The short bio's "Approve" button was available but was not clicked. [VERIFIED]

**(b) The pipeline correctly generates both sizes from profile.** `generateBioDraftForAnimal()` always produces both long and short with source `from_profile`. The draft is correctly created in the background when a caregiver profile is saved. [VERIFIED]

**(c) The gap is in two places:**

1. **UX gap:** No "Approve Both Sizes" button exists. Each size requires a separate click. The user may not realize the short bio is still publicly showing the old generic until they also approve it. [VERIFIED — no combined button in code]

2. **Adult intake pass gap:** For `has_profile` animals, the pass writes approved generics to BOTH sizes before generating the draft. This means the publicly visible bio is generic until the user manually promotes each draft size. The user's expectation ("profile comes in → pending drafts") is met for the DRAFT table, but the PUBLIC bio is generic until explicit approval. This may be confusing when the dashboard shows "Pending Draft" (the draft overlay) but the public-facing bio is actually the underlying approved generic. [VERIFIED]

**(d) Recommendation (not implemented):** Either (i) add an "Approve Both" button when both sizes have unpromoted drafts, or (ii) for the `has_profile` bucket in adult intake, don't write approved generics — instead write both sizes as 'draft' status with generic text, so the profile draft takes priority in display and the public bio shows nothing until approved. This is an architecture decision for Dashboard Opus. [INFERRED]
