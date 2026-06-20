# Preamble Wording Fix: No "Closest" for Soft-Unmet, No "Filter" Anywhere

**Model:** claude-sonnet-4-6 (Phase-2 temp 0.7, ranking temp 0.0)
**Endpoint:** POST /api/matcher/custom-search (real, live, 176-animal pool)
**Sample:** 4 queries — swim EN, swim ES, black+fun (hard-miss), strong
**Able to fail:** Before fix, soft-unmet queries got "closest matches" framing (wrong — no attribute proximity to rank by). After fix, model acknowledges the unmet trait and frames animals as meeting other interests. "filter"/"filtros" replaced everywhere.
**Proves:** (a) Soft-unmet EN/ES gets correct framing (acknowledges unmet, no "closest"). (b) Hard-miss case still allowed to say "closest" (real proximity). (c) No "filter"/"filtro" in any preamble or bio. (d) Strong query: soft-terms gate fires (pre-existing, not a regression).
**Does NOT prove:** (a) Whether the soft-terms gate SHOULD fire for "friendly" when it's likely satisfied — that's a separate over-fire issue, not this fix. (b) Whether "closest" would still appear in hard-miss cases (model chose not to use it, but the gate permits it).

---

## CHANGES

### Signal assembly code (server.ts)

**Line 4806:** `(filters relaxed to find candidates)` → `(search criteria relaxed to find candidates)`

**Line 4818-4822:** Split PREAMBLE GATE for hard-miss vs soft-only:
```
// Hard-miss or expansion: "closest" is accurate (real attribute proximity)
PREAMBLE GATE: write a general preamble noting these are the closest matches currently available. Include (845) 414-9700.

// Soft-only: no attribute proximity — acknowledge unmet, frame as meeting OTHER interests
PREAMBLE GATE: write a general preamble. Acknowledge the soft preference that cannot be confirmed,
then frame the animals as meeting the adopter's other interests (do NOT say "closest matches" —
there is no attribute proximity to rank by). Include (845) 414-9700.
```

**Line 4829:** `FILTERS APPLIED:` → `SEARCH CRITERIA:` (system-facing, belt-and-suspenders)

### Error messages (server.ts)

**Line 4437 (ES):** `esos filtros` → `lo que buscas`
**Line 4445 (EN):** `those filters` → `what you're looking for`

### Prompt templates

No changes needed — "closest" and "filter" were not in the prompt templates. The model was echoing instructions from the PREAMBLE GATE signal, which is now fixed.

---

## VERIFICATION

### TEST 1: SWIM (soft-unmet, EN) ✅

**Query:** "a cat that loves to swim"

Preamble: "Swimming is a pretty rare trait in cats, and we can't confirm any of our current cats have a particular affinity for water — that's something worth asking the foster caregivers about directly when you visit or call (845) 414-9700. That said, the three cats below have a lot going for them, and we think they're worth getting to know."

| Check | Result |
|-------|--------|
| No "closest" | ✅ |
| No "filter" | ✅ |
| Acknowledges swim | ✅ "Swimming is a pretty rare trait" |
| Frames as other interests | ✅ "have a lot going for them" |

### TEST 2: SWIM (soft-unmet, ES) ✅

**Query:** "un gato al que le encante nadar" (?lang=es)

Preamble: "Nos encantaría encontrar un gato nadador para ti, pero esa es una cualidad muy difícil de confirmar para cualquier gato — no es algo que podamos observar ni documentar fácilmente en el refugio. Si ese detalle es esencial, llámanos al (845) 414-9700 y el personal puede orientarte mejor. Mientras tanto, aquí hay tres gatos maravillosos que podrían sorprenderte."

| Check | Result |
|-------|--------|
| No "más cercano" | ✅ |
| No "filtro" | ✅ |
| Acknowledges nadar | ✅ "gato nadador" |
| Natural Spanish | ✅ |

### TEST 3: BLACK + FUN (hard-miss, partial match) ✅

**Query:** "a black cat that is fun"

Preamble: "You mentioned hoping for a fun black cat, and while we can't always verify a cat's exact personality from our search records alone, the caregivers who work with these three boys every day have plenty to say — give us a call at (845) 414-9700..."

| Check | Result |
|-------|--------|
| "closest" allowed | ✅ (model chose not to use it, also fine — gate permits it for hard-miss) |
| No "filter" | ✅ |

### TEST 4: STRONG ⚠️ (pre-existing over-fire, NOT a regression)

**Query:** "a friendly black cat"

Preamble fired: "You mentioned wanting a friendly cat — that's a quality we'd love to confirm..."

| Check | Result |
|-------|--------|
| Preamble | ⚠️ fires (because "friendly" is a soft term → hasPreferences=true → gate fires) |
| No "closest" | ✅ |
| No "filter" | ✅ |
| lowConfidence | ✅ false |

**This is pre-existing behavior.** The gate fires for ANY stated soft preference, even when it's likely satisfied. Fixing soft-term over-fire is a separate issue (the gate can't know whether "friendly" is satisfied without model judgment). This wording fix does not change the gate's firing logic — only the wording when it does fire. The preamble text is appropriately soft ("that's a quality we'd love to confirm") rather than falsely claiming "closest matches."

---

## COMPILE

- `tsc`: ✅ exit 0
- Service restart: ✅ healthy
- **NOT COMMITTED**
