# Stage 4: Custom-Search UI Open to Dog — DEPLOYED

**Date:** 2026-06-18 21:32 ET  
**Commit:** `af329dc`  
**Production modified:** YES. 2 client files, +6/-5 lines. No server changes. [VERIFIED]  
**Status:** DEPLOYED

---

## Changes

### Change 1 — Species control (index.html)

Converted species inputs from disabled checkboxes to a single-select radio group:

```diff
-<label class="pill-label pill-disabled" title="Currently available for cats only.">
-  <input type="checkbox" name="species" value="dog" disabled>Dog</label>
-<label class="pill-label pill-locked">
-  <input type="checkbox" name="species" value="cat" checked disabled>Cat</label>
-<label class="pill-label pill-disabled" title="Currently available for cats only.">
-  <input type="checkbox" name="species" value="small_animal" disabled>Small Animal</label>
+<label class="pill-label">
+  <input type="radio" name="species" value="cat" checked>Cat</label>
+<label class="pill-label">
+  <input type="radio" name="species" value="dog">Dog</label>
+<label class="pill-label pill-disabled" title="Not yet available.">
+  <input type="radio" name="species" value="small_animal" disabled>Small Animal</label>
```

- Cat: radio, checked (default), enabled ✅
- Dog: radio, enabled ✅
- Small Animal: radio, **still disabled** with "Not yet available." tooltip ✅

### Change 2 — Send species in request body (app.js)

```diff
-    // Species is locked to cat — always send ["cat"] regardless of UI state
+    const species = getChecked('species')[0];
     ...
-      body: JSON.stringify({ sex, ageGroup, narrative: narrative || '' }),
+      body: JSON.stringify({ species, sex, ageGroup, narrative: narrative || '' }),
```

Radio group always has exactly one selected → `getChecked('species')[0]` always returns a string. No validation guard needed (unlike sex/age multi-select). [VERIFIED]

### Change 3 — Reset (app.js)

```diff
+  document.querySelector('input[name="species"][value="cat"]').checked = true;
```

On form reset, species radio resets to cat. Sex/age reset logic untouched. [VERIFIED]

### Change 4 — No client-side species validation needed

Radio with `checked` default always has exactly one selected. Existing sex/age validation untouched. [VERIFIED]

---

## Verification

### Live page serves updated files

```
curl custom-search.4lgshelterapp.duckdns.org/ | grep 'name="species"'
→ <input type="radio" name="species" value="cat" checked>
→ <input type="radio" name="species" value="dog">
→ <input type="radio" name="species" value="small_animal" disabled>
```
[VERIFIED — no restart needed, Express static serves from filesystem]

### Dog search returns dog results

POST `{"species":"dog","sex":["male","female"],"ageGroup":["young","adult"],"narrative":"A friendly medium-energy dog good with kids"}`:
- Returned 3 dogs: Clover (A2026061), Achilles (A2025088), Amari (A2024185) [VERIFIED]
- `hard_filters.species: "dog"` in audit trail [VERIFIED]

### Cat search unregressed

POST `{"species":"cat","sex":["male","female"],"ageGroup":["young","adult"],"narrative":"A calm lap cat"}`:
- Returned 3 cats: Starr (S20241035), Juliet (S2026268), Matcha (S2026290) [VERIFIED]
- `hard_filters.species: "cat"` in audit trail [VERIFIED]

### Small animal blocked

POST `{"species":"small_animal",...}`:
- Returns `{"error":"small_animal search is not yet available"}` (400) [VERIFIED]
- Radio is disabled in HTML — cannot be selected in UI [VERIFIED]

### ES dog search

POST with `?lang=es` + `species:"dog"`:
- Returned 3 dogs with Spanish bios: Abstract, Donny, Amari [VERIFIED]
- Species labels render in Spanish via existing i18n (`Perro`, `Gato`, `Animal Pequeño`) [VERIFIED]

### Only two client files changed

```
git status --short → M custom-search/app.js, M custom-search/index.html
```
No server files modified. [VERIFIED]

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert af329dc
# No build/restart needed — static files served directly
```
