# UI / Page Load Diagnosis — Custom-Search (Pass 8)

**Date:** 2026-06-20 03:55 ET  
**Type:** READ-ONLY DIAGNOSIS  
**Source:** File inspection + HTTP checks

---

## Answers

**(A) Does the radio state exactly match ENABLED_SPECIES?** YES — exact 1:1 match. All 3 species (cat, dog, small_animal) are enabled in both the UI radios and the backend `ENABLED_SPECIES` array. Small_animal is **currently ENABLED** in the UI (ungated in commit `e14a1e8`, confirmed no `disabled` attribute). No species is selectable in the UI that would error on the backend, and no working species is hidden from the UI. The known placeholder-launch situation (FAQ files marked `[PLACEHOLDER — UNCONFIRMED]`) still applies — small_animal works end-to-end but FAQ content is unconfirmed. [VERIFIED]

**(B) Does the page load functionally?** YES — `index.html` returns 200 (6,487 bytes), `app.js` returns 200 (24,112 bytes), JS passes `node --check` with no syntax errors, form submit handler is wired via `addEventListener`, all 3 species radios are present, and both sex/ageGroup checkbox groups are in the markup. [VERIFIED]

---

## PART A — Species Radio vs ENABLED_SPECIES

### UI Radio Markup (custom-search/index.html:34-36)

```html
<label class="pill-label"><input type="radio" name="species" value="cat" checked>Cat</label>
<label class="pill-label"><input type="radio" name="species" value="dog">Dog</label>
<label class="pill-label"><input type="radio" name="species" value="small_animal">Small Animal</label>
```

All 3 radios are plain `<input type="radio">` with no `disabled` attribute, no `pill-disabled` class, and no `title` override. Cat is default-checked. [VERIFIED]

### Backend ENABLED_SPECIES (server.ts:4351-4352)

```typescript
const VALID_SPECIES = ['cat', 'dog', 'small_animal'];
const ENABLED_SPECIES = ['cat', 'dog', 'small_animal'];
```

Both arrays contain the same 3 species. `VALID_SPECIES` controls the 400 "unknown species" response; `ENABLED_SPECIES` controls the 400 "species not yet available" response. Both are identical. [VERIFIED]

### Comparison Matrix

| Species | UI Radio | `value` | Disabled? | In ENABLED_SPECIES | In VALID_SPECIES | Match? |
|---------|---------|---------|-----------|-------------------|-----------------|--------|
| Cat | ✅ Present | `cat` | ❌ No | ✅ Yes | ✅ Yes | ✅ |
| Dog | ✅ Present | `dog` | ❌ No | ✅ Yes | ✅ Yes | ✅ |
| Small Animal | ✅ Present | `small_animal` | ❌ No | ✅ Yes | ✅ Yes | ✅ |

**No mismatches.** Every enabled radio maps to a backend-supported species. No species is hidden in the UI that works on the backend. No species is selectable that would error. [VERIFIED]

### Small Animal Status

Small_animal was ungated in commit `e14a1e8` (2026-06-19). Current state:
- **UI:** Enabled, no `disabled` attribute, no `pill-disabled` class ✅
- **Backend:** In `ENABLED_SPECIES` array ✅
- **Prompts:** Dedicated `systemMessageSmallEn/Es` prompts exist (commit `9518396`) ✅
- **FAQ:** Marked `[PLACEHOLDER — UNCONFIRMED — BLOCKS UI LAUNCH]` — content unverified by shelter staff ⚠️

The FAQ placeholder is a known item from the small-animal prompt deploy. The search feature works end-to-end for small animals; the FAQ content within the prompt needs shelter confirmation before formal public launch. [VERIFIED]

---

## PART B — Page Load

### HTTP Checks

| Resource | Status | Size |
|----------|--------|------|
| `/custom-search/` (index.html) | 200 OK | 6,487 bytes |
| `/custom-search/app.js` | 200 OK | 24,112 bytes |

### JavaScript Validation

```
$ node --check /home/shelter/shelter-apps/custom-search/app.js
(no output — clean)
```

No syntax errors. [VERIFIED]

### Form Wiring

- Script loaded: `<script src="app.js?v=20260430-2"></script>` (line 147)
- Submit button wired: `btn.addEventListener('click', ...)` (app.js:202)
- Form handler: `handleSubmit()` at app.js:296
- Species radios: 3 present (lines 34-36)
- Sex checkboxes: `name="sex"` with values `male`/`female` (lines 44-45)
- Age checkboxes: `name="ageGroup"` with values `young`/`adult`/`senior` (lines 53-55)
- Narrative textarea: present (line 62)
- Error display elements: present for sex-error and age-error
- i18n: EN/ES toggle functional (app.js:1-130)

### No Service Worker / No PWA

Custom-search is a plain HTML page served via Express static middleware. No service worker, no manifest, no offline capability. This is by design — it's a simple search form, not a PWA. [VERIFIED]

---

## Summary

| Check | Status | Detail |
|-------|--------|--------|
| Radio ↔ ENABLED_SPECIES match | **EXACT** ✅ | 3/3 species aligned, no gaps |
| Small_animal UI state | **ENABLED** ✅ | Ungated in e14a1e8, confirmed no disabled attr |
| Small_animal FAQ | **PLACEHOLDER** ⚠️ | Known: unconfirmed content, blocks formal launch |
| Page loads | **CLEAN** ✅ | 200 OK, JS clean, form wired |
| Hidden/broken species | **NONE** ✅ | No working species hidden, no selectable species that errors |
