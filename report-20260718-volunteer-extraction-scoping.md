# Volunteer Form JS Extraction — Build-Ready Scoping

Date: 2026-07-18
Type: read-only investigation — zero changes made
Posts: 8 (EN /how-to-help/), 345 (ES /es/como-ayudar/)

---

## 1 — THE EXACT INLINE SCRIPT TO EXTRACT

### 1a. Post 8 script block boundaries

```
Post 8 total: 50,700 bytes [VERIFIED via get_post_field('post_content', 8, 'raw')]
Script block starts at byte offset: 39,361 ('<script' tag)
Script block ends at byte offset: 49,181 (end of '</script>')
Block length including tags: 9,820 bytes
Inner JS length excluding tags: 9,803 bytes
Tag structure: <script>...\n</script> (no attributes on opening tag) [VERIFIED: first 20 bytes = "<script>\n(function()"]
Script block count in post 8: 1 [VERIFIED]
```

### 1b. Post 8 inner JS

```
File: /tmp/vol-8-inner.js
SHA256: 242669c31271f78342a9ca0c599f9930d4c5e503974067809051c4c501fc371c
Bytes: 9,803
Lines: 348
Backslashes: 0 [VERIFIED]
Ampersands: 2 (one && operator in isValidEmail charCodeAt body) [VERIFIED]
```

### 1c. Post 345 inner JS

```
File: /tmp/vol-345-inner.js
SHA256: ec1635fa5d076699dfd89054dc78b19e414a904ce9084616a99b6ce71df7fbe2
Bytes: 9,895
Lines: 349
Backslashes: 0 [VERIFIED]
Ampersands: 2 [VERIFIED]
```

### 1d. Full EN-vs-ES diff

```diff
123c123
< showFieldError(fullNameInput, 'Please enter your full name');
---
> showFieldError(fullNameInput, 'Por favor ingresa tu nombre completo');
142c142
< showFieldError(emailInput, 'Please enter a valid email address');
---
> showFieldError(emailInput, 'Por favor ingresa un correo electrónico válido');
172c172
< showFieldError(ageInput, 'Please enter an age between 1 and 17');
---
> showFieldError(ageInput, 'Por favor ingresa una edad entre 1 y 17');
209a210
> language: 'es',
315c316
< fetch('https://dashboard.4lgshelterapp.duckdns.org/api/volunteers', {
---
> fetch('https://dashboard.4lgshelterapp.duckdns.org/api/volunteers?lang=es', {
328c329
< showSubmitError('Too many submissions from this device. Please wait an hour and try again, or call us at (845) XXX-XXXX.');
---
> showSubmitError('Demasiados envíos desde este dispositivo. Por favor espera una hora e intenta de nuevo, o llámanos al (845) XXX-XXXX.');
335c336
< showSubmitError('Some required information is missing. Please review the form and try again.');
---
> showSubmitError('Falta información requerida. Por favor revisa el formulario e intenta de nuevo.');
341c342
< showSubmitError('Something went wrong submitting your application. Please try again, or call us at (845) XXX-XXXX.');
---
> showSubmitError('Algo salió mal al enviar tu solicitud. Por favor intenta de nuevo, o llámanos al (845) XXX-XXXX.');
345c346
< showSubmitError('We could not reach our server. Please check your connection and try again, or call us at (845) XXX-XXXX.');
---
> showSubmitError('No pudimos conectar con nuestro servidor. Por favor verifica tu conexión e intenta de nuevo, o llámanos al (845) XXX-XXXX.');
```

**9 diff hunks total.** The earlier inventory report said "9 differences" — **CONFIRMED MATCH.** [VERIFIED]

Breakdown: 7 UI string changes + 1 structural insertion (`language: 'es'`) + 1 URL change (`?lang=es` suffix).

---

## 2 — THE STRING-EXTERNALIZATION MAP

### 2a. Per-string table

