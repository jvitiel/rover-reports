# Volunteer Form Guard — Design Inventory — 2026-07-18

Read-only investigation to scope a new mu-plugin guarding posts 8 (EN) and 345 (ES) volunteer forms.

---

## 1 — THE EXISTING ADOPTION GUARD (reference pattern)

### 1a — Full Source

```php
<?php
/**
 * Plugin Name: 4LG - Adoption Form Guard
 * Description: Watches the adoption form pages for the failure that took the form down on 2026-07-06. Alerts. Never blocks a save.
 * Version: 1.0.0
 * Author: 4LG (Website discipline)
 *
 * WHY THIS EXISTS
 * On 2026-07-06 a programmatic save called wp_update_post() without wp_slash().
 * WordPress ran wp_unslash() over post_content and deleted every lone backslash.
 * The adoption form's email validator changed meaning from "not whitespace, not
 * at-sign" to "not the letter s, not at-sign". For eleven days the form told
 * every applicant whose email contained an "s" before the "@" -- roughly half of
 * all real addresses -- that their own address was invalid. No way to proceed, no
 * error reaching the shelter. Nobody wrote that bug. A save did, and the same
 * save destroyed the evidence of what it had done.
 *
 * The 2026-07-18 repair removed every backslash from posts 7 and 339, which makes
 * wp_unslash() a no-op there. That is a property of the CONTENT, not of the save
 * pipeline. The pipeline is unchanged. The moment anyone puts a backslash back
 * into those pages, the failure mode returns exactly as before.
 *
 * WHY wp_insert_post_data AND NOT save_post
 * save_post fires after the database write, when the previous content -- the only
 * evidence that anything was lost -- is already gone. wp_insert_post_data fires at
 * wp-includes/post.php:4885, three lines before wp_unslash() at :4888. That is the
 * only point in the pipeline where the incoming content and the currently stored
 * content are both visible, which is what the "escapes are being eaten right now"
 * check requires.
 *
 * THIS FILTER NEVER BLOCKS A SAVE.
 * It returns $data unmodified on every path, including every error path. A guard
 * that could block edits to the adoption form would be a worse outage than the one
 * it exists to catch. It observes and it tells someone. That is all.
 */
```

(Full source is 194 lines — already captured in prior inventory. Structure: watched-posts function, alert-recipient function, pure check function, record-and-notify function, wp_insert_post_data anonymous filter.) [VERIFIED — cat output]

### 1b — Hook Registration

```php
add_filter( 'wp_insert_post_data', function( $data, $postarr ) { ... }, 10, 2 );
```

- **Hook:** `wp_insert_post_data`
- **Priority:** 10
- **Args:** 2 (`$data`, `$postarr`)

[VERIFIED — grep line 184 of guard file]

### 1c — Option Name

The adoption guard writes to: `fourlg_adopt_guard_state`

Proposed volunteer option: `fourlg_volunteer_guard_state`

```
$ wp option get fourlg_volunteer_guard_state
Error: Could not get 'fourlg_volunteer_guard_state' option. Does it exist?
```

**Confirmed: `fourlg_volunteer_guard_state` does not exist and is safe to use.** [VERIFIED — wp option get output]

### 1d — Alert Recipient

```php
function fourlg_guard_alert_recipient() {
    return '<REDACTED — hardcoded alert recipient>';
}
```

Hardcoded, not from `admin_email`. The new guard uses the same recipient and the same rationale (reaching the person who will act). [VERIFIED]

---

## 2 — VOLUNTEER FORM INVARIANTS

### 2a — Form Tags

**Post 8:**
```html
<form id="volunteer-form" novalidate>
```

**Post 345:**
```html
<form id="volunteer-form" novalidate>
```

Both identical. Both have `novalidate`. [VERIFIED — get_post_field + preg_match output]

### 2b — isValidEmail Line (Current State)

**Post 8, line 516 of post_content (line 31 of script block):**
```javascript
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
```

