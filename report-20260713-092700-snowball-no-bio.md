# Snowball (S2026596) — No Generic Bio Diagnosis

**Date:** 2026-07-13 09:27 ET (13:27 UTC)
**Type:** Read-only diagnosis
**Status:** RESOLVED — bio auto-generated at 13:30 UTC today during this investigation

---

## 1. Snowball's Record

| Field | Value | Source |
|-------|-------|--------|
| shelter_code | S2026596 | [VERIFIED] animal_metadata SELECT |
| name | Snowball | [VERIFIED] animal_metadata + SM API |
| species | Cat | [VERIFIED] |
| breed | Domestic Short Hair | [VERIFIED] SM API |
| sex | Male | [VERIFIED] |
| age | 10 weeks. | [VERIFIED] animal_metadata |
| date_of_birth | 2026-05-02T00:00:00 | [VERIFIED] SM API (animal_metadata.date_of_birth is empty — this column isn't reliably synced) |
| age in days | ~72 days (as of Jul 13) | [VERIFIED] calculated from DOB |
| intake_date | 2026-06-06T00:00:00 | [VERIFIED] SM API |
| adoptable | Yes (ADOPTABLE=1, isAvailable=true) | [VERIFIED] SM API |
| available_for_adoption | 2026-07-12T18:21:14.268846 | [VERIFIED] SM API DATEAVAILABLEFORADOPTION |
| adoption_pending | 0 | [VERIFIED] animal_metadata SELECT |
| bonded_pair | 0 | [VERIFIED] animal_metadata SELECT |

Snowball IS adoptable and visible on the website. [VERIFIED]

---

## 2. Bio Row Status (Before Today's Job Run)

- **animal_bios:** No row for S2026596 [VERIFIED] — SELECT returned empty
- **animal_bio_drafts:** No row for S2026596 [VERIFIED] — SELECT returned empty
- **behavior_notes:** No row for S2026596 [VERIFIED] — SELECT returned empty

**UPDATE:** The daily job ran at 13:30 UTC today (during this investigation) and created a bio:

| Field | Value |
|-------|-------|
| last_source | generic |
| status_long | approved |
| status_short | approved |
| generated_at | 2026-07-13T13:30:00.013Z |
| bio_preview | "Meet Snowball! This adorable kitten is so young that we're still getting to know..." |

---

## 3. Generic Bio Job — Selection Criteria

**Schedule:** Daily at 9:30 AM ET (13:30 UTC), via `setTimeout` + `setInterval` in `scheduleGenericBioJob()` (server.ts:13283–13302).

**Three passes per run:**

### Pass 1 — Youth generics (`findGenericBioCandidates`, server.ts:13022)
Selection criteria (all must pass):
1. **Adoptable:** `fetchAnimals({ includeUnavailable: false })` — only animals with SM `ADOPTABLE=1`
2. **Age ≤ 84 days:** `ageInDays(animal.dateOfBirth)` must be non-null AND ≤ 84 (12 weeks)
3. **No behavior_notes:** `getBehaviorNotes(animal.shelterCode)` must return falsy
4. **No existing animal_bios row:** `getAnimalBio(animal.shelterCode)` must return falsy

### Pass 2 — Aged-out upgrades (`findAgedOutGenerics`, server.ts:13553)
Only targets animals that already HAVE a `generic` source bio but aged past 84 days. Not relevant here.

### Pass 3 — Adult intake (`findAdultIntakeCandidates`, server.ts:13743)
Requires `ageInDays > 84`. Not relevant for a 72-day-old kitten.

### Key query (Pass 1, the relevant path):
```typescript
const GENERIC_BIO_MAX_AGE_DAYS = 84; // 12 weeks

async function findGenericBioCandidates() {
  const animals = await fetchAnimals({ includeUnavailable: false }); // adoptable only
  for (const animal of animals) {
    const ageFromDobDays = ageInDays(animal.dateOfBirth);
    if (ageFromDobDays === null || ageFromDobDays > GENERIC_BIO_MAX_AGE_DAYS) continue;
    const notes = getBehaviorNotes(animal.shelterCode);
    if (notes) continue;
    const existingBio = getAnimalBio(animal.shelterCode);
    if (existingBio) continue;
    candidates.push(...);
  }
}
```

---

## 4. Why Snowball Was Skipped — THE ANSWER

**Snowball was NOT adoptable when the job last ran.** [VERIFIED]

The critical evidence is the SM API's `DATEAVAILABLEFORADOPTION` field:

| Animal | DATEAVAILABLEFORADOPTION | Job run time (Jul 12) | Result |
|--------|--------------------------|----------------------|--------|
| Casper (S2026594) | 2026-07-12T00:21:11.529674 | 2026-07-12T13:30:00 | ✅ Available 13h before job → got bio |
| Ghost (S2026593) | 2026-07-12T00:21:11.472832 | 2026-07-12T13:30:00 | ✅ Available 13h before job → got bio |
| Ivory (S2026595) | 2026-07-12T00:21:11.519622 | 2026-07-12T13:30:00 | ✅ Available 13h before job → got bio |
| **Snowball (S2026596)** | **2026-07-12T18:21:14.268846** | 2026-07-12T13:30:00 | ❌ **Not available until 4h 51m AFTER job** |

All four kittens are from the same litter (DOB 2026-05-02, intake 2026-06-06). Three were made adoptable at 00:21 UTC on July 12. Snowball was made adoptable at 18:21 UTC — **4 hours and 51 minutes after** the daily bio job ran.

The job's first filter (`fetchAnimals({ includeUnavailable: false })`) excluded Snowball because SM's `ADOPTABLE` flag wasn't set yet. This is exclusion reason **(f): the job hadn't run since he became adoptable.**

No other exclusion criteria apply:
- (a) Status/adoptable: he IS adoptable now, just wasn't at job time ✓ explains it
- (b) DOB 2026-05-02 = ~72 days, well under 84-day limit ✓ passes
- (c) No bio row exists in any state ✓ passes
- (d) Cat species — siblings are cats and got bios ✓ passes  
- (e) No error logged for Snowball ✓ passes

---

## 5. Has the Job Run Since He Became Adoptable?

**Yes — it ran TODAY at 13:30:00 UTC (3 minutes before this report was written).**

```
Jul 13 13:30:00 [Generic Bio] Daily job running
Jul 13 13:30:00 [Generic Bio] Published 1 youth generic bios: Snowball (S2026596)
```

Snowball now has an approved generic bio in `animal_bios`. The issue is self-resolved as of today's scheduled run.

### Previous run (Jul 12):
```
Jul 12 13:30:00 [Generic Bio] Published 6 youth generic bios: Casper (S2026594), Ghost (S2026593), 
  Ivory (S2026595), Pawla (S2026682), Pawlie (S2026683), Tiana (S2026702)
```

Snowball absent from this list — confirmed skipped because not yet adoptable.

---

## 6. Website Bio-Fetch Path

The website API (`GET /api/animals`, server.ts:~1017) uses `resolveBioText()` (server.ts:2832) which falls through:

1. **Approved bio in `animal_bios`** → use it (both long and short, EN and ES)
2. **SM description** (`ANIMALCOMMENTS`) → use as fallback
3. **Stock placeholder** → `"To meet Snowball, please visit Four Legs Good Animal Rescue."`

When Snowball had no bio row and no SM description, the website showed the stock placeholder — not blank, but a generic one-liner. Now that the generic bio was published today, the resolved bio will show the full youth generic text.

---

## Summary

Snowball (S2026596) was skipped by the daily generic bio job on July 12 because he was made adoptable in Shelter Manager at 18:21 UTC — nearly 5 hours after the job's 13:30 UTC run. His three littermates (Casper, Ghost, Ivory) were made adoptable at 00:21 UTC the same day, 13 hours before the job, and got bios. This is normal first-cycle timing — the job runs once daily, and any animal made adoptable after it runs waits until the next day. Snowball's bio was auto-generated today (Jul 13) at 13:30 UTC and is now live.