| i18n key | EN value | ES value | Usage location |
|----------|----------|----------|----------------|
| `err_name` | `Please enter your full name` | `Por favor ingresa tu nombre completo` | `showFieldError(fullNameInput, <VALUE>)` at fullNameInput blur handler |
| `err_email` | `Please enter a valid email address` | `Por favor ingresa un correo electrónico válido` | `showFieldError(emailInput, <VALUE>)` at emailInput blur handler |
| `err_age` | `Please enter an age between 1 and 17` | `Por favor ingresa una edad entre 1 y 17` | `showFieldError(ageInput, <VALUE>)` at ageInput blur handler |
| `err_rate_limit` | `Too many submissions from this device. Please wait an hour and try again, or call us at (845) XXX-XXXX.` | `Demasiados envíos desde este dispositivo. Por favor espera una hora e intenta de nuevo, o llámanos al (845) XXX-XXXX.` | `showSubmitError(<VALUE>)` in fetch 429 handler |
| `err_missing_info` | `Some required information is missing. Please review the form and try again.` | `Falta información requerida. Por favor revisa el formulario e intenta de nuevo.` | `showSubmitError(<VALUE>)` in fetch 400 handler |
| `err_generic` | `Something went wrong submitting your application. Please try again, or call us at (845) XXX-XXXX.` | `Algo salió mal al enviar tu solicitud. Por favor intenta de nuevo, o llámanos al (845) XXX-XXXX.` | `showSubmitError(<VALUE>)` in fetch non-ok fallback |
| `err_network` | `We could not reach our server. Please check your connection and try again, or call us at (845) XXX-XXXX.` | `No pudimos conectar con nuestro servidor. Por favor verifica tu conexión e intenta de nuevo, o llámanos al (845) XXX-XXXX.` | `showSubmitError(<VALUE>)` in fetch catch handler |
| `lang` | `en` | `es` | Drives payload `language` field and endpoint URL (see 2b) |
| `endpoint` | `https://dashboard.4lgshelterapp.duckdns.org/api/volunteers` | `https://dashboard.4lgshelterapp.duckdns.org/api/volunteers?lang=es` | `fetch(<VALUE>, {...})` in submit handler |

**9 keys total = 7 UI strings + 2 structural.**

### 2b. Structural differences

**`language` field in payload:**
- Post 8 (EN): no `language` property in the payload object at all
- Post 345 (ES): `language: 'es',` appears after `submissionSource: 'web_form'` inside the payload literal

Proposed replacement in shared JS:
```js
// After payload construction, before return:
if (flg_vol_i18n.lang !== 'en') {
payload.language = flg_vol_i18n.lang;
}
```
This produces identical behavior: EN sends no `language` field, ES sends `language: 'es'`.

**Endpoint URL:**
- Post 8 (EN): `fetch('https://dashboard.4lgshelterapp.duckdns.org/api/volunteers', {`
- Post 345 (ES): `fetch('https://dashboard.4lgshelterapp.duckdns.org/api/volunteers?lang=es', {`

Proposed replacement: pass the full URL as `flg_vol_i18n.endpoint`:
```js
var url = flg_vol_i18n.endpoint;
fetch(url, {
```
The alternative (deriving from `lang`) would require building the query string in JS — less clear than just passing the complete URL from PHP. Full URL is simpler and matches how the adoption form handles it.

### 2c. Complete flg_vol_i18n object (as wp_localize_script PHP arrays)

The existing contact-form localize in functions.php uses `__('string', 'four-legs-good')` wrapping. [VERIFIED — grep of lines 127-141 shows every value wrapped in `__()`] However, the `four-legs-good` text domain has no loaded `.mo` file [VERIFIED — `is_textdomain_loaded('four-legs-good')` returns false], so `__()` returns the English string unchanged. The wrapping is future-proofing for if/when translation files are added.

**Decision: follow the existing pattern and wrap strings in `__()`.** For the volunteer form, the EN/ES branching is already done by page ID (separate WordPress pages), so `__()` wrapping is cosmetic. But matching the existing pattern avoids style drift.

