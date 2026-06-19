# Item 1: Dog Selection Audit (read-only) + Item 2: Species Pill CSS Fix

**Date:** 2026-06-18 22:23 ET  
**Production modified:** Item 1: NO. Item 2: YES (commit `b66e201`, 1 CSS file, +3/-2 lines). [VERIFIED]

---

## ITEM 1: Dog Selection Audit — "I'm looking for a dog that is fun"

### Query

```json
{"species":"dog","sex":["male"],"ageGroup":["adult"],"narrative":"I'm looking for a dog that is fun"}
```

**Pool:** 14 adult male dogs [VERIFIED]  
**Returned:** 3  
**low_confidence:** false

### Returned Dogs (all Tier 1)

| # | Dog | Breed | Age | Data Tier | Key "fun" signal |
|---|-----|-------|-----|-----------|-----------------|
| 1 | **Mikey** (S2026560) | Terrier/Mix | 2yr | **Tier 1** (behavior_notes) | "High energy, wants to please everybody," "gives kisses, very sweet," "Very good greeting everybody" |
| 2 | **Achilles** (A2025088) | Mixed Breed | 3yr | **Tier 1** (behavior_notes) | "Very energetic," bright eyes, "goofy," crate trained, housebroken, basic commands |
| 3 | **Rex** (A2025114) | Terrier/Mix | ~6yr | **Tier 1** (behavior_notes) | "High energy, loves fetch and long walks," "enjoys hikes," great with dogs and people |

**All three returned dogs are Tier 1** — full behavior_notes profiles with documented energy/personality traits. All three bios drew from rich source data. [VERIFIED]

**Bio lengths:** Mikey 1005, Achilles 865, Rex 902. No anomalously short bio. [VERIFIED]

**Note:** The run did NOT return Spooky or Milo — those may have appeared in a prior run. The current model run selected three well-documented, high-energy, people-oriented dogs, all defensible for "fun." [VERIFIED]

---

### Rejected Adult Males (11 dogs)

| Dog | Data Tier | "Fun"/energy signal | Better pick than any returned? |
|-----|-----------|-------------------|-------------------------------|
| **Scottie** (S2025131) | **Tier 1** | High energy, "loves to play fetch," funny underbite | **No** — goodWithKids: **"no"**, "difficult to meet people, requires days of ignore period." Fun but antisocial barrier makes him a harder sell for a generic "fun" ask. |
| Kobe (S2025708) | Tier 2 | "playful, and curious pup with boundless energy and a love for adventure," "bring endless fun" | Borderline — strong fun signal but Tier 2 only (SM description, no behavior_notes). Model would have seen the SM desc in the Phase-1 summary. Reasonable near-miss but less documented than the 3 picks. |
| Nanook (A2024053) | Tier 2 | "full of energy, loves to play, goofy antics," "fun, quirky personality" | **No** — "best as only pet with no other dogs or cats," higher-friction placement. Strong fun signal but compatibility limitation. |
| Ryder (A2025018) | Tier 2 | "playful spirit," "higher-energy," professional training, "Social, confident, and playful" | Borderline — excellent fun signal but Tier 2. Also a "special application" dog per SM desc. |
| Duke (A2025233) | Tier 2 | "playful and always ready for an adventure" but also "needs training work" | **No** — mixed signal, training caveat. |
| Jasper (A2025100) | Tier 2 | "perfect balance of energy and chill," one eye makes him "adorable" | More "chill" than "fun." Weaker match for the query axis. |
| Milo (A2026036) | Tier 2 | "just the right amount of energy," "leisurely walk" companion | **No** — explicitly low-energy framing. Opposite of "fun." |
| Baki (S2026267) | **Tier 3** | Zero signal (empty SM desc, no behavior_notes) | No |
| Snowy (A2026092) | **Tier 3** | Zero signal | No |
| Spooky (A2023030) | **Tier 3** | Zero signal | No |
| Spooky Chi Mix (S2025639) | **Tier 3** | Zero signal | No |

---

### THE KEY QUESTION

**Was there a rejected adult-male dog with a RICHER profile and documented "fun" signal that should have taken a slot?**

**No.** The only rejected Tier 1 dog is **Scottie**, who has strong fun/energy signal ("loves to play fetch," funny underbite) but is **goodWithKids: "no"** and **"difficult to meet people... requires a few days of ignore period."** That antisocial barrier is a legitimate reason to rank him below three dogs with documented people-friendliness (Mikey: "gives kisses, greets everybody"; Achilles: "goofy, lovable"; Rex: "loves all people"). [VERIFIED]

The closest Tier 2 near-misses are **Kobe** ("boundless energy, love for adventure, bring endless fun") and **Ryder** ("playful spirit, confident"). Both have strong SM descriptions but no behavior_notes — meaning their Phase-1 compact trait summaries were thinner (SM-desc-only summaries are truncated to 200 chars vs full structured fields for Tier 1 dogs). The model correctly weighted dogs with richer, structured behavioral evidence higher. [INFERRED]

### Bottom Line

**Case (a): honest, defensible selection.** All three picks are Tier 1 with documented fun/energy/people traits. No thin-profile dog was selected over a richer alternative. The only rejected Tier 1 dog (Scottie) has a legitimate disqualifier (antisocial with people and kids). The Tier 2 near-misses (Kobe, Ryder) have strong SM descriptions but less structured evidence — the model's preference for documented profiles is the designed behavior of the two-phase system. [VERIFIED]

---

## ITEM 2: Species Pill CSS Fix — DEPLOYED

### Problem

Stage 4 converted species inputs from checkboxes to radios. The existing CSS only hid `input[type="checkbox"]` inside `.pill-label`, so the native radio dot was visible, breaking the clean pill aesthetic.

### Fix

Extended the existing visually-hidden input rule to include radio inputs:

```diff
-/* Hide native checkbox visually but keep accessible */
-.pill-label input[type="checkbox"] {
+/* Hide native checkbox/radio visually but keep accessible */
+.pill-label input[type="checkbox"],
+.pill-label input[type="radio"] {
   position: absolute;
   opacity: 0;
   width: 0;
   height: 0;
   pointer-events: none;
 }
```

The selected-state styling (`.pill-label:has(input:checked)`) already uses the type-agnostic `input:checked` selector — it covers both checkboxes and radios without modification. [VERIFIED]

### Verification

- **Radio dot hidden:** CSS serves `opacity: 0; width: 0; height: 0` for both checkbox and radio inputs inside `.pill-label` [VERIFIED — curl confirmed served CSS]
- **Selected state matches sex/age pills:** `.pill-label:has(input:checked)` applies the same orange border + background to selected species pill [VERIFIED — same selector, type-agnostic]
- **Small Animal disabled:** `.pill-disabled` class + `disabled` attribute still present, renders greyed-out [VERIFIED]
- **Cat default-selected:** `<input type="radio" name="species" value="cat" checked>` [VERIFIED]
- **Dog selectable:** No `disabled` attribute on dog radio [VERIFIED]
- **Dog search works:** POST with `species:"dog"` returns 3 dog matches [VERIFIED — Mikey, Rex, Scottie returned]
- **Only 1 file changed:** `git status` shows only `custom-search/styles.css` [VERIFIED]

### Rollback

```bash
cd /home/shelter/shelter-apps && git revert b66e201
```

---

**Commit:** `b66e201` — "Species pills: radio behavior, hide native dot, match filter-button style."  
**Files:** 1 (custom-search/styles.css), +3/-2 lines.
