# Website 4 — EIN String Diagnosis

**Date:** 2026-06-30 22:38 UTC  
**Task:** Locate all instances of "EIN # 27-039-7638" in the WordPress theme for scope of upcoming change to "EIN # 27-0397638".

---

## All Instances Found

### Instance 1 — footer.php line 13 (PRIMARY)

**File:** `footer.php` on SiteGround (live, Jun 1 2026)  
**Line 13:**

```php
<p><?php esc_html_e('EIN # 27-039-7638', 'four-legs-good'); ?></p>
```

**Context (lines 5–15):**
```php
                    <?php else : ?>
                        <div class="footer-logo">
                            <img src="<?php echo esc_url(get_template_directory_uri() . '/4lg_logo.jpg'); ?>" alt="<?php esc_attr_e('Four Legs Good', 'four-legs-good'); ?>">
                            <div class="footer-logo-text"><?php esc_html_e('Four Legs Good', 'four-legs-good'); ?><span><?php esc_html_e('Animal Rescue', 'four-legs-good'); ?></span></div>
                        </div>
                        <p><?php esc_html_e('A 501(c)(3) nonprofit no-kill animal rescue serving Rockland County, NY', 'four-legs-good'); ?></p>
                        <p><?php esc_html_e('EIN # 27-039-7638', 'four-legs-good'); ?></p>
                        <button type="button" class="btn-primary contact-modal-trigger" id="contact-modal-trigger" aria-haspopup="dialog"><?php esc_html_e('Contact Us', 'four-legs-good'); ?></button>
                    <?php endif; ?>
                </div>
                <div class="footer-col">
```

**Notes:**
- Wrapped in `esc_html_e()` with textdomain `'four-legs-good'` [VERIFIED — line 13 of live footer.php via SFTP]
- Inside the `else` fallback of `is_active_sidebar('footer-brand')` — renders when no widget overrides the footer brand area
- This is the source string that gettext uses as both the lookup key and the English fallback

### Instance 2 — es_ES.po lines 32–33 (TRANSLATION)

**File:** `languages/es_ES.po` on SiteGround (Jun 1 2026)  
**Lines 32–33:**

```po
msgid "EIN # 27-039-7638"
msgstr "EIN # 27-039-7638"
```

**Context (lines 28–40):**
```po
msgstr "Una organización sin fines de lucro 501(c)(3) de rescate animal sin sacrificio que sirve al Condado de Rockland, NY"

msgid "EIN # 27-039-7638"
msgstr "EIN # 27-039-7638"

#: footer.php:13 footer.php:77
msgid "Contact Us"
msgstr "Contáctanos"

#: footer.php:20 header.php:18 header.php:28
msgid "Adopt"
```

**Notes:**
- The `msgid` (lookup key) must exactly match the source string in `esc_html_e()` — if footer.php changes, this msgid must change to match [VERIFIED — gettext key-matching semantics]
- The `msgstr` is also "EIN # 27-039-7638" (identical to English — the EIN number is the same in Spanish)
- The compiled `es_ES.mo` was built from this .po file

### Instance 3 — four-legs-good.pot (NOT PRESENT)

**File:** `languages/four-legs-good.pot` (May 24 2026)  
**Result:** No "EIN" or "27-039" match [VERIFIED — grep returned 0 matches]

The .pot template predates the EIN addition (May 24 vs Jun 1). The .po entry was added manually without regenerating the .pot. This is cosmetically out of sync but functionally irrelevant — WordPress uses the .mo, not the .pot, at runtime.

### No Other Instances

All other theme PHP files were checked via SFTP pull + grep:

| File | EIN present? |
|------|-------------|
| functions.php | No |
| front-page.php | No |
| header.php | No |
| index.php | No |
| page-events.php | No |
| page-stories.php | No |
| page.php | No |
| single.php | No |
| singular.php | No |

[VERIFIED — grep -c "EIN\|27-039" on all pulled files returned 0]

---

## Assessment

### Change scope: 3 files, multi-file edit + .mo recompilation required

| File | Change needed |
|------|--------------|
| `footer.php` line 13 | Change `'EIN # 27-039-7638'` → `'EIN # 27-0397638'` inside `esc_html_e()` |
| `es_ES.po` lines 32–33 | Change both `msgid` and `msgstr` from `"EIN # 27-039-7638"` → `"EIN # 27-0397638"` |
| `es_ES.mo` | Recompile from updated .po (required — WordPress loads the binary .mo, not the text .po) |

**Why all three?** The `esc_html_e()` source string is the gettext lookup key. If footer.php says `'EIN # 27-0397638'` but the .po still has `msgid "EIN # 27-039-7638"`, the Spanish translation will fall back to the source string (which would show the correct new format, but the .po would have a stale orphan entry). Updating the .po msgid keeps the translation file in sync. Recompiling the .mo makes the .po change take effect at runtime.

**Optional but not required:** Regenerating `four-legs-good.pot` to include the EIN string. Low priority — the .pot is a developer template, not used at runtime.