**EN array (for `is_page(8)`):**
```php
array(
    'err_name'         => __( 'Please enter your full name', 'four-legs-good' ),
    'err_email'        => __( 'Please enter a valid email address', 'four-legs-good' ),
    'err_age'          => __( 'Please enter an age between 1 and 17', 'four-legs-good' ),
    'err_rate_limit'   => __( 'Too many submissions from this device. Please wait an hour and try again, or call us at (845) XXX-XXXX.', 'four-legs-good' ),
    'err_missing_info' => __( 'Some required information is missing. Please review the form and try again.', 'four-legs-good' ),
    'err_generic'      => __( 'Something went wrong submitting your application. Please try again, or call us at (845) XXX-XXXX.', 'four-legs-good' ),
    'err_network'      => __( 'We could not reach our server. Please check your connection and try again, or call us at (845) XXX-XXXX.', 'four-legs-good' ),
    'lang'             => 'en',
    'endpoint'         => 'https://dashboard.4lgshelterapp.duckdns.org/api/volunteers',
)
```

**ES array (for `is_page(345)`):**
```php
array(
    'err_name'         => 'Por favor ingresa tu nombre completo',
    'err_email'        => 'Por favor ingresa un correo electrónico válido',
    'err_age'          => 'Por favor ingresa una edad entre 1 y 17',
    'err_rate_limit'   => 'Demasiados envíos desde este dispositivo. Por favor espera una hora e intenta de nuevo, o llámanos al (845) XXX-XXXX.',
    'err_missing_info' => 'Falta información requerida. Por favor revisa el formulario e intenta de nuevo.',
    'err_generic'      => 'Algo salió mal al enviar tu solicitud. Por favor intenta de nuevo, o llámanos al (845) XXX-XXXX.',
    'err_network'      => 'No pudimos conectar con nuestro servidor. Por favor verifica tu conexión e intenta de nuevo, o llámanos al (845) XXX-XXXX.',
    'lang'             => 'es',
    'endpoint'         => 'https://dashboard.4lgshelterapp.duckdns.org/api/volunteers?lang=es',
)
```

Note: ES strings are NOT wrapped in `__()` because they ARE the translations. `__()` would pass them to gettext which returns them unchanged (no .mo file). Omitting `__()` for the ES array is cleaner and matches the explicit-page-pair pattern.

### 2d. Proposed shared theme file

```
File: /tmp/proposed-volunteer-form.js
SHA256: 6b8210dd097b0e0201c5ac6348ea7686a954695dc64644b0f971a1be37aa01d3
Bytes: 9,531
Lines: 353
node --check: exit 0 [VERIFIED]
Backslashes: 0 [VERIFIED]
Ampersands: 2 (one && operator inside isValidEmail, inherited from original) [VERIFIED]
```

The 2 ampersands are the `&&` in `if (c === 32 || c === 160 || (c >= 9 && c <= 13))` inside the charCodeAt validator. In a theme JS file served via `<script src="...">`, wptexturize never sees this content — the ampersands are safe. [VERIFIED — wptexturize only processes post_content, not external JS files]

### 2e. Behavioral equivalence verification

Diff of proposed file (with EN values substituted back) vs original post 8 inner JS:

```diff
1d0
<                                          (leading blank line in original)
271a271,274
> if ('en' !== 'en') {                     (dead code for EN — never executes)
> payload.language = 'en';
> }
>
315c318,320
< fetch('https://...api/volunteers', {     (URL was inline literal)
---
> var url = 'https://...api/volunteers';   (URL extracted to variable)
>
> fetch(url, {                             (same URL, via variable)
```

**All three differences are structural rearrangements, not behavioral changes:** [VERIFIED]
1. Leading blank line: whitespace-only, no effect
2. Language conditional: `'en' !== 'en'` is false, block never executes, payload is identical to original EN (no `language` field)
3. URL extraction: `fetch(literal, {` → `var url = literal; fetch(url, {` — same URL, same fetch call

