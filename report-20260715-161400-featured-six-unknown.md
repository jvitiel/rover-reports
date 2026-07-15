# Featured Six "Unknown" Animal — Diagnosis Report

**Date:** 2026-07-15 20:14 UTC  
**Type:** Read-only diagnosis  
**Scope:** Featured rotation queue, weekly email, name resolution

---

## 1. Generation Mechanics

**Verdict: The weekly Featured Six list is generated FRESH from the queue at send time, not pre-staged.** [VERIFIED with code]

### How it works

The scheduler (`scheduleWeeklyFeaturedEmail()` at server.ts:13475) fires every Wednesday at 4 PM ET (20:00 UTC) via a self-rescheduling `setTimeout` chain using DST-safe wall-clock math (`msUntilNextWed4pmET()`).

When it fires, `runWeeklyFeaturedEmail()` (server.ts:13392):

1. **Reads `featured_rotation_state`** — a single-row table holding `anchor_instant`, `last_sent_edition`, `last_sent_at`.
2. **Computes the current edition number:** `Math.floor((nowMs - anchorMs) / (7 * 24 * 60 * 60 * 1000))` — pure arithmetic from the anchor timestamp.
3. **Skips if already sent** (`last_sent_edition >= currentEdition`).
4. **Calls `readQueuesFromDb()`** (featuredRotation.ts:378) which:
   - SELECTs all rows from `featured_rotation_queue` ordered by species + position
   - **Calls `fetchAnimals()`** — a LIVE SM API call (5-min cache) returning only `ADOPTABLE===1` animals
   - Builds a `nameMap` from the live API response
   - For each queue entry: `name = nameMap.get(row.shelter_code) || '(unknown)'`
5. **Calls `computeEditionWindows(queues, currentEdition)`** — applies a sliding-window algorithm (per-species slots with wrapping) to select 6 animals.
6. **Renders HTML via `renderEditionEmailHtml()`** and sends via Resend.
7. **On success:** stamps `last_sent_edition` and `last_featured_at` on the `currentSix` entries.

### Edition windowing

The `computeEditionWindows()` function (featuredRotation.ts:303) divides the queue into per-species windows:

- **Slots per species:** cat=3, dog=2, small=1 (total=6)
- **Offset formula:** `(slotsPerSpecies × weekIndex) % queueLength`
- **Selection:** `sliceWrapping(queue, offset, slotsPerSpecies)` — wraps around when the offset exceeds queue length

Each email shows three sections:
- **Currently Featured** (`currentSix`): `getWindowForWeek(queues, weekIndex - 1)` — last week's picks
- **Swap In Now** (`newSix`): `getWindowForWeek(queues, weekIndex)` — this week's picks
- **Coming Next Week** (`nextSix`): `getWindowForWeek(queues, weekIndex + 1)` — preview

### State table

```
featured_rotation_state (current values):
  id=1, anchor_instant=2026-07-08T20:00:00Z, last_sent_edition=1, last_sent_at=2026-07-15T20:00:01.204Z
```

The anchor sets when edition 0 begins. Editions increment by 1 per 7-day interval. The state cursor is a single integer — no per-animal or per-species cursor.

---

## 2. Today's "Unknown" Animal

**The animal is S20241035 (Starr), a cat.** [VERIFIED with SELECT + code trace]

### Evidence chain

Edition 1 fired today at 2026-07-15T20:00:01Z [VERIFIED from journalctl]:
```
Jul 15 20:00:01: [Email] Featured rotation email sent to Martha.underwood17@gmail.com, flgnynjai@gmail.com. ID: eb565d2b-...
Jul 15 20:00:01: [Featured Email] Edition 1 sent to Martha.underwood17@gmail.com, flgnynjai@gmail.com
```

