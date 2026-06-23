# Searcher: "All" Pill Payload Verification Report

**Date:** 2026-06-23  
**Type:** Read-only verification  
**Scope:** Prove the "all" value never reaches the search API

---

## 1. Payload-Build Code

### getChecked helper (`app.js:296–298`):
```js
function getChecked(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}
```

### Submit handler — strip + build (`app.js:335–363`):
```js
const sex = getChecked('sex').filter(v => v !== 'all');          // line 335
const ageGroup = getChecked('ageGroup').filter(v => v !== 'all'); // line 336
const narrative = document.querySelector('textarea[name="narrative"]').value.trim();
// ... validation ...
const species = getChecked('species')[0];                        // line 356
const resp = await fetch(apiUrl, {                               // line 360
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ species, sex, ageGroup, narrative: narrative || '' }),  // line 363
});
```

The `.filter(v => v !== 'all')` on lines 335–336 is the sole strip point. The `JSON.stringify` on line 363 is the sole serialization point. Whatever survives the filter is exactly what goes over the wire.

---

## 2. Captured Payloads

Simulated using the identical `getChecked().filter(v !== 'all')` + `JSON.stringify({ species, sex, ageGroup, narrative })` pipeline with controlled checked-state inputs:

### Scenario A — "All" checked in both groups

DOM state: sex=[male✓, female✓, all✓], ageGroup=[young✓, adult✓, senior✓, all✓]

**Sent payload:**
```json
{"species":"cat","sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":""}
```

### Scenario B — Individuals only (no All pill)

DOM state: sex=[male✓, female✓, all✗], ageGroup=[young✓, adult✓, senior✓, all✗]

**Sent payload:**
```json
{"species":"cat","sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":""}
```

---

## 3. Comparison

```
Scenario A: {"species":"cat","sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":""}
Scenario B: {"species":"cat","sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":""}
Identical:  true (strict string equality)
```

**Verdict: BYTE-IDENTICAL.** The `"all"` value does not appear anywhere in Scenario A's payload. The filter successfully removes it before serialization.

---

## 4. Edge Case — One Individual Unchecked After All

DOM state: All was on in Gender, user unchecked Female → toggle auto-unchecks All.  
sex=[male✓, female✗, all✗], ageGroup=[young✓, adult✓, senior✓, all✓]

**Sent payload:**
```json
{"species":"cat","sex":["male"],"ageGroup":["young","adult","senior"],"narrative":""}
```

- `"all"` present in payload: **NO**
- sex contains only `["male"]` — correct (Female was unchecked, All was auto-unchecked by toggle, but even if toggle had failed to uncheck All, the filter would still strip it)
- ageGroup contains `["young","adult","senior"]` — correct (All checked in age, stripped)

The strip holds through toggle transitions. The filter is the safety net regardless of toggle behavior.

---

## 5. Able-to-Fail Statement

**What would indicate a problem:**
- The literal string `"all"` appearing anywhere in any scenario's sent payload
- Scenario A's payload differing from Scenario B's payload in any way (field order, values, extra fields)
- The edge case payload containing `"all"` or containing fewer/more values than the actual checked individuals

**Failure condition status: ABSENT.** All three scenarios produce payloads containing only the real SM-matchable values (`male`/`female`, `young`/`adult`/`senior`). The `"all"` value is provably stripped by `.filter(v => v !== 'all')` at lines 335–336 before the payload is built at line 363.

**Defense in depth note:** The strip is a pure-function filter applied to an array at the last moment before serialization. It does not depend on the toggle logic working correctly — even if the toggle broke and `all` remained checked when it shouldn't, the filter would still remove it from the outgoing payload. The toggle is UX; the filter is safety.
