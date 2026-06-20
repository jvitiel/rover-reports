# Static Check: POLICY_KEYWORDS → FAQ Entry Coverage

**Model:** N/A (read-only static analysis, no endpoint calls)
**Endpoint:** N/A
**Sample:** 13 POLICY_KEYWORDS vs 4 FAQ files (cat EN/ES, dog EN/ES)
**Able to fail:** Any keyword without a backing FAQ entry would cause the model to receive "POLICY TOPICS RAISED: [topic]" with instruction to "answer from the policy block" but find no matching entry → generic or hallucinated answer.
**Proves:** Which keywords have real FAQ backing and which don't.
**Does NOT prove:** Whether the model would actually match a keyword to the correct FAQ key (e.g. "fee" → `adoption_fees`). That's model judgment.

---

## POLICY_KEYWORDS (server.ts)

```
['spay', 'neuter', 'vaccin', 'microchip', 'chip', 'fee', 'cost', 'price', 'hour', 'visit', 'return', 'refund', 'adopt']
```

## FAQ FILES

| File | Keys | Status |
|------|------|--------|
| `shelter-policy-faq.json` (cat EN) | 9 keys | ✅ exists |
| `shelter-policy-faq-dog.json` (dog EN) | 9 keys | ✅ exists |
| `shelter-policy-faq-es.json` (cat ES) | 9 keys | ✅ exists |
| `shelter-policy-faq-dog-es.json` (dog ES) | 9 keys | ✅ exists |
| `shelter-policy-faq-small.json` (small EN) | — | ❌ MISSING |
| `shelter-policy-faq-small-es.json` (small ES) | — | ❌ MISSING |

## KEYWORD → FAQ ENTRY MAPPING (cat + dog, EN)

| Keyword | Adopter might say | Matching FAQ key | FAQ text (EN) | Backed? |
|---------|-------------------|-----------------|---------------|---------|
| `spay` | "spayed cat" | `spay_vax_chip` | "Cats/Dogs come spayed/neutered, fully vaccinated, and microchipped at adoption." | ✅ |
| `neuter` | "neutered cat" | `spay_vax_chip` | same | ✅ |
| `vaccin` | "vaccinated" | `spay_vax_chip` | same | ✅ |
| `microchip` | "microchipped" | `spay_vax_chip` | same | ✅ |
| `chip` | "chipped" | `spay_vax_chip` | same | ✅ ⚠️ |
| `fee` | "adoption fee" | `adoption_fees` | "Adoption fees vary by animal — call (845) 414-9700..." | ✅ |
| `cost` | "how much does it cost" | `adoption_fees` | same | ✅ |
| `price` | "what's the price" | `adoption_fees` | same | ✅ |
| `hour` | "what are your hours" | `visit_hours` | "We're open noon to 5 PM, six days a week (closed Wednesdays)..." | ✅ |
| `visit` | "can I visit" | `visit_hours` | same | ✅ |
| `return` | "can I return the cat" | `return_policy` | "If an adoption doesn't work out, we ask that the animal come back to us..." | ✅ |
| `refund` | "can I get a refund" | `money_refund` | "For adoption fees and refunds, call (845) 414-9700." | ✅ |
| `adopt` | "adoption process" | `adoption_fees` / `supplies_included` | Multiple entries reference adoption | ✅ ⚠️ |

### Notes

**`chip` (⚠️):** Substring match means "chip" would match any soft term containing "chip" — e.g. an adopter saying "chocolate chip" (unlikely but possible). False positive risk is LOW because (a) the extractor would have to extract "chocolate chip" as a soft term, and (b) even if misrouted, the preamble answer ("microchipped at adoption") is harmless — just irrelevant. Acceptable.