**Post 345, line 517 of post_content (line 31 of script block):**
```javascript
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
```

Identical in both. Contains 4 backslashes (`\s` × 4). This is the regex that will be replaced with a charCodeAt-based validator (matching what was done for the adoption form on 2026-07-18). [VERIFIED — line-level extraction]

### 2c — Stable Email-Validator Anchor

The guard needs a string present in BOTH the current regex implementation AND the future charCodeAt implementation.

| String | Current (regex) | Future (charCodeAt) | Stable? |
|--------|----------------|---------------------|---------|
| `function isValidEmail` | PRESENT | Will be present (function name stays) | **YES** |
| `isValidEmail(` | 4 occurrences | Will remain (call sites unchanged) | **YES** |
| `charCodeAt` | ABSENT | Will be present | NO (fails pre-fix) |
| `.test(value)` | PRESENT | Will be absent | NO (fails post-fix) |

**Recommended anchor: `function isValidEmail`** — the function declaration is present in both implementations. The guard checks "an email validator function exists" without caring which implementation is inside it.

Additional consideration: The adoption guard checks for `charCodeAt` specifically because posts 7/339 were already fixed. The volunteer guard could initially check for `function isValidEmail` (covers both states), then optionally add a `charCodeAt` check after the volunteer fix ships (when backslashes reach 0). [VERIFIED — strpos checks on both posts]

### 2d — Stable Form-Presence Anchor

| String | Post 8 | Post 345 | Unique to volunteer? |
|--------|--------|----------|---------------------|
| `volunteer-form` | PRESENT | PRESENT | Yes — not in adoption posts |
| `updateSubmitState` | PRESENT | PRESENT | Yes — adoption uses `validateForm` |
| `btn-submit` | PRESENT | PRESENT | Possibly shared (check adoption) |
| `novalidate` | PRESENT | PRESENT | Shared with adoption |

**Recommended form-presence anchor: `volunteer-form`** — this is the form `id`, unique to volunteer posts, and the analog of the adoption guard's `adoptionForm` check. [VERIFIED]

### 2e — Current Backslash Counts

```
Post 8:   4 backslashes
Post 345: 4 backslashes
```

All 4 in each post are `\s` sequences in the email regex. After the planned fix (charCodeAt replacement), both will have 0 backslashes. [VERIFIED]

**Guard design implication:** The backslash checks work in both states:
- **Pre-fix (4 backslashes):** A save dropping from 4→0 triggers "ESCAPES ARE BEING DESTROYED" (the 07-06 failure). The "CORRUPTIBLE CONTENT" warning does NOT fire because the backslashes are pre-existing, not being introduced.
- **Post-fix (0 backslashes):** The guard behaves identically to the adoption guard — backslash count dropping is vacuous (0→0), and introducing backslashes triggers the "CORRUPTIBLE CONTENT" warning.

Wait — re-examining the adoption guard logic:

```php
if ( $bs_in > 0 ) {
    $problems[] = 'CORRUPTIBLE CONTENT INTRODUCED...';
}
```

This fires whenever the *incoming* content has backslashes, regardless of whether they were already there. **Pre-fix, the volunteer guard would fire "CORRUPTIBLE CONTENT INTRODUCED" on EVERY clean save** because the incoming content already contains 4 backslashes.

**CRITICAL: The volunteer guard must NOT copy this check verbatim for pre-fix state.** Options:
1. Change the check to `$bs_in > 0 && $bs_cur === 0` (only alert when backslashes are new, not pre-existing)
2. Change to `$bs_in > $bs_cur` (alert when count increases)
3. Deploy the guard AFTER the charCodeAt fix lands (so both posts start at 0 backslashes)

Option 3 is simplest and matches how the adoption guard was deployed (after backslashes were already removed). Option 1 or 2 would work for pre-fix deployment but adds complexity.

---