Diff of proposed file (with ES values substituted back) vs original post 345 inner JS:

```diff
1d0
<                                          (leading blank line in original)
210d208
< language: 'es',                          (was inline in payload literal)
272a271,274
> if ('es' !== 'en') {                     (TRUE — executes, sets language: 'es')
> payload.language = 'es';
> }
>
316c318,320
< fetch('https://...?lang=es', {           (URL was inline literal)
---
> var url = 'https://...?lang=es';         (URL extracted to variable)
>
> fetch(url, {                             (same URL, via variable)
```

**All three differences are structural rearrangements:** [VERIFIED]
1. Leading blank line: whitespace
2. Language property: moved from inside payload literal to conditional after construction — `if ('es' !== 'en')` is true, so `payload.language = 'es'` executes, producing identical payload
3. URL extraction: same as EN

**Pure relocation + string externalization invariant: SATISFIED.** No line does more than swap a literal for an object reference or restructure the `language` property assignment.

---

## 3 — THE ENQUEUE CODE

### 3a. Current functions.php enqueue region

[VERIFIED — sed -n "110,148p" of functions.php on SiteGround]

```php
function flg_enqueue_scripts() {
    // Main stylesheet
    wp_enqueue_style('flg-style', get_stylesheet_uri(), array(), filemtime(get_stylesheet_directory() . '/style.css'));

    // Google Fonts are loaded via @import in style.css, but we can also enqueue them
    wp_enqueue_style(
        'flg-google-fonts',
        'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
        array(),
        null
    );

    // Theme JavaScript
    wp_enqueue_script('flg-scripts', get_template_directory_uri() . '/js/scripts.js', array(), filemtime(get_stylesheet_directory() . '/js/scripts.js'), true);

    // Inject i18n strings for contact-modal JS (scripts.js)
    wp_localize_script('flg-scripts', 'flg_contact_i18n', array(
        'name_required'     => __('Please enter your name.', 'four-legs-good'),
        'name_too_long'     => __('Name must be 100 characters or fewer.', 'four-legs-good'),
        'email_invalid'     => __('Please enter a valid email address.', 'four-legs-good'),
        'category_required' => __('Please select a subject category.', 'four-legs-good'),
        'subject_required'  => __('Please enter a subject.', 'four-legs-good'),
        'subject_too_long'  => __('Subject must be 150 characters or fewer.', 'four-legs-good'),
        'message_required'  => __('Please enter a message.', 'four-legs-good'),
        'message_too_long'  => __('Message must be 5000 characters or fewer.', 'four-legs-good'),
        'rate_limited'      => __('Too many submissions. Please try again later.', 'four-legs-good'),
        'generic_error'     => __('Something went wrong. Please try again later.', 'four-legs-good'),
        'network_error'     => __('Could not reach the server. Please check your connection and try again.', 'four-legs-good'),
    ));

    // Constant Contact subscribe widget — homepage only
    if (is_front_page() || is_page(335)) {
        wp_enqueue_script('flg-ctct-widget', '//static.ctctcdn.com/js/signup-form-widget/current/signup-form-widget.min.js', array(), null, array('strategy' => 'defer', 'in_footer' => false));
        wp_add_inline_script('flg-ctct-widget', 'var _ctct_m = "634dcebc35a8aa7418621eddcff6c5ac";', 'before');
    }
}
add_action('wp_enqueue_scripts', 'flg_enqueue_scripts');
```

### 3b. Proposed functions.php addition

Insert AFTER the Constant Contact `if` block (after the closing `}` on the line after `wp_add_inline_script`) and BEFORE the closing `}` of `flg_enqueue_scripts()`:

