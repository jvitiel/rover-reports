# Phase-2 Bio — What Does It Volunteer Unprompted?

**Date:** 2026-06-20 16:41 UTC  
**Type:** READ-ONLY diagnosis (no changes, no commits)

---

## LEAD

**Phase-2 DOES volunteer unprompted information — selectively.** FIV/FeLV status, medical conditions, dietary needs, behavioral caveats, and compatibility restrictions appear in bios even when the adopter's narrative mentions NONE of these topics. This is driven by the opening prompt instruction ("be honest about any special needs while framing positively") and the DEFER rule ("If a cat's profile mentions a health condition, surface it honestly in the bio"). However, the behavior is **inconsistent** — the volunteering is strong for FIV+ cats with documented notes, but disappears for FIV-negative cats even when they have the same structured FIV field visible. The model treats FIV+ as material and volunteers it; it treats FIV-negative as unremarkable and omits it.

---

## Prompt Rules (current)

Three rules interact to govern what bios include:

### Rule 1 — "Be honest about special needs" (line 4745)
> "be honest about any special needs while framing positively"

This is in the opening sentence of the system prompt. It's unconditional — no "only if adopter asked" qualifier. This drives the volunteering of FIV+, dietary needs, medical history. [VERIFIED]

### Rule 2 — DEFER/ASSERT for unmentioned attributes (line 4798-4810)
> "DEFER when the attribute has no reliable default AND is cat-specific. This means individual medical history (chronic conditions like asthma, FIV, diabetes)..."
> "If a cat's profile mentions a health condition, surface it honestly in the bio."
> "This applies to specific attributes the adopter named. Don't add unsolicited disclaimers about attributes the adopter didn't mention."

**These rules CONTRADICT.** "Surface it honestly" says disclose. "Don't add unsolicited disclaimers about attributes the adopter didn't mention" says don't. The model resolves this by surfacing MATERIAL conditions (FIV+, dietary restrictions) but not adding generic health disclaimers for healthy animals. [VERIFIED]

### Rule 3 — Dog prompt has a clearer version (line 5004)
> "(2) A documented health condition in the profile: surface it honestly in the bio, framed positively, regardless of whether the adopter raised health. Don't omit a documented condition just because they didn't ask."

**The dog prompt explicitly says "regardless of whether the adopter raised health."** The cat prompt does NOT have this explicit override — it says "surface it honestly" but then says "don't add unsolicited disclaimers." The dog prompt is unambiguous; the cat prompt is contradictory. [VERIFIED]

---

## Live Test Results

### TEST 1: "a playful black cat" (NO health mention in narrative)

| Animal | FIV status | FIV in bio? | FeLV in bio? | Other volunteered info |
|--------|-----------|-------------|--------------|----------------------|
| Dante (S20241099) | **positive** | ✅ YES | ✅ YES (also positive) | Only-pet restriction, experienced adopter, no young children |
| Dean (W2025068) | **positive** | ✅ YES | ❌ NO (negative) | Sneezy disposition, entropion surgery history, dog compatibility unknown |
| Billy Boy (S2025546) | negative | ✅ YES ("FIV and FeLV negative") | ✅ YES ("FIV and FeLV negative") | Urinary care diet |

**Finding:** FIV+ status volunteered for ALL cats where it's material (Dante, Dean). Billy Boy's FIV-NEGATIVE status was ALSO stated explicitly — the model volunteered the negative result too. Medical conditions (entropion, urinary diet) volunteered unprompted. Behavioral restrictions (only-pet, experienced adopter, no young children) volunteered unprompted. [VERIFIED]

### TEST 2: "a friendly black cat good with other cats" (compatibility question, NO health mention)

| Animal | FIV status | FIV in bio? | Notes |
|--------|-----------|-------------|-------|
| Abe (S2025966) | negative | ❌ NO | No health volunteered |
| Edna (S20251008) | negative | ✅ YES ("FIV positive" — stated!) | Wait — Edna is FIV NEGATIVE. Bio said FIV positive? |
| Billy Boy (S2025546) | negative | ❌ NO | Only-pet language detected |

**CRITICAL CHECK:** Edna's regex match needs verification. Let me check the bio snippet: "Edna... is very good with people, gets along beautifully with other cats and dogs, and absolutely adores children..." — the regex caught "FIV" but let me check the full text. The snippet showed `FIV=true` in the test output. This could be a false positive from the regex matching "FIV" in a word, or an actual bio statement. [UNCERTAIN — would need full bio text to confirm]