Edition 1's **"Swap In Now"** section picked these 6:
| Slot | Species | Code | Queue Pos | Name in Email |
|------|---------|------|-----------|---------------|
| 1 | cat | R2024025 | 4 | Lucky |
| 2 | cat | A2024047 | 5 | Lupa |
| 3 | cat | **S20241035** | **6** | **(unknown)** |
| 4 | dog | A2024053 | 3 | Nanook |
| 5 | dog | A2024048 | 4 | Leo (Petey) |
| 6 | small | R2023065 | 2 | Butterscotch |

Calculation: cat offset = `3 × 1 % 21 = 3`, picks positions 4–6. S20241035 is position 6.

### Why it resolved to "(unknown)"

`readQueuesFromDb()` calls `fetchAnimals()` which queries the SM API for currently adoptable animals only (`ADOPTABLE===1`). S20241035 is **not in the SM API at all** — not adoptable, not unavailable, completely absent [VERIFIED: `GET /api/animals/S20241035` returns `"Animal not found"`, and `fetchAnimals({includeUnavailable: true})` also excludes it].

The name resolution line (featuredRotation.ts:397):
```typescript
name: nameMap.get(row.shelter_code) || '(unknown)',
```

Since S20241035 has no entry in the nameMap (built from live SM data), it defaults to `'(unknown)'`.

### Animal identity

```
animal_metadata for S20241035:
  name=Starr, species=Cat, breed=Domestic Short Hair, age=5 years 9 months
  sex=Female, FIV=negative, FeLV=negative
  updated_at=2026-07-07T16:50:29.764Z
```

Starr has a bio in `animal_bios` ("Meet Starr, a lovely short-haired tabby with a heart...") [VERIFIED]. She was a real adoptable cat last synced on Jul 7. She is now fully absent from the SM API — consistent with adoption followed by SM record removal.

---

## 3. Root Cause

**Verdict: (A) — an animal that left the adoptable set (adopted/removed from SM) while still sitting in `featured_rotation_queue`, which has no pruning mechanism.** [VERIFIED with code]

It is specifically scenario (A) from the hypothesis. The evidence:

1. S20241035 was seeded into `featured_rotation_queue` on 2026-06-26 (added_at) [VERIFIED with SELECT] when she was a qualifying long-stay cat (listed since 2024-10-10, well over the 45-day threshold).
2. Between the last sync (Jul 7) and today's email (Jul 15 20:00 UTC), she left the SM API entirely — adopted or removed.
3. At email generation time, `fetchAnimals()` returned only currently-adoptable animals. S20241035 was absent from that set. The nameMap had no entry for her. The fallback `'(unknown)'` triggered.
4. **The queue has no filter, no guard, and no prune** that checks whether a queued animal is still adoptable before including it in the edition window. The `computeEditionWindows()` function operates purely on queue position — it never consults SM status.

This is NOT (B). It's not a bad ID (S20241035 exists in animal_metadata with valid data), not a metadata gap (the metadata row is present), not a lookup bug (the code works as designed — it just has no adoptable-status filter), and not a never-existed animal.

---

## 4. Queue State — Non-Adoptable Entries

**8 of 76 queue entries (10.5%) are NOT currently adoptable in SM.** [VERIFIED with API comparison]

### By species

**Cats (3 of 21 = 14.3%):**

| Position | Code | Name | date_available | Notes |
|----------|------|------|----------------|-------|
| 6 | S20241035 | Starr | 2024-10-10 | Absent from SM API entirely |
| 11 | W2025068 | Dean | 2025-09-12 | Absent from SM API entirely |
| 20 | S2026177 | Stevie | 2026-03-21 | Absent from SM API entirely |

**Dogs (5 of 35 = 14.3%):**

| Position | Code | Name | date_available | Notes |
|----------|------|------|----------------|-------|
| 8 | A2024185 | Amari | 2024-10-21 | Absent from SM API entirely |
| 21 | S2026031 | Oreo | 2026-01-23 | Absent from SM API entirely |
| 24 | S2026079 | Nena | 2026-02-15 | Absent from SM API entirely |
| 29 | S2026132 | Muppett | 2026-03-07 | Absent from SM API entirely |
| 35 | S2026267 | Baki | 2026-04-20 | Absent from SM API entirely |