```php
    // Volunteer form JS — extracted from inline <script> in posts 8 (EN) and 345 (ES)
    // The JS is a single shared IIFE with per-language strings injected via wp_localize_script.
    // See: report-20260718-volunteer-extraction-scoping.md
    if ( is_page( 8 ) || is_page( 345 ) ) {
        wp_enqueue_script(
            'flg-volunteer-form',
            get_template_directory_uri() . '/js/volunteer-form.js',
            array(),
            filemtime( get_stylesheet_directory() . '/js/volunteer-form.js' ),
            true
        );

        if ( is_page( 345 ) ) {
            $vol_i18n = array(
                'err_name'         => 'Por favor ingresa tu nombre completo',
                'err_email'        => 'Por favor ingresa un correo electr' . "\xC3\xB3" . 'nico v' . "\xC3\xA1" . 'lido',
                'err_age'          => 'Por favor ingresa una edad entre 1 y 17',
                'err_rate_limit'   => 'Demasiados env' . "\xC3\xAD" . 'os desde este dispositivo. Por favor espera una hora e intenta de nuevo, o ll' . "\xC3\xA1" . 'manos al (845) XXX-XXXX.',
                'err_missing_info' => 'Falta informaci' . "\xC3\xB3" . 'n requerida. Por favor revisa el formulario e intenta de nuevo.',
                'err_generic'      => 'Algo sali' . "\xC3\xB3" . ' mal al enviar tu solicitud. Por favor intenta de nuevo, o ll' . "\xC3\xA1" . 'manos al (845) XXX-XXXX.',
                'err_network'      => 'No pudimos conectar con nuestro servidor. Por favor verifica tu conexi' . "\xC3\xB3" . 'n e intenta de nuevo, o ll' . "\xC3\xA1" . 'manos al (845) XXX-XXXX.',
                'lang'             => 'es',
                'endpoint'         => 'https://dashboard.4lgshelterapp.duckdns.org/api/volunteers?lang=es',
            );
        } else {
            $vol_i18n = array(
                'err_name'         => __( 'Please enter your full name', 'four-legs-good' ),
                'err_email'        => __( 'Please enter a valid email address', 'four-legs-good' ),
                'err_age'          => __( 'Please enter an age between 1 and 17', 'four-legs-good' ),
                'err_rate_limit'   => __( 'Too many submissions from this device. Please wait an hour and try again, or call us at (845) XXX-XXXX.', 'four-legs-good' ),
                'err_missing_info' => __( 'Some required information is missing. Please review the form and try again.', 'four-legs-good' ),
                'err_generic'      => __( 'Something went wrong submitting your application. Please try again, or call us at (845) XXX-XXXX.', 'four-legs-good' ),
                'err_network'      => __( 'We could not reach our server. Please check your connection and try again, or call us at (845) XXX-XXXX.', 'four-legs-good' ),
                'lang'             => 'en',
                'endpoint'         => 'https://dashboard.4lgshelterapp.duckdns.org/api/volunteers',
            );
        }

        wp_localize_script( 'flg-volunteer-form', 'flg_vol_i18n', $vol_i18n );
    }
```

**Insertion point:** After the existing line `wp_add_inline_script('flg-ctct-widget', 'var _ctct_m = "634dcebc35a8aa7418621eddcff6c5ac";', 'before');` and its closing `}`, before the closing `}` of `flg_enqueue_scripts()`. [VERIFIED — this is the last conditional block before the function closes]

**NOTE on UTF-8 accented characters in PHP:** The proposed code above uses byte-escaped concatenation for accented characters (e.g., `"\xC3\xB3"` for ó) to avoid encoding issues during SSH file transfer. Alternative: write the file with a tool that preserves UTF-8, and use literal accented characters. The build should verify the byte values match the original post 345 strings. Simpler alternative if the build tool handles UTF-8 cleanly: just write the accented characters directly:

```php
                'err_email'        => 'Por favor ingresa un correo electrónico válido',
```

Both approaches produce identical bytes. The build should verify.

### 3c. Handle collision check

Existing `wp_enqueue_script` / `wp_register_script` handles in functions.php: [VERIFIED via grep]
- `flg-scripts`
- `flg-ctct-widget`

