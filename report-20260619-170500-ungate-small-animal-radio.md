# Ungate Small-Animal Species Radio on Custom-Search

**Date:** 2026-06-19 17:05 ET  
**Type:** IMPLEMENTATION  
**Commit:** `e14a1e8` — `custom-search/index.html` (1 insertion, 1 deletion)  
**Status:** DEPLOYED ✅

---

## Change

### Before
```html
<label class="pill-label pill-disabled" title="Not yet available."><input type="radio" name="species" value="small_animal" disabled>Small Animal</label>
```

### After
```html
<label class="pill-label"><input type="radio" name="species" value="small_animal">Small Animal</label>
```

Removed: `pill-disabled` class, `title="Not yet available."`, `disabled` attribute. [VERIFIED]  
Now matches cat/dog radio markup exactly (`pill-label` class, no extra attributes). [VERIFIED]

---

## Service Worker

Custom-search has **no service worker and no manifest** — it's a plain HTML page served via Express static at `/custom-search/`. [VERIFIED — no `sw.js`, no `serviceWorker.register()`, no `<link rel="manifest">` in index.html]

No SW cache version bump needed. The page is not a PWA and is not cached client-side. [VERIFIED]

---

## End-to-End Verification

### Small-animal query via production endpoint

```
POST /api/matcher/custom-search
{"species":"small_animal","narrative":"a friendly small pet","language":"en","sex":["male","female"],"ageGroup":["young","adult","senior"]}
```

**Result:** 3 matches returned [VERIFIED]
- Charlie (R2023007) — Hotot rabbit, 3.5yr, documented bio with personality [VERIFIED]
- Hopper (R2026006) — Lion Head mix, 2yr, documented bio with personality [VERIFIED]
- Elsa (S2026155) — American rabbit, documented bio with personality [VERIFIED]

Response keys: `matches`, `candidateCount`, `lowConfidence`, `preamble` — well-formed. [VERIFIED]

### FAQ preamble on policy question

```
POST /api/matcher/custom-search
{"species":"small_animal","narrative":"a rabbit — are they spayed and microchipped?","language":"en",...}
```

**Preamble:** "All three of these rabbits are wonderful candidates — here's a little about each one. On spay/neuter and microchip status: rabbits come spayed or neutered; for microchipping, the shelter team can confirm the specifics for each animal when you reach out." [VERIFIED]

### Cat/Dog radio group integrity

- `species:"cat"` → 3 matches, well-formed response [VERIFIED]
- `species:"dog"` → 3 matches, well-formed response [VERIFIED]

Radio group not broken — all three species route correctly through the endpoint. [VERIFIED]

---

## Files Changed

| File | Change |
|------|--------|
| `custom-search/index.html` | Remove `disabled`, `pill-disabled`, `title` from small_animal radio |

Committed with `git add custom-search/index.html` only (narrow commit). [VERIFIED]

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert e14a1e8 --no-edit
cd server && npm run build && sudo systemctl restart shelter-app
```

No SW re-bump needed (no SW exists). [VERIFIED]