**Small animals (0 of 20 = 0%):** All 20 entries are still adoptable.

All 8 non-adoptable animals have valid `animal_metadata` rows and existing bios in `animal_bios`. All 8 are completely absent from the SM API (not just non-adoptable — gone). This is consistent with adopted animals whose SM records were subsequently purged. [VERIFIED]

---

## 5. Pruning Mechanism

**There is NO pruning mechanism. The queue is insert-only.** [VERIFIED with code]

- `grep -rn "DELETE.*featured_rotation_queue"` across all server source: **zero hits** [VERIFIED]
- No cron job, no hook on adoption, no scheduled maintenance removes entries
- `insertSeedQueues()` (featuredRotation.ts:241) is the only write path — it's a one-time seed guarded by `COUNT(*) > 0` (refuses if queue is non-empty)
- `runWeeklyFeaturedEmail()` (server.ts:13429) does one UPDATE (`last_featured_at`) — no DELETEs
- The `computeEditionWindows()` / `sliceWrapping()` / `getWindowForWeek()` functions operate on raw queue position with no adoptable-status filter

**There is also no filter at selection time.** The `readQueuesFromDb()` function reads ALL queue rows unconditionally, then enriches with names from the live API. The only place adoptable status matters is the name lookup — a missing animal gets `'(unknown)'` but is still included in the edition window and rendered in the email.

---

## 6. Next Sends — Upcoming "Unknown" Appearances

**Edition 2 (next week, Jul 22) is clean. Edition 3 (Jul 29) will have TWO unknowns.** [INFERRED from current queue state + edition math]

Projection of the next 10 editions where non-adoptable animals appear in the **"Swap In Now"** (newSix) section:

| Edition | Date (approx) | Unknowns in newSix | Animals |
|---------|---------------|-------------------|---------|
| 1 | Jul 15 (today) | 1 | cat S20241035 (Starr) |
| 3 | Jul 29 | 2 | cat W2025068 (Dean), dog A2024185 (Amari) |
| 6 | Aug 19 | 1 | cat S2026177 (Stevie) |
| 8 | Sep 2 | 1 | cat S20241035 (Starr) ← wraps around |
| 10 | Sep 16 | 2 | cat W2025068 (Dean), dog S2026031 (Oreo) |
| 11 | Sep 23 | 1 | dog S2026079 (Nena) |
| 13 | Oct 7 | 1 | cat S2026177 (Stevie) |
| 14 | Oct 14 | 1 | dog S2026132 (Muppett) |
| 15 | Oct 21 | 1 | cat S20241035 (Starr) ← wraps again |
| 17 | Nov 4 | 2 | cat W2025068 (Dean), dog S2026267 (Baki) |

The cat queue wraps every 7 editions (21 entries ÷ 3 slots). The dog queue wraps every ~17.5 editions (35 entries ÷ 2 slots). This means the 3 non-adoptable cats will each appear roughly every 7 weeks, and the 5 non-adoptable dogs will each appear roughly every 17–18 weeks.

**Additionally:** non-adoptable animals will also appear in the **"Coming Next Week"** preview section one edition before they appear in "Swap In Now", giving staff a confusing preview.

Note: This projection assumes no further adoptions remove animals from the SM API. Additional adoptions from the queue would increase the "(unknown)" rate.

---

## Summary

The Featured Six email is generated fresh each Wednesday at 4 PM ET from a static, never-pruned `featured_rotation_queue` using a position-based sliding window. Names are resolved at send time via a live SM API call. Today's "Unknown" is **Starr (S20241035)**, a cat who was adopted/removed from SM after being seeded into the queue — her name defaulted to "(unknown)" because she's no longer in the adoptable API response. **8 of 76 queue entries (10.5%) are non-adoptable**, and the next "(unknown)" email will fire in 2 weeks (Jul 29, edition 3) with two affected animals. No pruning, filtering, or adoptable-status check exists anywhere in the pipeline.

---

*Read-only diagnosis. No changes made. No queue entries modified.*