**`flg-volunteer-form` does NOT collide with any existing handle.** [VERIFIED]

### 3d. Localize attachment

`wp_localize_script` MUST attach to the handle that owns the script using the data. The proposed code attaches `flg_vol_i18n` to `'flg-volunteer-form'`, NOT to `'flg-scripts'`. This is correct — `wp_localize_script` injects a `<script>` tag with `var flg_vol_i18n = {...};` immediately before the enqueued script's `<script src="...">` tag, so the variable is available when the volunteer form JS executes. [VERIFIED — this is how wp_localize_script works per WordPress Codex]

---

## 4 — THE POST_CONTENT EDIT

### 4a. Exact string to remove from post 8

The full `<script>...</script>` block. It starts with `<script>\n(function()` and ends with `})();\n</script>`. Total block including tags: **9,820 bytes**. Appears **exactly once** in post 8. [VERIFIED]

The block to remove is: `<script>` + inner JS (9,803 bytes) + `</script>` = 9,820 bytes.

### 4b. Replacement

**Remove entirely (empty string).** The characters immediately before the block are `\n` (newline) and immediately after are `\n` (newline). [VERIFIED] Removing the block leaves two consecutive newlines at the boundary, which is consistent with the existing spacing between HTML blocks (the `</div>\n\n</div>` pattern already present throughout).

Context around the script block in post 8:
```
...414-9700.</p>
</div>

<script>                    ← REMOVE FROM HERE
(function(){
...
})();
</script>                   ← TO HERE (inclusive)

</div>
<!-- /wp:html -->
```

After removal:
```
...414-9700.</p>
</div>


</div>
<!-- /wp:html -->
```

The double blank line is consistent with WordPress block editor spacing. No dangling whitespace issues.

### 4c. Post 345 boundaries

Same block structure, appears **exactly once** in post 345. [VERIFIED]
- Script block starts at byte offset: **40,314**
- Script block ends at byte offset: **50,226**
- Block length: **9,912 bytes** (92 bytes larger than post 8 due to longer Spanish strings)
- Characters before/after: both `\n` [VERIFIED]

### 4d. Remaining content after removal

| | Post 8 | Post 345 |
|---|---|---|
| Before removal | 50,700 bytes | 51,764 bytes |
| Block removed | 9,820 bytes | 9,912 bytes |
| **After removal** | **40,880 bytes** | **41,852 bytes** |

What stays: [VERIFIED]
- Form HTML with `id="volunteer-form"` — 71 references survive (down from 74; the 3 lost are JS references inside the removed IIFE) [VERIFIED]
- Submit button with class `btn-submit` — 7 references survive [VERIFIED]
- All form fields, labels, error spans, success message div
- PDF download row, styling, all non-JS content

**ONLY the `<script>...</script>` block leaves.**

### 4e. FM6 — Double-load safety

**The volunteer IIFE is double-load safe. Running it twice does NOT produce a SyntaxError.** [VERIFIED]

Analysis:
1. **Entire script is wrapped in IIFE** `(function(){...})()` — all declarations (`var`, `function`, `const`, `let`) are function-scoped. [VERIFIED — line 1 opens IIFE, last line closes with `})();`]
2. **No global declarations.** Zero `var`/`let`/`const`/`function` at module scope. [VERIFIED — grep for declarations at indent level 0 returns only IIFE-internal lines]
3. **`const`/`let` inside IIFE:** 6 instances, all inside `isValidEmail()` function body. These are function-scoped within isValidEmail, which is itself inside the IIFE. A second IIFE execution creates a new function scope — no redeclaration conflict. [VERIFIED]
4. **Compare with adoption form:** The adoption script declares `const REQUIRED_TEXT_FIELDS = [...]` at global scope (bare declaration, no IIFE). A second execution would hit `SyntaxError: Identifier 'REQUIRED_TEXT_FIELDS' has already been declared`. The volunteer IIFE does NOT have this problem.

