# Juno SM Auto-Gen Debug — Did It Fire?

**Date:** 2026-06-25  
**Animal:** Juno (Dog) — **A2025138**

---

## 1. Logs

```
Jun 25 23:29:45 GET /api/bio/A2025138                           ← first expand-fetch
Jun 25 23:29:50 GET /api/bio/A2025138                           ← poll re-fetch (5s later)
Jun 25 23:29:50 [sm-auto-gen] expand-triggered draft for A2025138 (source: sm_generate)  ← generation COMPLETED
```

**Verdict: FIRED AND SUCCEEDED.** The `[sm-auto-gen] expand-triggered draft` log confirms `generateBioDraftForAnimal` completed successfully. No error log.

---

## 2. The 4 Clauses — All Passed ✅

| Clause | Check | Juno's value | Result |
|---|---|---|---|
| 1. SM comment | `hasMeaningfulSMComment(description)` | `"Meet Juno, a delightful bundle of energy. Despite her shy nature, Juno's big ears perk up quickly when meeting new friends. Juno's sweet demeanor makes her a joy to be around, whether it's a game of fetch, a jog around the block or a quiet evening at home. She is agile and really benefits from the structure and engagement of training! Juno is just as much brains as she is looks. Adopting Juno means gaining a faithful companion and a snuggle buddy!"` | ✅ true |
| 2. No profile | `getBehaviorNotesCount('A2025138') === 0` | `0` | ✅ true (no profile) |
| 3. No real draft | `hasRealDraft` — no prior `animal_bio_drafts` row | No row existed before generation | ✅ false (no real draft → passes) |
| 4. Generic bio | `isGenericSource(bio.lastSource)` | `generic_adult` | ✅ true (generic) |

All 4 clauses passed → `shouldAutoGen = true` → generation fired.

---

## 3. The Draft Now Exists

After generation completed:

```
shelter_code: A2025138
source_long: from_sm
source_short: from_sm
promoted_long: 0  (Pending Draft)
promoted_short: 0 (Pending Draft)
bio_en_long: 795 chars
bio_en_short: 250 chars
```

The AI bio (from_sm) is written. The `from_sm` source means the source badges will show "Derived from SM Comment."

---

## 4. Why John Didn't See It

The generation took ~5 seconds (23:29:45 → 23:29:50). The poll timeline:

1. **23:29:45** — First expand-fetch → server fires generation → returns `generating: true` → panel renders generic → poll starts
2. **23:29:50** — Poll attempt 1 → re-fetches → generation completes at the same moment → the GET may have read the DB before the draft was committed, returning `generating: true` with no draft yet → poll schedules attempt 2
3. **~23:29:55** — Poll attempt 2 would have fired, but no further GET logged → **John likely collapsed the panel before attempt 2 ran**, so the collapse guard (`!card.classList.contains('expanded')`) stopped the poll

The self-update poll was 1 re-fetch short of rendering the draft. The generation completed successfully, but the timing was tight — the draft landed at the same moment as the first poll, and the second poll was stopped by a collapse.

---

## 5. Endpoint + Code Match

- The dashboard sent `GET /api/bio/A2025138` — correct shelter_code ✅
- Matches the DB code (`animal_bios.shelter_code = A2025138`) ✅
- No `getShelterCodeForBio` mismatch

---

## 6. What Happens Now

If John expands Juno's panel again:
- `loadBioForAnimal('A2025138', true)` → `GET /api/bio/A2025138`
- Server reads: `draft.sourceLong = 'from_sm'` → `hasRealDraft = true` → `shouldAutoGen = false` → `generating: false`
- Response includes the `from_sm` draft → bioCache updated → panel renders the AI bio with "Derived from SM Comment" source badge + "Pending Draft" status badge
- No poll (generating is false)
- No re-generation (predicate permanently false)

**Juno's AI bio is ready.** One more expand will show it.

---

*End of debug.*
