# Adoption Form Email Regex Forensics — 2026-07-18

## A — WHICH SAVE ATE THE BACKSLASH (Post 7)

### A1. isValidEmail character class per revision

Extraction method: `wp post get <ID> --field=content | grep -o "/\^.*test(email)" | od -c`

| Rev ID | Date (UTC) | od -c output of regex | Backslash present? |
|--------|-----------|----------------------|-------------------|
| 206 | 2026-03-15 14:38:47 | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` | **YES** — `\ s` at offsets 0x4-5, 0xF-10, 0x15-16; `\ .` at 0x12-13 |
| 211 | 2026-03-15 15:23:28 | same as 206 | **YES** |
| 214 | 2026-03-15 15:37:58 | same as 206 | **YES** |
| 215 | 2026-03-15 16:09:37 | same as 206 | **YES** |
| 295 | 2026-03-31 19:00:50 | same as 206 | **YES** |
| 407 | 2026-06-17 22:42:57 | same as 206 | **YES** |
| 409 | 2026-06-20 21:15:52 | same as 206 | **YES** |
| **441** | **2026-07-06 17:00:10** | `/^[^s@]+@[^s@]+.[^s@]+$/.test(email)` | **NO** — backslashes absent; 0x45 bytes vs 0x51 |
| 443 | 2026-07-06 17:20:32 | same as 441 | **NO** |
| 492 | 2026-07-14 13:26:15 | same as 441 | **NO** |
| 7 (current) | — | same as 441 | **NO** |

Raw od -c for the intact regex (revisions 206–409):
```
0000000   /   ^   [   ^   \   s   @   ]   +   @   [   ^   \   s   @   ]
0000020   +   \   .   [   ^   \   s   @   ]   +   $   /   .   t   e   s
0000040   t   (   e   m   a   i   l   )  \n
0000051
```

Raw od -c for the corrupted regex (revisions 441–current):
```
0000000   /   ^   [   ^   s   @   ]   +   @   [   ^   s   @   ]   +   .
0000020   [   ^   s   @   ]   +   $   /   .   t   e   s   t   (   e   m
0000040   a   i   l   )  \n
0000045
```

[VERIFIED — od -c output from SSH, all 11 revisions checked]

### A2. Boundary

**Last intact revision:** ID 409, 2026-06-20 21:15:52 UTC — backslashes present.
**First corrupted revision:** ID 441, 2026-07-06 17:00:10 UTC — backslashes absent.

The break happened between 2026-06-20 21:15:52 and 2026-07-06 17:00:10 UTC. The corrupting save was revision 441.

[VERIFIED — od -c comparison above]

### A3. Backslash counts per revision

| Rev ID | Date (UTC) | Backslash count |
|--------|-----------|----------------|
| 206 | 2026-03-15 14:38:47 | **4** |
| 211 | 2026-03-15 15:23:28 | **4** |
| 214 | 2026-03-15 15:37:58 | **4** |
| 215 | 2026-03-15 16:09:37 | **4** |
| 295 | 2026-03-31 19:00:50 | **4** |
| 407 | 2026-06-17 22:42:57 | **4** |
| 409 | 2026-06-20 21:15:52 | **4** |
| **441** | **2026-07-06 17:00:10** | **0** ← DROP: 4→0 |
| 443 | 2026-07-06 17:20:32 | **0** |
| 492 | 2026-07-14 13:26:15 | **0** |
| 7 (current) | — | **0** |

The count dropped from **4 → 0** at revision 441. All 4 backslashes were removed in a single save. There was no gradual multi-level stripping — the content went from 4 backslashes to 0 in one operation.

The 4 backslashes correspond exactly to the 4 escapes in the regex: `\s` (×3) and `\.` (×1). No other backslashes existed anywhere else in the post_content, so the regex was the ONLY backslash-containing content and it was completely stripped.

Command: `wp post get <ID> --field=content | tr -cd '\\' | wc -c`

[VERIFIED — tr/wc output for each revision]

### A4. Content lengths per revision

| Rev ID | Date (UTC) | Backslashes | LENGTH(post_content) |
|--------|-----------|------------|---------------------|
| 206 | 2026-03-15 14:38:47 | 4 | 74,157 |
| 211 | 2026-03-15 15:23:28 | 4 | 63,144 |
| 214 | 2026-03-15 15:37:58 | 4 | 74,857 |
| 215 | 2026-03-15 16:09:37 | 4 | 74,884 |
| 295 | 2026-03-31 19:00:50 | 4 | 74,878 |
| 407 | 2026-06-17 22:42:57 | 4 | 75,330 |
| 409 | 2026-06-20 21:15:52 | 4 | 75,302 |
| 441 | 2026-07-06 17:00:10 | 0 | 76,308 |
| 443 | 2026-07-06 17:20:32 | 0 | 76,226 |
| 492 | 2026-07-14 13:26:15 | 0 | 76,576 |
| 7 (current) | — | 0 | 76,576 |

The content grew from 75,302 (rev 409) to 76,308 (rev 441) — an increase of 1,006 bytes despite losing 4 bytes of backslashes. This means ~1,010 bytes of new content were added in the same save that stripped the backslashes. The corruption was a side effect of a content edit, not a standalone save.

[VERIFIED — wp db query LENGTH(post_content) output]

---

## B — IS THE SPANISH COPY (POST 339) ALSO BROKEN?

### B1. isValidEmail regex per revision

| Rev ID | Date (UTC) | Regex bytes | Backslash present? | Backslash count | LENGTH |
|--------|-----------|------------|-------------------|----------------|--------|
| 340 | 2026-05-24 16:20:38 | (no isValidEmail) | N/A | 0 | 65 |
| 368 | 2026-05-24 19:44:44 | (no isValidEmail) | N/A | 0 | 21,896 |
| 372 | 2026-05-25 20:19:38 | intact: `\s` `\.` present | **YES** | 4 | 78,189 |
| 376 | 2026-05-25 21:19:08 | intact (×2 matches — see note) | **YES** | 8 | 156,376 |
| 377 | 2026-05-25 21:19:43 | intact | **YES** | 4 | 78,187 |
| 378 | 2026-05-25 21:41:38 | intact | **YES** | 4 | 78,196 |
| 408 | 2026-06-17 22:43:00 | intact | **YES** | 4 | 78,658 |
| 410 | 2026-06-20 21:15:58 | intact | **YES** | 4 | 78,607 |
| **442** | **2026-07-06 17:07:45** | corrupted: `[^s@]` | **NO** | **0** ← DROP: 4→0 | 79,619 |
| 444 | 2026-07-06 17:21:33 | corrupted | **NO** | 0 | 79,529 |
| 493 | 2026-07-14 13:26:23 | corrupted | **NO** | 0 | 79,919 |
| 339 (current) | — | corrupted | **NO** | 0 | 79,919 |

**Note on rev 376:** The grep returned the regex pattern TWICE (8 backslashes, content length 156,376 — exactly 2× the normal size). This revision appears to contain the form content duplicated. Revision 377 (19 seconds later) has 4 backslashes and normal length, suggesting the duplication was noticed and corrected immediately.

**Note on revs 340/368:** These predate the form being added to the Spanish page. Rev 340 is 65 bytes (placeholder content), rev 368 is 21,896 bytes (partial build).

[VERIFIED — od -c, tr/wc, and LENGTH() output for all revisions]

### B2. Post 339 regex — current state

**Corrupted.** The isValidEmail regex in the current post 339 is:

```
/^[^s@]+@[^s@]+.[^s@]+$/.test(email)
```

od -c:
```
0000000   /   ^   [   ^   s   @   ]   +   @   [   ^   s   @   ]   +   .
0000020   [   ^   s   @   ]   +   $   /   .   t   e   s   t   (   e   m
0000040   a   i   l   )  \n
0000045
```

Identical corruption to post 7: all 4 backslashes stripped, `[^\s@]` → `[^s@]`, `\.` → `.`.

[VERIFIED — od -c output]

### B3. Is post 339 translated or a copy of the English form?

Post 339 IS translated into Spanish. Evidence from the database (`wp post get 339 --field=content`):

Three `.field-error` spans:
```html
<span class="field-error">Por favor ingresa tu nombre completo</span>
<span class="field-error">Por favor ingresa un correo electrónico válido</span>
<span class="field-error">Por favor ingresa tu número de teléfono celular</span>
```

The `data.language` assignment in the submit handler:
```javascript
       EN: data.language = 'en';
       ES: data.language = 'es';
