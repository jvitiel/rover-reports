# Matcher Adopt Button — Implementation Report

## Step 0 — Production URL Verification

```
EN: https://fourlegsgoodnynj.org/adopt/  → 301 → https://www.fourlegsgoodnynj.org/adopt/  → 200 ✅
ES: https://fourlegsgoodnynj.org/es/adopt/ → 301 → https://www.fourlegsgoodnynj.org/adopt/  → 200 (redirected to EN!)
```

`/es/adopt/` does NOT exist on production — it redirects to the EN adopt page. Probed alternate slugs:
- `/es/adoptar/` → 404
- `/es/adopcion/` → 404
- `/es/adopta/` → 200 → canonical: `https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/` (confirmed via redirect + oembed alternate link in page source)

Confirmed `id="adoption-application"` anchor exists on the ES page. Final production URLs used:
- **EN:** `https://www.fourlegsgoodnynj.org/adopt/#adoption-application`
- **ES:** `https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/#adoption-application`

## Step 1 — Reworded Phone Line

Translation key `modal.adopt_cta` (existing key, values changed in place):

| Lang | Old value | New value |
|------|-----------|-----------|
| EN | `\ud83d\udc3e Please adopt me at` | `\ud83d\udc3e Adopt me at` |
| ES | `\ud83d\udc3e Por favor adóptame llamando al` | `\ud83d\udc3e Adóptame al` |

Phone number `(845) 414-9700` and its `<strong>` styling are unchanged — they come from the `updateI18n` innerHTML template, not the translation value.

## Step 2 — Apply Now Button

### New translation key: `modal.apply_now`

| Lang | Value |
|------|-------|
| EN | `Apply Now` |
| ES | `Solicitar Ahora` |

Follows the existing `modal.*` key naming convention used by all other modal translation keys.

### HTML markup (matcher-preview/index.html)

Added inside `.modal-cta` div, directly after the phone `<p>`:

```html
<div class="modal-cta">
  <p class="adopt-cta">🐾 Adopt me at <strong>(845) 414-9700</strong></p>
  <a class="adopt-apply-btn" href="https://www.fourlegsgoodnynj.org/adopt/#adoption-application" target="_blank" rel="noopener">Apply Now</a>
</div>
```

The button is an `<a>` element styled as a pill button, stacked below the phone line in the centered `.modal-cta` container. Initial href is the EN URL (overridden by JS on language switch).

### Button styling (matcher-preview/styles.css)

New class `.adopt-apply-btn`, placed after `.adopt-cta strong`:

```css
.adopt-apply-btn {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 24px;
  background: var(--primary);
  color: white;
  border-radius: 6px;
  font-family: var(--body-font);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease;
}

.adopt-apply-btn:hover {
  background: var(--secondary);
  color: white;
}
```

Matches the app's existing `.btn` pattern (same padding ratio, border-radius, font-weight, primary/secondary color scheme). The `.modal-cta` container is `text-align: center`, so the inline-block button centers automatically.

## Step 3 — Language-Seamless Wiring

Added to `applyStaticTranslations()` (the function called by `updateI18n()`), after the existing phone line update:

```javascript
// Modal Apply Now button
const applyBtn = document.querySelector('.adopt-apply-btn');
if (applyBtn) {
  applyBtn.textContent = i18n('modal.apply_now');
  applyBtn.href = currentLang === 'es'
    ? 'https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/#adoption-application'
    : 'https://www.fourlegsgoodnynj.org/adopt/#adoption-application';
}
```

This runs on every language toggle (EN↔ES button click calls `setLanguage()` → `updateI18n()` → `applyStaticTranslations()`), so both the label AND href update live when the user switches language. Not just on first render.

## Scope Confirmation

| File | Touched? |
|------|----------|
| matcher-preview/app.js | ✅ Yes (translations + updateI18n) |
| matcher-preview/index.html | ✅ Yes (button element + reworded text) |
| matcher-preview/styles.css | ✅ Yes (button styling) |
| custom-search/* | ❌ Not touched |
| matcher-web/* | ❌ Not touched |

## Build

```
$ cd /home/shelter/shelter-apps/server && npm run build
> tsc
(exit 0)
```

## Git

```
$ git diff --stat
matcher-preview/app.js     | 15 +++++++++++++--
matcher-preview/index.html |  3 ++-
matcher-preview/styles.css | 19 +++++++++++++++++++
3 files changed, 34 insertions(+), 3 deletions(-)

$ git add matcher-preview/app.js matcher-preview/index.html matcher-preview/styles.css
$ git commit -m "Matcher card: reword phone line, add language-aware Apply Now adopt button (EN/ES → production adopt form)"
[master 07cb396]
```

Service NOT restarted. These are static files served directly by Express — they take effect on next page load after restart.
