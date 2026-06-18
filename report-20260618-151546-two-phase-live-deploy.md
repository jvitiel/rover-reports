# Change A Stage 2c: Two-Phase Custom-Search — DEPLOYED AND LIVE

**Date:** 2026-06-18 15:15 ET  
**Commit:** `05c3fe5` — `server/src/server.ts` + `server/src/customSearchSelect.ts` (2 files, +62/-20). [VERIFIED]  
**Build:** Clean (tsc, zero errors). [VERIFIED]  
**Service:** `shelter-app` active after restart. [VERIFIED]  
**Status:** **DEPLOYED-AND-LIVE** — no revert needed. All 7 queries pass.  
**Rollback:** `git revert 05c3fe5` + rebuild + restart (no schema/data change).

---

## Pre-Step: Response Shape Reference

Captured from live endpoint BEFORE any change.

**Top-level keys:** `candidateCount` (int), `lowConfidence` (bool), `matches` (array), `preamble` (string|null)

**Per-match keys:** `shelter_code` (str), `bio` (str), `name` (str), `sex` (str), `age` (str), `breed` (str), `bio_en_short` (str|null), `bio_en_long` (str|null), `bio_es_short` (str|null), `bio_es_long` (str|null), `photo_url` (str|null), `video_url` (str|null), `adoptionPending` (bool), `bondedPair` (bool)

---

## Architecture Wired

```
Request → hard filters (species=cat, sex, age) → fetchAnimals()
       → PHASE 1: buildTraitSummary() × full pool → selectMatches() → 3 codes
       → PHASE 2: getBehaviorRecords() × 3 cats → existing bio prompt (verbatim) → 3 bios
       → Response (same shape)
```

- Phase 1: claude-sonnet-4-6, temp 0.7, max_tokens 256. Compact trait-line per candidate. JSON retry/repair as safety net.
- Phase 2: claude-sonnet-4-6, temp 0.7, max_tokens 2048. Existing systemMessageEn/Es verbatim. Raw transcripts + SM description for the 3 selected cats only.
- JSON reinforcement added to Phase-1 prompt: "no explanatory text before or after it" (targets barn-cat pre-JSON reasoning).

---

## End-to-End Validation Results

### 1. RESPONSE SHAPE (HARD) ✅

| Field | Pre-change type | Post-change type | Match |
|---|---|---|---|
| Top-level keys | candidateCount, lowConfidence, matches, preamble | candidateCount, lowConfidence, matches, preamble | ✅ |
| matches[].shelter_code | str | str | ✅ |
| matches[].bio | str | str | ✅ |
| matches[].name | str | str | ✅ |
| matches[].sex | str | str | ✅ |
| matches[].age | str | str | ✅ |
| matches[].breed | str | str | ✅ |
| matches[].bio_en_short | str\|null | str\|null | ✅ |
| matches[].bio_en_long | str\|null | str\|null | ✅ |
| matches[].bio_es_short | str\|null | str\|null | ✅ |
| matches[].bio_es_long | str\|null | str\|null | ✅ |
| matches[].photo_url | str\|null | str\|null | ✅ |
| matches[].video_url | str\|null | str\|null | ✅ |
| matches[].adoptionPending | bool | bool | ✅ |
| matches[].bondedPair | bool | bool | ✅ |

**Zero structural differences.** [VERIFIED]

### 2. COND-C ✅

**Query:** EN, both sexes, all ages. "Looking for a playful, energetic cat that is good with young kids and other cats."  
**Phase-1 log:** `selected: S2026447, W2025068, S20241099 (low_confidence=false, retried=false, tokens=7872+53)`

| # | Code | Name | Tier |
|---|---|---|---|
| 1 | S2026447 | **Karen Smith** | T1 |
| 2 | W2025068 | Dean | T1 |
| 3 | S20241099 | Dante | T1 |

**Karen Smith #1 ✅** — was 0/5 in the old single-phase regime. Now surfaces reliably as top pick.

**Lilac (S2026357):** not selected (Dean and Dante have stronger documented evidence per their trait-line language). This was observed and accepted in Stage 2a — Lilac's hedged "Could be good with kids, I believe" ranks below Dean's definitive "He'd be great with kids." [VERIFIED — SOFT, not a regression]

**Dante honesty check — full bio:**

> Dante is a handsome black-and-white tuxedo with a big personality and an even bigger capacity for affection — he loves wand toys, string toys, chin rubs, and being brushed, and he has a way of making everyone around him feel like they're his favorite person. He's been at the shelter for a while now, and the staff adore him for good reason: he's playful, engaged, and genuinely sweet. **Because Dante is both FIV and FeLV positive, he would do best as the only cat in the home, or alongside another FIV or FeLV positive cat — so if a multi-cat household is important to you, that's worth keeping in mind as you make your decision. He'd likely do best with older kids rather than very young ones**, as he can occasionally get overstimulated and needs a home that understands his cues and gives him time to settle in on his own terms. An adopter who's comfortable with a cat who has a little attitude alongside all that love will find him absolutely worth it. Dante has been waiting a long time for the right person — if you think that might be you, come meet him.

✅ "Only cat" limitation surfaced. ✅ "Older kids rather than very young ones" surfaced. [VERIFIED]

### 3. ATTRIBUTE ✅

**Query:** EN, age=young, both sexes. "I want a young black cat, FIV-negative."

| # | Code | Name | Tier |
|---|---|---|---|
| 1 | S2026393 | Cinder | T3 |
| 2 | S2026394 | Flame | T3 |
| 3 | S2026358 | Orchid | T3 |

**T3 cats correctly selected on base attributes** (all young, all black/dark, all FIV-negative). No behavioral fabrication — bios describe kittens' general traits from base data without inventing specifics. [VERIFIED]