**Double-load consequence (not SyntaxError, but behavioral):**
- Second IIFE would call `getElementById('volunteer-form')` again — returns same element, safe
- Would add duplicate event listeners (`submit`, `blur`, `input`, `change`) — submit handler fires twice, second fetch is redundant but not an error
- This is "double-fire redundancy" not "crash" — cache-flush is still important for cleanliness (duplicate submissions to the rate-limited endpoint) but not for site-breaking

**Cache-flush requirement severity: MEDIUM.** Stale cached page + enqueued file = functional but double-submitting. Not a SyntaxError, not a white screen. The server's 429 rate limit protects against the duplicate submission actually creating duplicate records. Still, cache should be flushed as part of the build.

---

## 5 — THE SIMPLIFIED GUARD

### 5a. Post-extraction guard checks

Post-extraction threats:
- **(a) Theme file deleted/emptied/broken** — `js/volunteer-form.js` missing or corrupted
- **(b) Form HTML removed from post_content** — `volunteer-form` anchor gone from posts 8/345

Current guard checks that become OBSOLETE after extraction:
- `function isValidEmail` in post_content — **GONE** (moved to theme file)
- `updateSubmitState` in post_content — **GONE** (moved to theme file)
- Backslash count change — **MOOT** (no JS in post_content means no backslashes to corrupt)
- wptexturize adjacency scan — **MOOT** (no `<script>` block in post_content)

Proposed simplified guard on post save:
1. ✅ Check `volunteer-form` anchor still present in post_content (catches HTML removal)
2. ❌ Check theme file integrity — **THIS IS THE WRONG TRIGGER**

### 5b. Theme-file integrity: post-save guard CANNOT protect it

**A `wp_insert_post_data` hook fires when a POST is saved. It does NOT fire when a theme file is edited, deleted, or overwritten.** [VERIFIED — WordPress hook documentation: `wp_insert_post_data` triggers only on `wp_insert_post()` / `wp_update_post()` calls]

A post-save hook can technically `file_get_contents(get_template_directory() . '/js/volunteer-form.js')` and check its contents, but this only runs when someone saves post 8 or 345 — which might be never. A theme file could be deleted and the guard would never fire until the next post save.

**The post-save guard can meaningfully protect only the post_content** (form HTML anchor).

**Theme-file integrity belongs in a different mechanism:**
- **Weekly health check** (already does HTTP probes) — add a probe for `https://johnv80.sg-host.com/wp-content/themes/4lg-theme/js/volunteer-form.js` to confirm it serves JS, returns 200, and contains `isValidEmail`
- **Manual verification at deploy time** — the build step itself verifies the file after writing

The health check is the right long-term home because:
1. It runs regardless of post saves
2. It can verify the file is actually SERVED (not just present on disk)
3. It can check both presence and content integrity
4. It already has an alert mechanism

### 5c. Guard options summary

| Threat | Right mechanism | Coverage |
|--------|----------------|----------|
| Form HTML removed from post_content | Post-save guard (`wp_insert_post_data`) | ✅ Catches it at save time, before it's live |
| Theme JS file deleted | Weekly health check (HTTP probe) | ✅ Catches it within 7 days; detection delay acceptable because the file has no reason to change outside of deliberate maintenance |
| Theme JS file corrupted/emptied | Weekly health check (file content check or `node --check` on served content) | ✅ Same as above |
| functions.php enqueue removed | Weekly health check (check if `<script src="...volunteer-form.js">` appears in served page HTML) | ✅ The served-page probe catches this too |
| Both inline and external present (stale cache) | Not a guard concern — self-resolving as cache expires | N/A |

**Recommendation:** The post-extraction volunteer guard shrinks to a single check: `volunteer-form` anchor in post_content on save of posts 8/345. Everything else moves to the health check. The guard file itself becomes much simpler — possibly simple enough to merge into the adoption guard (shared `wp_insert_post_data` hook, separate check functions per post-set), but that's a design decision for the build prompt.