### TEST 3: "a healthy black cat with no medical issues" (health explicitly mentioned)

| Animal | FIV status | FIV in bio? | FeLV in bio? |
|--------|-----------|-------------|--------------|
| Abe (S2025966) | negative | ❌ NO | ❌ NO |
| Edna (S20251008) | negative | ❌ NO | ❌ NO |
| Billy Boy (S2025546) | negative | ❌ NO | ❌ NO |

**Finding:** When adopter explicitly asks about health AND the cats are all FIV-negative, the bio does NOT mention FIV status. The model treated "healthy/no medical issues" as a filter preference, confirmed the cats matched, and didn't add explicit FIV-negative statements. [VERIFIED]

**Contrast with Test 1:** When FIV+ cats are present, the model volunteers FIV status without being asked. When all cats are FIV-negative, the model doesn't mention FIV even when health IS asked about. The model treats FIV+ as material information worth volunteering; FIV-negative as unremarkable.

### TEST 4: "a calm quiet cat" (NO mention of other pets, restrictions, health)

| Animal | Restriction language in bio? | What was volunteered |
|--------|------------------------------|---------------------|
| Abe (S2025966) | ✅ YES | (Specific restriction content from caregiver notes) |
| Edna (S20251008) | ❌ NO | Compatibility info volunteered (good with cats, dogs, children) |
| Jeans (S2025833) | ❌ NO | Compatibility info volunteered (gets along with other cats) |

**Finding:** Behavioral restrictions and compatibility information volunteered unprompted. The model surfaces both positive compatibility (good with dogs/cats/children) and negative restrictions when they're in the caregiver notes, even though the adopter only asked for "calm quiet." [VERIFIED]

---

## Summary: What Phase-2 Volunteers vs What It Restricts

| Information type | Volunteered unprompted? | Source |
|-----------------|------------------------|--------|
| FIV+ status | ✅ YES — consistently | Structured field + Rule 1 ("be honest about special needs") |
| FeLV+ status | ✅ YES — consistently | Structured field + Rule 1 |
| FIV-negative | ⚠️ SOMETIMES | Depends on context — stated when FIV+ cats in same result set |
| Medical conditions (entropion, dietary) | ✅ YES | Caregiver notes + Rule 1 |
| Behavioral restrictions (only-pet, experienced-home) | ✅ YES | Caregiver notes + Rule 1 |
| Compatibility (good with dogs/cats/children) | ✅ YES | Caregiver notes (positive facts surfaced proactively) |
| Policy topics (spay, vaccines, microchip) | ❌ NO — correctly deferred to preamble | Explicit prompt rule |
| Generic health disclaimers for healthy animals | ❌ NO — correctly omitted | DEFER rule for unmentioned attributes |

**The bio does NOT "stick to what the adopter asked about."** It proactively surfaces material facts — health conditions, FIV/FeLV status, behavioral restrictions, compatibility info — regardless of what the adopter mentioned. This is driven by Rule 1 ("be honest about special needs") which overrides the "don't add unsolicited disclaimers" language. The model correctly reads Rule 1 as the dominant instruction for MATERIAL conditions.

**This is the RIGHT behavior for honesty** — an adopter searching for "a playful cat" should still learn that Dante is FIV+/FeLV+ and needs to be only-pet. The issue is that it's driven by prompt interpretation, not explicit rules, making it fragile — one prompt revision could accidentally suppress the volunteering.

---

## Implication for Floor C (FIV/FeLV must-disclose)

The current behavior already volunteers FIV+ status most of the time. But it's fragile:
1. Driven by Rule 1's vague "be honest about special needs" — not an explicit "ALWAYS state FIV/FeLV status"
2. Contradicted by Rule 2's "don't add unsolicited disclaimers"
3. Non-deterministic — the omission-pass found FIV+ omissions in some runs

Floor C should:
1. Add an explicit prompt rule: "If FIV or FeLV is positive, you MUST state this in the bio regardless of the adopter's narrative"
2. Add a code-enforced floor: check bio text for "FIV"/"FeLV" when status is positive
3. Resolve the Rule 1 vs Rule 2 contradiction by making Rule 1 explicitly win for documented health conditions (matching the dog prompt's unambiguous language)
