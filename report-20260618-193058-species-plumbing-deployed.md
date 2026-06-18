# Species Plumbing DEPLOYED — Cat-Only Enabled, Cat Byte-Identical

**Date:** 2026-06-18 19:30 ET  
**Commit:** `e4f50bf`  
**Production modified:** YES. 3 files changed (+84/-31). [VERIFIED]  
**Status:** DEPLOYED

---

## Changes Implemented

| Change | File(s) | Description |
|---|---|---|
| 1. Species constants | server.ts | `VALID_SPECIES`, `ENABLED_SPECIES`, `SPECIES_FILTER`, `SPECIES_LABEL`, `SPECIES_NOUN` maps |
| 2. Parse + validate | server.ts | Destructure `species` from req.body; default `'cat'`; invalid→400; valid-but-disabled→400 "not yet available" |
| 3. Pool filter | server.ts | `SPECIES_FILTER[speciesLower]` replaces hardcoded `species==='cat'` |
| 4. hard_filters (4 sites) | server.ts + localDatabase.ts | Type, default, assignment, interface — all carry `species: string` |
| 5. User message params | server.ts + customSearchSelect.ts | `CATS AVAILABLE` → `${SPECIES_LABEL}`, `Species: Cat` → `Species: ${animal.species}` |
| 6. Phase-1 prompt nouns | customSearchSelect.ts | 10 `cat`/`cats` → `${speciesNoun.singular}`/`${speciesNoun.plural}` |
| 7. FIV/FeLV conditional | server.ts + customSearchSelect.ts | Phase-2 FIV/FeLV lines + Phase-1 candidate FIV/FeLV: emitted only when `speciesLower==='cat'` |
| 8. Error strings | server.ts | `"No cats match"` → `"No ${SPECIES_NOUN[speciesLower].plural} match"` (EN+ES+audit) |

**Phase-2 bio system prompt: UNTOUCHED.** Both `systemMessageEn` and `systemMessageEs` are the existing cat prompts, unchanged. Dog/small-animal prompts are Stage 3. [VERIFIED — `git diff` shows zero lines touching systemMessageEn/Es]

---

## Verification: Cat Byte-Identity (PASS)

### Rendered-prompt equivalence

Pre-change and post-change prompts were captured and diffed:

| Prompt | Diff result | Status |
|---|---|---|
| Phase-1 system prompt (EN, default) | **empty** | ✅ Byte-identical |
| Phase-1 system prompt (EN, explicit cat noun) | **empty** | ✅ Byte-identical |
| Phase-1 user message (default) | **empty** | ✅ Byte-identical |
| Phase-1 user message (explicit cat params) | **empty** | ✅ Byte-identical |
| Phase-2 system prompt (EN) | **not diffed — source unchanged** | ✅ Unchanged |
| Phase-2 system prompt (ES) | **not diffed — source unchanged** | ✅ Unchanged |
| Phase-2 user message | **renders identical** — see below | ✅ Identical |

[VERIFIED — `diff /tmp/pre-*.txt /tmp/post-*.txt` returned empty for all four Phase-1 prompts]

### Phase-2 user message identity

Three parameterized elements, all cat-identical:
- `Species: ${animal.species}` → cat animals have `species: 'Cat'` from SM API → renders `Species: Cat` ✅ [VERIFIED]
- `${SPECIES_LABEL['cat']} AVAILABLE` → `'CATS' AVAILABLE` → renders `CATS AVAILABLE` ✅ [VERIFIED]
- FIV/FeLV conditional: `speciesLower === 'cat'` → true → lines emitted ✅ [VERIFIED — audit input_profiles shows `FIV: negative`, `FeLV: negative`]

### Cat pool membership

Old hardcoded filter (`species === 'cat'`) and new `SPECIES_FILTER['cat']` produce identical results:
- Old count: **96** [VERIFIED]
- New count: **96** [VERIFIED]
- Identical membership (same codes, same order): **true** [VERIFIED]

---

## Verification: Species Gates

| Test | Expected | Actual | Status |
|---|---|---|---|
| `species: "dog"` | 400 `"dog search is not yet available"` | ✅ Exact match | [VERIFIED] |
| `species: "small_animal"` | 400 `"small_animal search is not yet available"` | ✅ Exact match | [VERIFIED] |
| `species: "hamster"` | 400 `"species must be one of: cat, dog, small_animal"` | ✅ Exact match | [VERIFIED] |
| `species` omitted | Default to `'cat'`, proceed | ✅ 200 with 3 matches | [VERIFIED] |

---

## Verification: hard_filters

Most recent audit row:
```json
{"species":"cat","sex":["male"],"ageGroup":["adult"]}
```

Four-site consistency:
- **Type** (server.ts ~4352): `{ species: string; sex: string[]; ageGroup: string[] }` ✅ [VERIFIED]
- **Default** (server.ts ~4371): `{ species: 'cat', sex: [], ageGroup: [] }` ✅ [VERIFIED]
- **Assignment** (server.ts ~4458): `{ species: speciesLower, sex: sexLower, ageGroup: ageLower }` ✅ [VERIFIED]
- **Interface** (localDatabase.ts:5025): `{ species: string; sex: string[]; ageGroup: string[] }` ✅ [VERIFIED]

No DB migration needed — species is a new key in the existing `hard_filters` JSON column. Historical rows lack it (forward-only, correct). [VERIFIED]

---

## FIV/FeLV Conditional + buildTraitSummary Finding

**buildTraitSummary (`customSearchSummary.ts`) does NOT include FIV/FeLV.** The only mention is a code comment at line 131: "age, sex, color, FIV/FeLV) are assembled separately by the endpoint." The trait line contains only behavioral data (energy, kids, cats, dogs). [VERIFIED — grep returned zero functional references]

FIV/FeLV appears in two places:
1. **Phase-1 candidate line** (customSearchSelect.ts `buildUserMessage`): `| FIV: ${animal.fivStatus} | FeLV: ${animal.felvStatus}` — now conditional on `includeFivFelv !== false` (default true, set false for non-cat). For cat: still emitted. [VERIFIED]
2. **Phase-2 per-animal profile** (server.ts ~4575-4576): `FIV: ${animal.fivStatus}` / `FeLV: ${animal.felvStatus}` — now conditional on `speciesLower === 'cat'`. For cat: still emitted. [VERIFIED]

Phase-1 and Phase-2 agree for cat (both emit) and will agree for non-cat (both omit). [VERIFIED]

---

## Files Changed

```
server/src/server.ts           | 70 +++++++++++++++++++++++++++++-----------
server/src/customSearchSelect.ts | 30 ++++++++++++------
server/src/localDatabase.ts    |  2 +-
3 files changed, 84 insertions(+), 31 deletions(-)
```

No client files changed:
```
$ git status --short
(empty after commit)
```
[VERIFIED]

---

## What ENABLED_SPECIES Flip Will Do (Stage 3 preview)

To enable dogs, change one line:
```typescript
const ENABLED_SPECIES = ['cat'];
// →
const ENABLED_SPECIES = ['cat', 'dog'];
```

Plus: add dog-specific Phase-2 bio prompt (the new template). The Phase-1 selection prompt already supports dogs via `speciesNoun: { singular: 'dog', plural: 'dogs' }`. The species filter, validation, audit, user messages, and FIV/FeLV conditional are all already wired.

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert e4f50bf
cd server && npm run build && sudo -n systemctl restart shelter-app
```