---

## 6 — ROLLBACK ARTIFACTS

### 6a. Revert files

The existing `/tmp/post8-revert.html` and `/tmp/post345-revert.html` are from the charCodeAt swap (earlier this session). They contain the pre-swap regex content, NOT the current charCodeAt content. [INFERRED — they were written as revert targets for the swap operation]

**Fresh revert files MUST be captured at build time** with the current live content (which has the charCodeAt validator). The build should:
```
wp eval "echo get_post_field('post_content', 8, 'raw');" > /tmp/post8-pre-extraction.html
wp eval "echo get_post_field('post_content', 345, 'raw');" > /tmp/post345-pre-extraction.html
```
These are the authoritative rollback targets.

### 6b. Rollback sequence

Given the FM6 analysis (volunteer IIFE is double-load safe), rollback order is flexible but the cleanest is:

**If the build fails AFTER writing theme file + enqueue but BEFORE removing inline JS:**
- No rollback needed. Both inline and external run — double-load is safe (redundant, not crashing). Remove the enqueue addition from functions.php and delete the theme file at leisure.

**If the build fails AFTER all three steps and something is wrong:**

1. **Restore post_content FIRST** (re-add inline `<script>` to posts 8 and 345 via `wp post update <ID> <filepath>`)
   - This restores the inline script. Now both inline and external run — double-load safe, no SyntaxError window.
2. **Remove enqueue from functions.php** (restore the `.bak` or manually remove the volunteer block)
   - Now only inline runs. Back to pre-extraction state.
3. **Delete theme file** `js/volunteer-form.js`
   - Cleanup. Already dequeued in step 2.
4. **Flush cache** (`wp cache flush && wp sg purge`)

**The key insight: because the volunteer IIFE is double-load safe, there is NO dangerous ordering window.** Any intermediate state (inline+external, inline-only, external-only) either works correctly or fails gracefully. This is in contrast to the adoption form, where double-load would SyntaxError on `const REQUIRED_TEXT_FIELDS` redeclaration.

### 6c. functions.php backup

```
Current path: /home/customer/www/johnv80.sg-host.com/public_html/wp-content/themes/4lg-theme/functions.php
Current size: 70,406 bytes [VERIFIED]
Last modified: 2026-07-07 18:53 [VERIFIED]
```

**YES — a timestamped `.bak` is required before editing.** The build must run:
```
cp functions.php functions.php.bak-$(date +%Y%m%d-%H%M%S)
```

Existing `.bak` files (7 total, all from 2026-07-07): [VERIFIED]
```
functions.php.bak-20260707-021700  (54,740 bytes)
functions.php.bak-20260707-023800  (61,524 bytes)
functions.php.bak-20260707-032652  (61,563 bytes)
functions.php.bak-20260707-044611  (67,187 bytes)
functions.php.bak-20260707-134717  (67,348 bytes)
functions.php.bak-20260707-142704  (68,094 bytes)
functions.php.bak-20260707-185231  (68,558 bytes)
```

---

## Scratch artifacts written

| File | SHA256 | Bytes | Purpose |
|------|--------|-------|---------|
| `/tmp/vol-8-inner.js` | `242669c3...fc371c` | 9,803 | Post 8 inner JS verbatim |
| `/tmp/vol-345-inner.js` | `ec1635fa...f7fbe2` | 9,895 | Post 345 inner JS verbatim |
| `/tmp/proposed-volunteer-form.js` | `6b8210dd...37aa01d3` | 9,531 | Proposed shared theme file |

---

## Five-line summary

```
proposed-volunteer-form.js node --check: pass, backslashes: 0, ampersands: 2
string externalization covers all EN/ES diffs: yes, 9
volunteer IIFE double-load safe (no SyntaxError on double run): yes
theme-file integrity checkable by post-save guard: no — weekly health check (HTTP probe for served JS file)
enqueue handle flg-volunteer-form collides with existing: no
```
