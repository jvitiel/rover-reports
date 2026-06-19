# Step 2: Blank-Animal Detection + Inert Flag Injection

**Date:** 2026-06-19 11:03 ET  
**Commit:** `5f7503c` — "Step 2: blank-animal detection + inert flag injection into Phase-2 payload (no bio rule yet)"  
**Status:** DEPLOYED  
**Diff stat:** `1 file changed, 17 insertions(+)`

---

## What Changed

A deterministic `isBlankAnimal()` function and a structured `DOCUMENTED BEHAVIORAL DATA: none|present` marker injected into the Phase-2 per-animal payload block. **No prompt rule references the marker yet** — bio output is unchanged. This step exists solely to verify flag accuracy before any behavior depends on it.

---

## Detection Logic

```typescript
const DESCRIPTION_SENTINELS = new Set(['', 'not specified', 'unknown', 'n/a', 'none specified', 'none']);

function isBlankAnimal(shelterCode: string, description: string | null | undefined): boolean {
  const records = getBehaviorRecords(shelterCode);
  if (records.length > 0) return false;           // has caregiver transcripts
  const desc = (description || '').trim().toLowerCase();
  return DESCRIPTION_SENTINELS.has(desc);          // empty or sentinel-only
}
```

**Location:** `server.ts`, inline inside the Phase-2 payload assembly block (~line 4606).

### Stock/Boilerplate Pattern Survey

Surveyed all 485 SM animals (162 available). Findings:

- **Zero sentinel descriptions** found in live data (`not specified`, `unknown`, `n/a`, `none specified` — none exist) [VERIFIED]
- **One duplicated description** found: `"Not meant to be a household pet, but would be a great barn cat."` (6× across all animals, 3× adoptable). This is **real signal** (placement restriction), NOT boilerplate — correctly treated as NOT blank [VERIFIED]
- **No generic "looking for a loving home" templates** exist in SM ANIMALCOMMENTS [VERIFIED]
- **All 20 SM-description-only animals** (0 behavior records + real SM text) have individually-written content about the specific animal [VERIFIED]

**Conservative design:** The sentinel list mirrors the existing `hasMeaningfulSMComment()` / `hasValue()` patterns already in the codebase. Any SM description that isn't empty or a known sentinel is treated as real content → animal is NOT blank. False positives (wrongly silencing a real bio) are impossible unless SM contains a description that exactly matches a sentinel string.

---

## Payload Injection

For each of the 3 selected animals in the Phase-2 block, after breed/age/sex/color (and FIV/FeLV for cats), a new line is injected:

```
DOCUMENTED BEHAVIORAL DATA: none     ← blank animal
DOCUMENTED BEHAVIORAL DATA: present  ← has records or real SM description
```

Both values are always injected (consistent). The marker appears before the caregiver transcripts and shelter notes sections.

---

## Flag Accuracy Results — 19/19 PASS

### True Blanks → flagged `none` (expect: true)

| Animal | Species | bn_count | desc_len | Result | Status |
|--------|---------|----------|----------|--------|--------|
| S2026314 Sky | Cat | 0 | 0 | true | PASS [VERIFIED] |
| S2026495 Andrew | Cat | 0 | 0 | true | PASS [VERIFIED] |
| S2026446 Eggo | Cat | 0 | 0 | true | PASS [VERIFIED] |
| S2023445 Grumpy McGee | Cat | 0 | 0 | true | PASS [VERIFIED] |
| S2026267 Baki | Dog | 0 | 0 | true | PASS [VERIFIED] |
| A2026092 Snowy | Dog | 0 | 0 | true | PASS [VERIFIED] |

### Tier-1 Documented → flagged `present` (expect: false)

| Animal | Species | bn_count | desc_len | Result | Status |
|--------|---------|----------|----------|--------|--------|
| A2025088 Achilles | Dog | 1 | 511 | false | PASS [VERIFIED] |
| A2025114 Rex | Dog | 1 | 0 | false | PASS [VERIFIED] |
| W2025068 Dean | Cat | 4 | 774 | false | PASS [VERIFIED] |
| S2026047 Buckley | Cat | 2 | 867 | false | PASS [VERIFIED] |
| A2024185 Amari | Dog | 1 | 0 | false | PASS [VERIFIED] |

### Tier-2 SM-Only → flagged `present` (critical false-positive check)

| Animal | Species | bn_count | desc_len | Content type | Result | Status |
|--------|---------|----------|----------|--------------|--------|--------|
| A2026050 Bolt | Dog | 0 | 577 | Detailed personality bio | false | PASS [VERIFIED] |
| A2023267 Cookie | Dog | 0 | 930 | Longest-resident profile | false | PASS [VERIFIED] |
| S2023297 Iron | Cat | 0 | 270 | Foster/stress notes | false | PASS [VERIFIED] |
| S2024694 Isis | Dog | 0 | 770 | Personality + placement | false | PASS [VERIFIED] |
| A2025100 Jasper | Dog | 0 | 547 | Personality + health | false | PASS [VERIFIED] |
| S2025310 Jax | Dog | 0 | 504 | Training + commands | false | PASS [VERIFIED] |

### Barn Cats → flagged `present` (stock text but real signal)

| Animal | Species | bn_count | desc_len | Description | Result | Status |
|--------|---------|----------|----------|-------------|--------|--------|
| S20251236 Blizzard | Cat | 0 | 63 | "Not meant to be a household pet..." | false | PASS [VERIFIED] |
| R2024025 Lucky | Cat | 0 | 63 | "Not meant to be a household pet..." | false | PASS [VERIFIED] |

**Zero false positives. Zero missed blanks.**

---

## Rendered Payload Block — Blank Animal (Sky)

Captured from `matcher_audit.input_profiles` for audit row `1feb00eb` (cat query at 15:02 UTC):

```
SHELTER_CODE: S2026314
Name: Sky
Species: Cat
Breed: Domestic Short Hair
Age: 2 years 1 month.
Sex: Female
Color: Calico
FIV: negative
FeLV: negative
DOCUMENTED BEHAVIORAL DATA: none
```

No caregiver transcripts follow. No shelter notes follow. The marker is the last structured line before the empty payload body. [VERIFIED from audit DB]

For comparison, Starr (S20241035) in the same query:

```
SHELTER_CODE: S20241035
Name: Starr
Species: Cat
...
DOCUMENTED BEHAVIORAL DATA: present

Caregiver transcripts (most recent first):
--- Mia, 2026-04-25 ---
[detailed transcript follows]
```

---

## Bio Output Unchanged

- **Cat query:** 3 bios returned (Starr, Stevie, Sky), all well-formed, FIV/FeLV present, low_confidence=false [VERIFIED]
- **Dog query:** 3 bios returned (Rex, Achilles, Amari), all well-formed, low_confidence=false [VERIFIED]
- **Sky (blank cat) still received fabricated bio** — expected, since no prompt rule acts on the flag yet. This confirms the marker is truly inert. [VERIFIED]
- **Response shape identical** to pre-deploy [VERIFIED]

---

## Population Counts (current adoptable pool)

| Category | Count | Description |
|----------|-------|-------------|
| True blanks (0 records, empty/sentinel desc) | ~91 | Empty ANIMALCOMMENTS, no caregiver data |
| SM-only Tier 2 (0 records, real SM desc) | ~20 | Real individually-written SM descriptions |
| Barn cats (0 records, stock placement text) | 3 | "Not meant to be a household pet" — real signal |
| Tier 1 documented (≥1 behavior record) | ~48 | Has caregiver transcripts (with or without SM desc) |

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert 5f7503c && cd server && npm run build && sudo systemctl restart shelter-app
```