## 3 — RENDERED-SCRIPT CHECK (wptexturize invariant)

### 3a — Safety of apply_filters('the_content') Inside wp_insert_post_data

Filters registered on `the_content` at this install:

```
Priority 8:  apply_block_hooks_to_content_from_post_object
Priority 8:  WP_Embed::run_shortcode
Priority 8:  WP_Embed::autoembed
Priority 9:  do_blocks
Priority 10: wptexturize
Priority 10: wpautop
Priority 10: shortcode_unautop
Priority 10: prepend_attachment
Priority 10: wp_replace_insecure_home_url
Priority 10: RankMath\Frontend_SEO_Score::insert_score
Priority 11: capital_P_dangit
Priority 11: do_shortcode
Priority 11: RankMath\Schema\Snippet_Shortcode::output_schema_in_content
Priority 12: wp_filter_content_tags
Priority 20: convert_smilies
```

[VERIFIED — wp eval listing $wp_filter['the_content']]

**Risky filters identified:**
- `do_blocks` (priority 9) — parses Gutenberg blocks, may query database
- `do_shortcode` (priority 11) — executes shortcodes, can trigger arbitrary PHP
- `WP_Embed::run_shortcode` / `autoembed` (priority 8) — may make external HTTP requests for oEmbed
- `wp_filter_content_tags` (priority 12) — modifies image tags, may query attachment metadata
- `RankMath` hooks — may query/update SEO state

**CONCLUSION: Calling `apply_filters('the_content', $incoming)` inside `wp_insert_post_data` is UNSAFE.** Side effects include: shortcode execution, external HTTP requests (oEmbed), database queries, and potentially state mutations from plugins like RankMath. The adoption guard does NOT call `apply_filters` — it does pure string checks only.

**Use raw scan instead.** [INFERRED — based on filter chain analysis. Not tested with full post_content due to potential side effects.]

### 3b — Raw Scan Heuristic

Can a raw scan reliably detect "a JS `<` comparison followed by `&` before the next `>`"?

**The fundamental problem:** In raw post_content, `<` appears in both HTML tags (`<div>`, `<form>`, `<p>`) and JS comparisons (`i < length`). A raw scan for `<..&..>` patterns will match HTML tags containing `&` (e.g. `<a href="page&id=1">`) as false positives.

**However, the specific dangerous pattern is narrower:** `wp_html_split` only creates false tags when a JS `<` comparison opens a "tag" that spans across a `&&` or `&` in JS before hitting a `>` character. The span can be enormous (1800+ bytes in the V1 scroll fix). HTML tags are short and self-contained.

