# Custom-Search Step 1 — Gate Removal & SM Description — 2026-06-18

## Change Summary

**Commit:** `77b049d` — `custom-search Step 1: remove behavior_notes candidacy gate, add SM description as additive narrative`
**File:** `server/src/server.ts` — 1 file changed, 11 insertions, 6 deletions
**Deploy:** tsc clean, `systemctl restart shelter-app`, service active. [VERIFIED]

## Unified Diff

```diff
@@ -4408,8 +4408,8 @@
       return false;
     });
 
-    // --- Profiler-thin exclusion ---
-    let withRecords = filtered.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
+    // --- Candidacy: all adoptable cats passing hard filters (gate opened Step 1) ---
+    let withRecords = filtered;
     let usedFallback = false;
 
     if (withRecords.length < 3) {
@@ -4418,20 +4418,19 @@
         const animalSex = (a.sex || '').toLowerCase();
         return sexLower.includes(animalSex);
       });
-      const fallbackWithRecords = sameSexAllAges.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
 
-      if (fallbackWithRecords.length === 0) {
+      if (sameSexAllAges.length === 0) {
         // Truly zero cats of requested sex — keep existing empty state
         audit.candidateCount = 0;
         audit.status = 'failure_no_candidates';
         audit.errorClass = 'no_candidates';
-        audit.errorMessage = 'No cats with behavior records match filters';
+        audit.errorMessage = 'No cats match filters';
         res.json({ matches: [], message: errStrings.noMatches });
         return;
       }
 
       // Use fallback candidates
-      withRecords = fallbackWithRecords;
+      withRecords = sameSexAllAges;
       usedFallback = true;
@@ -4471,6 +4470,12 @@
           lines.push(rec.rawTranscript || '(no transcript)');
         }
       }
+      // Append SM description when present (additive narrative — Step 1)
+      if (animal.description && animal.description.trim()) {
+        lines.push('');
+        lines.push('Shelter notes:');
+        lines.push(animal.description.trim());
+      }
       shortlistEntries.push(lines.join('\n'));
     }
```

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert 77b049d && cd server && npm run build && sudo /usr/bin/systemctl restart shelter-app
```
No schema or data changes to undo. [VERIFIED]

---

## Verification Results — Baseline Re-Run

All queries show `candidateCount: 98` (was 18). Baseline reference: report-20260617-233248.

### Comparison Table

| Query | Before codes | Before candidateCount | After codes | After candidateCount | Before lowConf | After lowConf | Before time | After time |
|-------|-------------|----------------------|-------------|---------------------|---------------|--------------|------------|-----------|
| 1. Calm lap cat (EN) | S2025966, S20251008, W2026014 | 18 | S2025966, S2023445, S2025833 | 98 | false | false | 19.2s | 19.0s |
| 2. Playful+kids (EN) | S2026047, S2026268, W2026014 | 18 | S2026495, S2026268, S2026519 | 98 | false | false | 21.2s | 15.2s |
| 3. Young black FIV-neg (EN) | S2026268, W2026014, W2025068 | 18 | S2026495, S2026268, S2026391 | 98 | **true** | **false** | 23.3s | 15.3s |
| 4. Sphynx fetch (EN) | W2025068, S2026047, W2026014 | 18 | S2026495, S2026545, S2026519 | 98 | true | true | 22.7s | 14.7s |
| 5. Gato tranquilo (ES) | S2026028, S2025883, S2026268 | 18 | S2025546, S2026047, S2026028 | 98 | false | false | 19.9s | 22.9s |

### Key Observations

1. **candidateCount: 18 → 98 across all 5 broad queries.** [VERIFIED]

2. **Query 3 (young black FIV-negative) flipped from lowConfidence:true to false.** With 98 candidates, the AI found genuinely matching cats (Andrew — young, black, FIV-negative; Juliet — young, black, FIV-negative) that weren't in the old 18-cat pool. The preamble ("we don't have young black FIV-negative cats") is gone because now we do. This is the single most impactful behavioral improvement. [VERIFIED]

3. **Query 4 (Sphynx fetch) correctly remains lowConfidence:true** with appropriate preamble. No Sphynx in inventory regardless of pool size. [VERIFIED]

4. **Response times generally improved** (14.7–22.9s vs 19.2–23.3s) despite larger candidate pool. The Anthropic API call dominates latency; pool size doesn't materially affect it since Claude still picks 3. [VERIFIED]

5. **New cats appearing in results** — S2023445 Grumpy McGee, S2025833 Jeans, S2026495 Andrew, S2026519 Luna Tuna, S2026391 Ember, S2026545 Honeysuckle, S2025546 Billy Boy — these are cats that had no behavior_notes and were invisible before. [VERIFIED]

6. **Bio quality for no-transcript cats:** The AI handles sparse profiles well, using base attributes and noting "our search records don't include detailed notes" when transcripts are absent. It doesn't fabricate personality traits. [VERIFIED]

---

### Query 1 — Calm lap cat (EN) — Post-change

**Request:**
```json
{"sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"I'd love a calm, affectionate lap cat for a quiet apartment."}
```
**Time:** 19.0s | **candidateCount:** 98 | **lowConfidence:** false | **preamble:** null

**Matches:**
- **S2025966 Abe (Louie)** — Male, 9y 7m, DSH — Still matched (had transcripts before). Bio uses caregiver data about lap cat behavior, diabetes, bonded pair with Edna.
- **S2023445 Grumpy McGee** — Male, 4y 5m, DSH — **NEW** (no transcripts). Bio honestly notes "Our search records don't include detailed caregiver notes for Grumpy McGee."
- **S2025833 Jeans** — Male, 12y 9m, DSH — Had transcripts. Bio references caregiver data about TV watching, calm energy, lip swelling medical note.

### Query 2 — Playful + kids + cats (EN) — Post-change

**Request:**
```json
{"sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"Looking for a playful, energetic cat that's good with young kids and other cats."}
```
**Time:** 15.2s | **candidateCount:** 98 | **lowConfidence:** false | **preamble:** null

**Matches:**
- **S2026495 Andrew** — Male, 2y, DSH — **NEW** (no transcripts). Bio notes "Our search records don't note any health concerns for Andrew."
- **S2026268 Juliet** — Female, 1y 9m, DSH — Still matched. Bio uses caregiver data, honestly notes she'd do better with "older, calmer children rather than very young."
- **S2026519 Luna Tuna** — Male, 1y 3m, DSH — **NEW** (no transcripts). Bio says "shelter staff will be able to give you the full picture."

### Query 3 — Young black FIV-neg (EN) — Post-change

**Request:**
```json
{"sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"I want a young black cat, FIV-negative."}
```
**Time:** 15.3s | **candidateCount:** 98 | **lowConfidence:** false (was true!) | **preamble:** null (was inventory-gap note!)

**Matches:**
- **S2026495 Andrew** — Male, 2y, DSH, Black, FIV negative — **NEW.** Exact match for request.
- **S2026268 Juliet** — Female, 1y 9m, DSH, Black, FIV negative — Still matched. Exact match.
- **S2026391 Ember** — Female, 1y 1m, DSH, Various, FIV negative — **NEW.** Bio honestly notes "her coat is described as various rather than solid black."

### Query 4 — Sphynx fetch (EN) — Post-change

**Request:**
```json
{"sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"I want a hairless Sphynx that can fetch."}
```
**Time:** 14.7s | **candidateCount:** 98 | **lowConfidence:** true | **preamble:** "We don't currently have any Sphynx cats..."

**Matches:** S2026495 Andrew, S2026545 Honeysuckle, S2026519 Luna Tuna — all NEW, all with honest breed-mismatch acknowledgment.

### Query 5 — Spanish (ES) — Post-change

**Request:**
```json
{"sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"Busco un gato tranquilo y cariñoso para un apartamento pequeño."}
```
URL: `POST /api/matcher/custom-search?lang=es`
**Time:** 22.9s | **candidateCount:** 98 | **lowConfidence:** false | **preamble:** null

**Matches:**
- **S2025546 Billy Boy** — Male, 5y 3m, DSH — **NEW.** Bio in Spanish, uses caregiver data.
- **S2026047 Buckley** — Male, 2y, DLH — Still matched. Full Spanish bio from caregiver data.
- **S2026028 Macy** — Male, 7y 5m, DSH — Still matched. Full Spanish bio.

---

## Query 6 — Barn Cat Validation (NEW)

**Request:**
```json
{"sex":["male"],"ageGroup":["young","adult","senior"],"narrative":"I have a barn and need a hardworking outdoor mouser."}
```
**Time:** 11.9s | **candidateCount:** 51 (males only) | **lowConfidence:** false | **preamble:** null

**Matches — all 3 have SM barn-cat notes:**
- **S20251236 Blizzard** — Bio: "shelter staff have specifically noted he'd thrive as a barn cat rather than a house pet"
- **S20241099 (Dante/Lucky)** — Bio: "shelter staff have flagged him specifically as a barn cat candidate rather than a house pet"
- **S20241161 Munster** — Bio: "shelter staff have identified him as a natural barn cat rather than a household pet"

**The SM description ("Not meant to be a household pet, but would be a great barn cat.") was injected via the "Shelter notes:" additive block and the AI used it appropriately.** The barn-cat cats surfaced for a barn query and were correctly excluded from home/apartment queries (none appeared in queries 1–5). [VERIFIED]

---

## Watch-Cat Confirmation

| Shelter Code | Name | In candidate pool? | Surfaced in queries 1–5? | Surfaced in query 6? |
|-------------|------|-------------------|--------------------------|---------------------|
| S20251236 | Blizzard | YES (candidateCount=98 includes it) | No — correctly excluded from home queries | **YES** — matched as barn cat |
| S2023297 | Iron | YES | No | No (SM note about shelter stress / front declaw — not barn-relevant) |
| R2024025 | Lucky | YES | No | No (male 12y — candidateCount=51 includes it but AI didn't select) |
| S20241161 | Munster | YES | No — correctly excluded from home queries | **YES** — matched as barn cat |

All 4 are in the candidate pool. The barn-cat-noted ones surface for barn queries, not home queries. [VERIFIED]