```

The submit handler contains a conditional that sets `data.language = 'es'` (versus `'en'` in post 7). This is a genuine Spanish translation of the form, not a copy of the English version.

**Correction to prior report:** The 2026-07-17 validation diagnosis report compared `/es/adopt/` to `/adopt/` and found "zero differences." This comparison was invalid: `/es/adopt/` returns a 301 redirect to `/adopt/` (established in the source-location report), so it was comparing post 7 against itself. The actual Spanish form at `/es/adopta-una-mascota/` (post 339) has Spanish labels, Spanish error messages, and `data.language = 'es'`.

[VERIFIED — wp post get 339 --field=content grep output]

### B4. Set-difference check for post 339

#### B4a. validateForm() from post 339 (verbatim from database):

```javascript
    function validateForm() {
      let isValid = true;
      let firstError = null;
      
      // Clear previous errors
      document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
      document.querySelectorAll('input.error, select.error, textarea.error').forEach(el => el.classList.remove('error'));
      
      // Validate required text fields (from config)
      REQUIRED_TEXT_FIELDS.forEach(field => {
        const input = document.querySelector(`[name="${field.name}"]`);
        if (!input.value.trim()) {
          showFieldError(input);
          isValid = false;
          if (!firstError) firstError = input;
        }
      });
      
      // Email validation (special case - format check)
      const emailInput = document.querySelector('[name="applicant_email"]');
      if (emailInput.value && !isValidEmail(emailInput.value)) {
        showFieldError(emailInput);
        isValid = false;
        if (!firstError) firstError = emailInput;
      }
      
      // Validate required checkboxes (from config)
      REQUIRED_CHECKBOXES.forEach(name => {
        const checkbox = document.querySelector(`[name="${name}"]`);
        if (checkbox && !checkbox.checked) {
          showFieldError(checkbox);
          isValid = false;
          if (!firstError) firstError = checkbox;
        }
      });
      
      // Animal type (required radio group)
      const animalType = document.querySelector('input[name="animal_type"]:checked');
      if (!animalType) {
        const container = document.querySelector('.animal-type-cards');
        container.closest('.form-group').querySelector('.field-error').classList.add('visible');
        isValid = false;
        if (!firstError) firstError = container;
      }
      
      // Agreement checkboxes (all must be checked, from config)
      let allAgreed = true;
      AGREEMENT_CHECKBOXES.forEach(name => {
        if (!document.querySelector(`[name="${name}"]`).checked) {
          allAgreed = false;
        }
      });
      if (!allAgreed) {
        document.getElementById('agreementError').classList.add('visible');
        isValid = false;
        if (!firstError) firstError = document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`);
      }
      
      // Scroll to first error
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return isValid;
    }
```

#### B4b. Config arrays from post 339:

```javascript
    const REQUIRED_TEXT_FIELDS = [
      { name: 'applicant_name', label: 'Nombre Completo' },
      { name: 'applicant_email', label: 'Correo Electrónico' },
      { name: 'applicant_phone_cell', label: 'Teléfono Celular' },
      { name: 'applicant_address', label: 'Dirección' },
      { name: 'applicant_city', label: 'Ciudad' },
      { name: 'applicant_state', label: 'Estado' },
      { name: 'applicant_zip', label: 'Código Postal' },
      { name: 'digital_signature_name', label: 'Firma Digital' }
    ];

    const REQUIRED_CHECKBOXES = [
      'age_confirmed'
    ];

    const AGREEMENT_CHECKBOXES = [
      'willing_animal_control_laws',
      'willing_sign_papers',
      'willing_followup'
    ];
```

Same field names as post 7, labels translated to Spanish.

#### B4c. Fields in post 339 markup with HTML `required` attribute:

```
applicant_name          <input type="text" name="applicant_name" required>
applicant_email         <input type="email" name="applicant_email" required>
applicant_phone_cell    <input type="tel" name="applicant_phone_cell" required>
applicant_address       <input type="text" name="applicant_address" required>
applicant_city          <input type="text" name="applicant_city" required>
applicant_state         <input type="text" name="applicant_state" required>
applicant_zip           <input type="text" name="applicant_zip" required>
age_confirmed           <input type="checkbox" name="age_confirmed" required>
animal_type (cat)       <input type="radio" name="animal_type" value="cat" required>
willing_animal_control  <input type="checkbox" name="willing_animal_control_laws" value="yes" required>
willing_sign_papers     <input type="checkbox" name="willing_sign_papers" value="yes" required>
willing_followup        <input type="checkbox" name="willing_followup" value="yes" required>
digital_signature_name  <input type="text" name="digital_signature_name" required style="font-style: italic;">
```

13 fields total — identical field set to post 7.

[VERIFIED — grep of post 339 post_content from database]

#### B4d. Set difference

**None.** Post 339's validateForm() checks the same 13 fields. The 13 HTML `required` fields and the 13 JS-validated fields are an exact match, same as post 7.

---

## C — WHAT DID IT COST (VPS Database)

### C1. Schema

```sql
CREATE TABLE adoption_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    ...
    applicant_email TEXT NOT NULL,
    ...
);
```

Email column: `applicant_email`. Timestamp column: `submitted_at`.

[VERIFIED — `.schema adoption_applications` output via sqlite3 read-only mode]

### C2. Total applications per month

| Month | Count |
|-------|-------|
| 2026-06 | 2 |
| 2026-07 | 24 |

[VERIFIED — sqlite3 query output]

### C3. Discriminating query — "s" in email local part

```sql
SELECT strftime('%Y-%m', submitted_at) AS month,
  SUM(CASE WHEN instr(substr(applicant_email, 1, instr(applicant_email,'@')-1), 's') > 0 THEN 1 ELSE 0 END) AS has_s,
  SUM(CASE WHEN instr(substr(applicant_email, 1, instr(applicant_email,'@')-1), 's') = 0 THEN 1 ELSE 0 END) AS no_s,
  COUNT(*) AS total
FROM adoption_applications GROUP BY 1 ORDER BY 1;
```

| Month | has_s | no_s | total |
|-------|-------|------|-------|
| 2026-06 | 1 | 1 | 2 |
| 2026-07 | 5 | 19 | 24 |

**Observation:** `has_s` is non-zero in 2026-07 (5 applications). This does NOT disprove the theory — see C4 for the date boundary.

### C4. Applications on or after 2026-07-01

| id | submitted_at | local part has 's' |
|----|-------------|-------------------|
| 14 | 2026-07-01T16:52:07 | YES — 's' present |
| 15 | 2026-07-03T20:34:45 | YES — 's' present |
| 16 | 2026-07-03T23:15:24 | NO |
| 17 | 2026-07-05T01:02:01 | NO |
| 18 | 2026-07-05T01:11:39 | YES — 's' present |
| 19 | 2026-07-05T13:08:12 | YES — 's' present |
| 20 | 2026-07-05T18:38:40 | YES — 's' present |
| 21 | 2026-07-06T22:09:41 | NO |
| 22 | 2026-07-07T19:00:59 | NO |
| 23 | 2026-07-08T16:50:36 | NO |
| 24 | 2026-07-09T00:06:44 | NO |
| 25 | 2026-07-09T20:02:11 | NO |
| 26 | 2026-07-09T21:44:00 | NO |
| 27 | 2026-07-09T22:47:09 | NO |
| 28 | 2026-07-10T17:25:26 | NO |
| 29 | 2026-07-10T23:55:44 | NO |
| 30 | 2026-07-12T01:46:22 | NO |
| 31 | 2026-07-12T14:11:33 | NO |
| 32 | 2026-07-12T16:14:01 | NO |
| 33 | 2026-07-14T03:10:34 | NO |
| 34 | 2026-07-15T04:28:06 | NO |
| 35 | 2026-07-15T13:44:18 | NO |
| 36 | 2026-07-16T20:15:13 | NO |
| 37 | 2026-07-17T15:56:31 | NO |

(Email addresses redacted per PII policy. Full data viewable in shelter.db `adoption_applications` table.)

**Most recent application with 's' in the email local part: id 20, 2026-07-05T18:38:40Z.**

From id 21 (2026-07-06T22:09:41) onward — 17 consecutive applications — **not a single email local part contains the letter 's'**. The pattern is consistent with the broken regex blocking 's'-containing emails, but the sample is not large enough to rule out coincidence on its own. The revision forensics in section A provide the stronger evidence.

### C5. Date agreement

- **Revision boundary (A2):** backslash present through rev 409 (2026-06-20 21:15:52), absent from rev 441 (2026-07-06 17:00:10).
- **Last 's' application (C4):** id 20, 2026-07-05T18:38:40Z.

These **agree**. The last successful 's' email (July 5 18:38 UTC) predates the first corrupted revision (July 6 17:00 UTC). The form was still serving the pre-441 content on July 5. By July 6 at 17:00, the corrupted revision was saved and published.

Note: application id 21 (2026-07-06T22:09:41, no 's' in local part) is the first application after the corruption, submitted ~5 hours after rev 441 was saved. This is consistent but does not independently prove causation — the email simply doesn't contain 's'.

---

## D — COLLATERAL: WHAT ELSE IS ALREADY DAMAGED

### D1. Regex and backslash-escape inventory in current post 7

The current post 7 post_content contains **zero backslashes** (verified by `tr -cd '\\' | wc -c` = 0).

**The isValidEmail regex is the ONLY regex literal in the post_content.** Grep for `.test(`, `.match(`, `.replace(`, `new RegExp`, `/^` returned only the one isValidEmail line:

```javascript
return /^[^s@]+@[^s@]+.[^s@]+$/.test(email);
```

No other function uses a regex. No template literals or strings in the post_content contain backslash escapes (there are none — the backslash count is 0).

[VERIFIED — grep output showing only the isValidEmail match; tr/wc showing 0 backslashes]

### D2. The 61 surviving backslashes

The 61 backslashes in the RENDERED page come from **outside the post_content**. They are in:

1. **WordPress Speculation Rules JSON** (rendered page line 2159): `"/*\\?(.+)"` — 1 backslash + JSON string escapes (~2 backslashes)
2. **wp-emoji-loader.min.js** (rendered page line 2171): Unicode escapes like `\ud83c`, `\ufe0f`, `\u200d`, etc. — ~59 backslashes

These are WordPress core scripts injected by `wp_head()`/`wp_footer()`, not by the post content. They are intact and unrelated to the corruption — they were never stored in post_content and are not processed by `wp_kses` or the block editor's save pipeline.

**The post_content has zero backslashes. The form's JS has zero backslashes. The only regex is damaged. There is nothing else to damage.**

[VERIFIED — curl + awk showing the 2 lines containing backslashes in the rendered page]

### D3. Other regex-dependent functions in post 7

None. `isValidEmail` is the only function using a regex. No `.match()`, `.replace()` with regex, or `new RegExp()` calls exist in the post_content.

[VERIFIED — grep output]

### D4. Same for post 339

Identical findings. Post 339 has zero backslashes, one regex (isValidEmail, corrupted), no other regex-dependent functions.

```javascript
return /^[^s@]+@[^s@]+.[^s@]+$/.test(email);
```

[VERIFIED — grep and tr/wc output for post 339]

---

## E — THE SAVE PATH

### E1. Hooks on content_save_pre, wp_insert_post_data, content_filtered_save_pre

**In theme/mu-plugins:** Zero hits. No custom hooks in `4lg-theme/functions.php`, `4lg-theme/functions.php.bak-*`, or `mu-plugins/*.php` on `content_save_pre` or `content_filtered_save_pre`.

**In plugins:**

`wp_insert_post_data` hooks:
- `polylang/src/modules/sync/admin-sync.php:30` — syncs post data between translations
- `polylang/src/modules/sync/sync.php:56` — `can_sync_post_data`
- `seo-by-rank-math/.../class-lock-modified-date.php:34` — modifies post_modified
- `seo-by-rank-math/.../class-content-ai-page.php:43` — `remove_unused_generated_content`
- `seo-by-rank-math/.../class-instant-indexing.php:78` — `before_save_post`
- `seo-by-rank-math/vendor/.../ActionScheduler_wpPostStore.php:81` — action scheduler internal

`content_save_pre` reference:
- `seo-by-rank-math/vendor/.../ActionScheduler_wpPostStore.php:84` — checks for `wp_filter_post_kses` on `content_save_pre` (this is the WordPress core KSES filter — it mentions it to conditionally remove/restore it for action scheduler posts)

**No custom code in the theme or mu-plugins touches post_content during save.** The stripping is from WordPress core's standard save pipeline (block parser re-serialization and/or KSES filtering).

[VERIFIED — grep output]

### E2. Attribution of corrupting revisions

| Rev ID | Date (UTC) | post_author |
|--------|-----------|-------------|
| 206 | 2026-03-15 14:38:47 | 1 (Four Legs Good) |
| 211 | 2026-03-15 15:23:28 | 1 |
| 214 | 2026-03-15 15:37:58 | 1 |
| 215 | 2026-03-15 16:09:37 | 1 |
| 295 | 2026-03-31 19:00:50 | 1 |
| 407 | 2026-06-17 22:42:57 | **0** |
| 409 | 2026-06-20 21:15:52 | **0** |
| **441** | **2026-07-06 17:00:10** | **0** ← first corrupted |
| 443 | 2026-07-06 17:20:32 | **0** |
| 492 | 2026-07-14 13:26:15 | **0** |

**Observations:**
- Revisions 206–295 (March 2026): `post_author=1` — user "Four Legs Good" (the admin account). These are human saves via the WordPress editor.
- Revisions 407–492 (June–July 2026): `post_author=0` — no authenticated user. This indicates programmatic saves (REST API without auth, WP-CLI, or a scheduled process). These saves pair EN+ES within seconds (407/408, 409/410, 441/442, 443/444, 492/493).
- The `_edit_last` meta on post 7 is `1` (user "Four Legs Good"), but this tracks the last *interactive* edit, not programmatic saves.

**The break is NOT at the author=0 boundary.** Revisions 407 and 409 are also `post_author=0` but have intact backslashes. Something changed between revision 409 (June 20) and 441 (July 6) in the save mechanism or in how the content was passed to `wp_update_post`.

The `functions.php.bak-*` files are all dated 2026-07-07 — the day AFTER the first corruption. Multiple backup files on the same day suggest active code changes were being made to functions.php on July 7, possibly in response to or alongside the content updates that caused the corruption.

[VERIFIED — wp db query output for post_author; ls output for functions.php.bak dates]

### E3. No save test performed

Confirmed: no post was saved, updated, or re-saved during this investigation.

---

A2: backslash present through revision 409 (2026-06-20 21:15:52); absent from revision 441 (2026-07-06 17:00:10)
A3: backslash count dropped 4 -> 0 at revision 441
B2: post 339 regex is corrupted
B4d: required fields NOT checked by post 339's validateForm(): none
C4: most recent application with 's' in email local part: 2026-07-05, id 20
C5: revision boundary and application data agree
