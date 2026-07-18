# Volunteer Form JS Extraction — Preflight

Date: 2026-07-18T19:34Z
Type: read-only preflight — zero changes made
Posts: 8 (EN /how-to-help/), 345 (ES /es/como-ayudar/)

---

## 1 — Scoping Report Availability

The full extraction scoping report is committed and readable:

```
Commit: 82959ba "Report: volunteer form JS extraction scoping"
File: report-20260718-volunteer-extraction-scoping.md (30,661 bytes)
URL: https://raw.githubusercontent.com/jvitiel/rover-reports/main/report-20260718-volunteer-extraction-scoping.md
```

[VERIFIED — `git log --oneline -3` shows commit 82959ba, file exists on disk at 30,661 bytes]

---

## 2 — Served-Page Script Block Verification

### Permalinks

```
Post  8 (EN): https://www.fourlegsgoodnynj.org/how-to-help/
Post 345 (ES): https://www.fourlegsgoodnynj.org/es/como-ayudar/
```

[VERIFIED — `wp post url 8 345`]

### Post 8 (EN) — served page

```
Served page size:         106,554 bytes
Total <script> blocks:    10
Volunteer IIFE blocks:    1 (matched by '(function(){' + 'volunteer-form')
Opening marker:           <script>
Closing marker:           </script>
Block total bytes:        9,820
IIFE confirmed:           starts with (function(){ — ends with })();
Backslashes:              0
Ampersands:               2 (the && in charCodeAt validator)
HTML entity &#038;:       0
node --check:             PASS (exit 0)
```

[VERIFIED — curl of served page, python extraction, node --check]

### Post 345 (ES) — served page

```
Served page size:         108,117 bytes
Total <script> blocks:    10
Volunteer IIFE blocks:    1
Opening marker:           <script>
Closing marker:           </script>
Block total bytes:        9,912
IIFE confirmed:           starts with (function(){ — ends with })();
Backslashes:              0
Ampersands:               2 (the && in charCodeAt validator)
HTML entity &#038;:       0
node --check:             PASS (exit 0)
```

[VERIFIED — same method as post 8]

### Removal boundary markers

Both posts: the inline script block is delimited by bare `<script>` (no attributes) and `</script>` tags. The block to remove from post_content is everything from `<script>` through `</script>` inclusive. The tag has no `type`, `id`, `src`, or other attributes — it is unambiguously `<script>` followed by `\n(function(){`.

The script block is the only `<script>` tag in each post's post_content (the other 9 script blocks in the served HTML come from WordPress core, theme, and plugins). [VERIFIED — earlier scoping report confirmed `POST8_SCRIPT_COUNT: 1`, `POST345_SCRIPT_COUNT: 1` in post_content]

---

## 3 — Theme js/ Directory

```
$ ls -la wp-content/themes/4lg-theme/js/
total 20
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso  4096 Mar 10 01:06 .
drwxr-xr-x 7 u3058-gfugkrmqxgso u3058-gfugkrmqxgso  4096 Jul  7 18:53 ..
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 10412 Jun  1 14:37 scripts.js
```

**`volunteer-form.js` does NOT exist yet.** [VERIFIED] Only `scripts.js` (10,412 bytes) is present.

---

## 4 — functions.php Enqueue Region

The `flg_enqueue_scripts` function (lines 111–148) is the sole enqueue hook. Full current content:

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

[VERIFIED — `sed -n "110,150p" functions.php`]

**Insertion point for new volunteer-form enqueue:** After the Constant Contact `if` block's closing `}` (line 146 per the function body), before the closing `}` of `flg_enqueue_scripts()` (line 147). The new code goes between those two braces.

---

## 5 — Guard mu-plugins

### Presence

```
mu-plugins/ contents (4 files):
  4lg-adopt-form-guard.php       8,548 bytes   2026-07-18 01:30
  4lg-disable-user-enumeration.php 4,184 bytes 2026-07-17 00:57
  4lg-volunteer-form-guard.php   9,957 bytes   2026-07-18 16:48
  dashboard-service-role.php     1,664 bytes   2026-05-23 22:20
```

**Both guard mu-plugins present.** [VERIFIED]

### Volunteer guard specifics

**Watched post IDs:**
```php
function fourlg_vol_guard_watched_posts() {
    return array( 8, 345 );
}
```
[VERIFIED — lines 42–44]

**Content anchors checked (in `fourlg_vol_guard_check`):**

| Check | Anchor string | Line | What it detects |
|-------|--------------|------|-----------------|
| Form HTML | `'volunteer-form'` | 100–101 | Form element removed from post_content |
| Email validator | `'function isValidEmail'` | 111 | JS validator function gone from post_content |
| Submit-enable | `'updateSubmitState'` | 117 | Submit button enabler gone from post_content |

[VERIFIED — grep output from guard source]

**Extraction impact:** Checks for `function isValidEmail` (line 111) and `updateSubmitState` (line 117) will FALSE POSITIVE after extraction because those strings move from post_content to the theme file. The `volunteer-form` HTML anchor (lines 100–101) will continue to work correctly. The guard must be simplified concurrently with or before the extraction.