**Practical heuristic:** Scan only within `<script>...</script>` blocks (extracted via regex from raw content), then check for `<` characters inside that extracted JS. Any `<` in the extracted JS is a comparison operator (since HTML tags within a script block's text content are not real HTML). Then check if, between that `<` and the next `>` in the full post_content (not just the script), there exists a `&`.

**Limitation:** This heuristic is sound IF the `<script>` block is correctly extracted. The regex `/<script[^>]*>(.*?)<\/script>/s` reliably extracts the script content in these posts. Within the extracted JS, every `<` IS a comparison (or part of `<=`, `<<`, etc.), never an HTML tag. So checking for `<..&..>` within the extracted JS has no false-positive risk.

**Honest assessment:** A raw scan restricted to within `<script>` blocks CAN reliably detect the dangerous pattern. The adoption guard doesn't do this check, but the volunteer guard could add it as an extra layer. The check would be: extract script block, scan for `<` followed by `&` before the next `>` within the script text. If found, warn that the JS is at risk of wptexturize corruption.

**Current state:** Posts 8 and 345 have zero dangerous adjacencies right now. [VERIFIED — scan output]

---

## 4 — HOOK FIRING CONFIRMATION

### 4a — Post Types

```
Post 7:   type=page
Post 8:   type=page
Post 339: type=page
Post 345: type=page
```

All four are `page` type. `wp_insert_post_data` fires for all post types with no type gating — it's a universal pre-save filter. The hook will fire identically for posts 8/345 as it does for 7/339. [VERIFIED]

### 4b — No Overlap with Adoption Guard

The adoption guard watches:
```php
function fourlg_guard_watched_posts() {
    return array( 7, 339, 494 );
}
```

Posts 8 and 345 are NOT in this array. The adoption guard's `in_array()` check will skip them. No double-fire will occur when the volunteer guard is added — each guard checks its own post list independently. [VERIFIED]

---

## 5 — COLLISION AND COEXISTENCE

### 5a — Two Hooks at Priority 10

Both guards hooking `wp_insert_post_data` at priority 10 is safe because:
- Neither modifies `$data` — both return it unmodified
- They operate on disjoint post ID sets (7/339/494 vs 8/345)
- Even if both somehow fired on the same post, they'd both read-only and record independently
- Load order affects which runs first, but since neither mutates, order is irrelevant

mu-plugins load in alphabetical order: `4lg-adopt-form-guard.php` before `4lg-volunteer-form-guard.php`. This is fine. [INFERRED — standard WordPress mu-plugin loading behavior]

### 5b — Current mu-plugins Directory

```
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 18 01:30 .
drwxr-xr-x 9 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 18 16:25 ..
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 8548 Jul 18 01:30 4lg-adopt-form-guard.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4184 Jul 17 00:57 4lg-disable-user-enumeration.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

Three files. The new file (`4lg-volunteer-form-guard.php`) will make four. [VERIFIED — ls -la output]

### 5c — Ownership and Permissions

All existing mu-plugins:
```
644 u3058-gfugkrmqxgso:u3058-gfugkrmqxgso
```

The new file must match: mode 644, owner `u3058-gfugkrmqxgso:u3058-gfugkrmqxgso`. [VERIFIED — stat output]

---

## DESIGN OBSERVATIONS (facts, not recommendations)

1. **Transition-period complexity:** The volunteer form currently has 4 backslashes. Deploying the guard before the charCodeAt fix means the "CORRUPTIBLE CONTENT INTRODUCED" check from the adoption guard would false-positive on every clean save. Deploying AFTER the fix (when backslash count = 0) avoids this entirely and matches the adoption guard's deployment sequence.

2. **Guard function naming:** The adoption guard uses global function names (`fourlg_guard_check`, `fourlg_guard_record`, etc.). The volunteer guard MUST use different names to avoid fatal "cannot redeclare function" errors. Suggested pattern: `fourlg_vol_guard_check`, `fourlg_vol_guard_record`, `fourlg_vol_guard_watched_posts`, `fourlg_vol_guard_alert_recipient`.

3. **Email check anchor during transition:** Before the charCodeAt fix, the guard should check for `function isValidEmail` (present in both implementations). After the fix, it could additionally check for `charCodeAt` (matching the adoption guard's check). Or it could just check `function isValidEmail` permanently — simpler and stable across both states.

4. **Volunteer-specific failure mode:** If JS dies on the volunteer form, the submit button stays permanently disabled (starts `disabled` in HTML, JS enables it). This is 100% submission blockage with no visible error. The adoption form at least showed "Email invalid" messages. The volunteer form would silently appear broken — fields fillable but button dead.

5. **No canary post needed:** The adoption guard watches post 494 as a canary for testing. The volunteer guard could add one, but end-to-end testing can also be done by saving a test-purpose post (or by temporarily adding a draft post ID to the watched list for testing, then removing it).

---

## SUMMARY ANSWERS

1. **Stable email-validator anchor present in both pre-fix and post-fix:** `function isValidEmail`
2. **apply_filters the_content safe inside wp_insert_post_data hook:** no — use raw scan (do_shortcode, do_blocks, oEmbed have side effects)
3. **Proposed option name fourlg_volunteer_guard_state unused:** confirmed