**`adopt` (⚠️):** Very broad — matches "adopt," "adoption," "adoptable," "adopted." Most uses are benign ("I want to adopt a cat" → routed to preamble with adoption info). But "adopt" also appears in the adopter narrative framing inherently ("I'm looking to adopt..."). Risk: the extractor might include "adopt" as a soft term for routine phrasing. **In practice:** the extractor currently does NOT extract "adopt" from "I want to adopt a cat" as a soft term — it extracts animal preferences. It would only extract "adopt" if the adopter asked something like "what's the adoption process?" which IS a policy question. So the risk is low. But if the extractor ever extracts "adopt" from routine narrative, it would be falsely policy-routed. **Recommendation:** Consider removing `adopt` from POLICY_KEYWORDS to avoid false routing on routine adoption phrasing. The model can still match "adoption process" questions to FAQ entries via the prompt rules without keyword routing.

## ES FAQ COVERAGE

All 9 FAQ keys are present in both `shelter-policy-faq-es.json` and `shelter-policy-faq-dog-es.json` with Spanish translations. The same keyword → FAQ key mapping applies (the keywords match on the adopter's soft terms, which come from the narrative in whatever language — the FAQ content is already in the matching language file).

**All 13 keywords are backed by FAQ entries for cat and dog, EN and ES. ✅**

## SMALL-ANIMAL FAQ — ABSENT BLOCK

- `shelter-policy-faq-small.json` does NOT exist.
- `shelter-policy-faq-small-es.json` does NOT exist.
- Code falls back to `'(policy file unavailable)'` when the file is missing.
- Small-animal system prompts have a hardcoded PLACEHOLDER in the policy section.

**Impact of this fix:** If an adopter searches for a small animal and mentions "spayed" or "fees," the POLICY_KEYWORDS code will correctly classify it as a policy topic and emit `POLICY TOPICS RAISED: [spayed]` with "answer from the policy block." But the policy block will be `(policy file unavailable)`. The model will have nothing to answer with → likely generic or dropped.

**This is NOT a regression from this fix.** The small-animal FAQ was already missing before this change. The fix doesn't make it worse — it just means the policy-topic routing is correct but the destination is empty. The fix for this is creating the small-animal FAQ files (existing backlog item #9).

## COLLOQUIAL SYNONYMS

Missing from POLICY_KEYWORDS:

| Colloquial | Standard | Would match? |
|-----------|----------|-------------|
| "fixed" | spayed/neutered | ❌ not in keywords |
| "altered" | spayed/neutered | ❌ not in keywords |
| "shots" | vaccinated | ❌ not in keywords |
| "dewormed" | — | ❌ not in keywords, no FAQ entry either |
| "chipped" | microchipped | ✅ matched by `chip` |
| "snipped" | neutered (colloquial) | ❌ not in keywords |

Adding `'fix', 'alter', 'shot'` to POLICY_KEYWORDS would cover the main colloquials. This is trivial to add but risks false positives:
- `fix` → "I want to fix..." (non-spay usage common)
- `alter` → "I'd like to alter my search" (non-spay usage)
- `shot` → "a long shot but..." (non-vaccination usage)

**Recommendation:** Defer to the backlog extractor fix (model-judged, no regex). The keyword list handles the standard terms; colloquials are edge cases. The durable extractor fix would handle "is my cat going to be fixed?" correctly without false positives on "fix."

---

## SUMMARY

| Question | Answer |
|----------|--------|
| Does every POLICY_KEYWORD have a backing FAQ entry for cat+dog? | **YES** — all 13 keywords map to FAQ entries in all 4 files (cat/dog × EN/ES) |
| Any keyword that routes but has no answer? | **NO** — for cat and dog. **YES** — for small animals (FAQ files missing entirely, existing known gap) |
| Small-animal absent block? | Confirmed: `shelter-policy-faq-small.json` does not exist. Policy routing fires correctly but destination is empty. Not a regression from this fix. |
| Colloquial synonyms? | "fixed," "altered," "shots" are NOT in keyword list. Adding them risks false positives. Deferred to backlog extractor fix. |
| Recommendation? | Consider removing `adopt` (overly broad). Otherwise no changes needed before commit. |
