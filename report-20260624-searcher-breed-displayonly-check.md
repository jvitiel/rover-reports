# Searcher Breed Display-Only Verification

**Date:** 2026-06-24  
**Read-only:** No writes, no code/service changes  

---

## 1. Popup Breed String — Full Usage Trace

The localized breed string is produced by `translateBreedEs(match.breed)` and written at **one site only**:

```js
// custom-search/app.js:630
document.getElementById('popupBreed').textContent = translateBreedEs(match.breed);
```

The target element is a plain `<span>`:

```html
<!-- custom-search/index.html:134 -->
<span id="popupBreed" class="popup-detail-value">-</span>
```

**Complete usage inventory for `popupBreed`:**
1. `app.js:630` — `.textContent = translateBreedEs(...)` (WRITE, display)
2. `app.js:196` — sibling label update `popup-breed-label` (label only, not the value)
3. `index.html:134` — static `<span>` definition

No other references exist. The element:
- Has no `onclick`, `href`, `addEventListener`, or any event binding
- Is never read back (no `textContent` read, no `value` read, no `innerText` capture)
- Is not inside a `<form>`, `<a>`, `<button>`, or any interactive container
- Has no data attributes that any JS reads

**Verdict: DISPLAY-ONLY.** The localized Spanish breed string is written to the DOM for visual rendering and nothing else.

---

## 2. Sex + Age — Same Check

### Sex (`popupSex`)

```js
// app.js:624-626
if (sexLower === 'male') document.getElementById('popupSex').textContent = i18n('filter.sex_male');
else if (sexLower === 'female') document.getElementById('popupSex').textContent = i18n('filter.sex_female');
else document.getElementById('popupSex').textContent = match.sex || '-';
```

Complete usage: `app.js:624-626` (WRITE), `index.html:126` (static `<span>`). No read-back, no event binding, no form membership. **DISPLAY-ONLY.**

Note: The sex value reuses `filter.sex_male`/`filter.sex_female` keys which are also used for filter pill labels (`app.js:142-143`). This is safe — the filter pills have their own `<input>` elements with `value="male"`/`value="female"` (English, hard-coded in `index.html:48-56`). The i18n key only sets the pill's visible text label, not the checkbox value submitted to the API. The popup reading the same key is purely cosmetic.

### Age (`popupAge`)

```js
// app.js:628
document.getElementById('popupAge').textContent = formatAgeLong(match.age);
```

Complete usage: `app.js:628` (WRITE), `index.html:130` (static `<span>`). No read-back, no event binding. **DISPLAY-ONLY.**

---

## 3. Two Separate Tables, Opposite Directions

### Popup breed map (client-side, EN→ES, display)
- **Location:** `custom-search/app.js:574-592`
- **Tables:** `BREED_FULL_MAP_ES` (10 full-string overrides) + `BREED_WORD_MAP_ES` (11 structural words)
- **Direction:** English SM value → Spanish display string
- **Consumed by:** `translateBreedEs()` at `app.js:594`, called only from popup render at `app.js:630`

### Engine breed/color translation (server-side, ES→EN, filtering)
- **Location:** `server/src/intentExtractor.ts`
- **Mechanism:** LLM prompt instruction at `intentExtractor.ts:69`: "When the narrative is in Spanish, you MUST return color and breed values in ENGLISH, because the hard filter matches against English values from the shelter database."
- **Direction:** Spanish user input → English values for `hardFilter.ts` substring matching
- **Consumed by:** LLM extraction pipeline, never touches the client

### Independence confirmation:
- `intentExtractor.ts` contains **zero references** to `BREED_FULL_MAP_ES`, `BREED_WORD_MAP_ES`, or `translateBreedEs`
- `custom-search/app.js` contains **zero references** to `intentExtractor`
- The popup map is a client-side JS object in `app.js`; the extractor is a server-side TypeScript module compiled into the Node server
- They cannot import each other — different runtimes (browser vs Node), different files, different direction

**Verdict: COMPLETELY INDEPENDENT.** Separate tables, separate files, separate runtimes, opposite directions.

---

## 4. No Feedback Loop

The popup contains exactly these interactive elements:
- Close button (`<button onclick="closePopup()">`, `index.html:113`)
- Main photo click → lightbox (`<img onclick="openPhotoLightbox(this.src)">`, `index.html:117`)
- Overlay click → close (`<div onclick="closePopup()">`, `index.html:111`)
- CTA phone number (static text, not a link)

**There is no:**
- "Search for more like this breed" button
- "Find similar" affordance
- Clickable breed/sex/age that triggers a re-search
- Any JS that reads `popupBreed.textContent` and feeds it into a query
- Any form element inside the popup that would capture the displayed values

The popup's only exit paths are: close (back to results grid) or photo lightbox. No value from the popup ever flows into the search/filter pipeline.

**Verdict: NO FEEDBACK LOOP.** The localized strings are terminal — written to the DOM for display and never captured.

---

## Summary

| Question | Answer |
|----------|--------|
| Is popup breed string display-only? | **YES** — written to `<span>` textContent at one site, never read back |
| Are popup sex/age also display-only? | **YES** — same pattern, plain `<span>` writes, no read-back |
| Are popup map and intentExtractor map independent? | **YES** — separate files (app.js vs intentExtractor.ts), separate runtimes (browser vs Node), opposite directions (EN→ES vs ES→EN), zero cross-references |
| Does any re-search affordance feed localized strings back? | **NO** — popup has no re-search UI; only close and photo lightbox |