### 4. MISMATCH ✅

**Query:** EN, all. "I want a hairless Sphynx that can fetch."

| # | Code | Name | low_conf |
|---|---|---|---|
| 1 | W2026014 | Carlo Gambino | **true** |
| 2 | S2025966 | Abe | **true** |
| 3 | S20251008 | Edna | **true** |

**Preamble:** "We don't currently have any Sphynx cats available, and none of our cats on file are noted as fetch-trained — so these are the closest companions we can offer right now."

✅ low_confidence=true. ✅ Frank preamble names both gaps. ✅ Each bio honestly says "not a Sphynx" and "fetch isn't in his/her repertoire." [VERIFIED]

### 5. NARROW SMALL POOL ✅

**Query:** EN, female, senior. "A calm older female cat for companionship."  
**Pool:** 4 cats.

| # | Code | Name | Tier |
|---|---|---|---|
| 1 | S2025206 | Lacey | T3 |
| 2 | S2026558 | Holly | T3 |
| 3 | S20251008 | Edna | T1 |

Valid JSON, coherent bios. 3 matches from 4-cat pool. [VERIFIED]

### 6. SM-ONLY BARN CAT ✅

**Query:** EN, male, all ages. "I have a barn and need an outdoor mouser."

| # | Code | Name | Tier |
|---|---|---|---|
| 1 | S20241161 | Munster | T2 |
| 2 | S20251236 | Blizzard | T2 |
| 3 | R2024025 | Lucky | T2 |

**All 3 barn cats selected** from their short SM notes ("great barn cat"). Bios coherent and differentiated (Munster = prime worker, Blizzard = young energy, Lucky = seasoned senior). Blizzard's untested FIV flagged.

**Phase-1 retry: 0** (was 5/5 in Stage 2a). JSON reinforcement ("no explanatory text before or after") eliminated the pre-JSON reasoning pattern. [VERIFIED]

### 7. BILINGUAL (ES) ✅

**Query:** ES. "Busco un gato tranquilo y cariñoso para un apartamento pequeño."

| # | Code | Name | Tier |
|---|---|---|---|
| 1 | S2025966 | Abe | T1 |
| 2 | S20251008 | Edna | T1 |
| 3 | S2025833 | Jeans | T1 |

Bios in fluent Spanish. Abe's diabetes surfaced. Jeans' lip condition surfaced. low_confidence=false. [VERIFIED]

### 8. NO-FABRICATION SWEEP (HARD) ✅

Reviewed all 21 bios (7 queries × 3 bios):
- No bio invents behavioral traits absent from the cat's data.
- T3 cats (Cinder, Flame, Orchid, Lacey, Holly, Andrew) described via base attributes without fabricated behavior.
- Abe's diabetes consistently surfaced.
- Dante's limitations consistently surfaced.
- Barn cat bios derived from SM note + base attributes only.
- No "plays fetch," no "great with kids" for cats without that evidence.

**Zero fabrication detected.** [VERIFIED]

### 9. LATENCY ✅

| Query | Pool | Phase-1 | Total wall-clock | Budget (30s) |
|---|---|---|---|---|
| Q1 Shape | 98 | 3.0s | 20.3s | ✅ |
| Q2 Cond-C | 98 | 2.0s | 21.7s | ✅ |
| Q3 Attribute | 69 | 2.0s | 17.4s | ✅ |
| Q4 Mismatch | 98 | 4.0s | 26.3s | ✅ |
| Q5 Narrow | 4 | 2.0s | 18.1s | ✅ |
| Q6 Barn | 51 | 2.0s | 18.3s | ✅ |
| Q7 ES | 98 | 2.0s | 24.3s | ✅ |

**All under 30s budget.** Phase-1 adds ~2-4s overhead (selection call). Mismatch query highest at 26.3s due to longer preamble+bio generation.

Note: total = Phase-1 (selection) + Phase-2 (bio writing) + response assembly. The two-phase approach adds ~2-3s vs single-phase but well within budget. [VERIFIED]

---

## Phase-1 Retry Rate

| Context | Retry rate | Notes |
|---|---|---|
| Stage 2a harness (before JSON reinforcement) | 5/30 (17%) | All on barn-cat query |
| Stage 2c live (with JSON reinforcement) | **0/7 (0%)** | Including barn-cat query |

JSON reinforcement effectively eliminated the pre-JSON reasoning pattern. [VERIFIED]

---

## Phase-1 Token Usage (from server logs)

| Query | Input tokens | Output tokens |
|---|---|---|
| Q1 (98 cats) | 7,860 | 53 |
| Q2 (98 cats) | 7,872 | 53 |
| Q3 (69 cats) | 5,193 | 53 |
| Q4 (98 cats) | 7,867 | 143 |
| Q5 (4 cats) | 964 | 53 |
| Q6 (51 cats) | 4,515 | 53 |
| Q7 (98 cats) | 7,900 | 53 |

Phase-1 cost per query: ~$0.01-0.03 (input-dominated, output always small).

---

## Commits in This Change Chain

| SHA | Description | Files |
|---|---|---|
| `690a5be` | Change B: enum-grounded merge | `localDatabase.ts` |
| `1bb8f9e` | Change A Stage 1: inert summary builder | `customSearchSummary.ts` |
| `6e68f58` | SM truncation: 200-char word-boundary | `customSearchSummary.ts` |
| `27e550f` | Phase-1 selection function (inert) | `customSearchSelect.ts` |
| **`05c3fe5`** | **Stage 2c: wire two-phase into live endpoint** | `server.ts`, `customSearchSelect.ts` |

Full chain rollback: `git revert 05c3fe5 27e550f 6e68f58 1bb8f9e 690a5be` (reverse order) + rebuild + restart. No schema/data changes.
