# Footer Brand Text + EIN Update

**Date:** 2026-05-28 15:55 ET  
**Type:** Implementation (SiteGround theme files)

---

## Changes

### footer.php (line 12–13)

**Before:**
```php
                        <p><?php esc_html_e('A 501(c)(3) nonprofit no-kill animal rescue serving Rockland County, NY and beyond.', 'four-legs-good'); ?></p>
                        <button type="button"
```

**After:**
```php
                        <p><?php esc_html_e('A 501(c)(3) nonprofit no-kill animal rescue serving Rockland County, NY', 'four-legs-good'); ?></p>
                        <p><?php esc_html_e('EIN # 27-039-7638', 'four-legs-good'); ?></p>
                        <button type="button"
```

Line count: 166 → 167

### es_ES.po (lines 29–30)

**Before:**
```
msgid "A 501(c)(3) nonprofit no-kill animal rescue serving Rockland County, NY and beyond."
msgstr "Una organización sin fines de lucro 501(c)(3) de rescate animal sin sacrificio, que sirve al condado de Rockland, NY y más allá."
```

**After:**
```
msgid "A 501(c)(3) nonprofit no-kill animal rescue serving Rockland County, NY"
msgstr "Una organización sin fines de lucro 501(c)(3) de rescate animal sin sacrificio que sirve al Condado de Rockland, NY"

msgid "EIN # 27-039-7638"
msgstr "EIN # 27-039-7638"
```

### File sizes

| File | Pre-edit | Post-edit |
|------|----------|-----------|
| footer.php | 12,998 bytes (166 lines) | 13,077 bytes (167 lines) |
| es_ES.po | 9,564 bytes (446 lines) | 9,591 bytes (449 lines) |
| es_ES.mo | 6,988 bytes | 7,013 bytes |

---

## Verification [VERIFIED]

### EN (https://johnv80.sg-host.com/)
```html
<p>A 501(c)(3) nonprofit no-kill animal rescue serving Rockland County, NY</p>
<p>EIN # 27-039-7638</p>
```
✅ No "and beyond", no trailing period  
✅ EIN line present immediately below description

### ES (https://johnv80.sg-host.com/es/como-ayudar/)
```html
<p>Una organización sin fines de lucro 501(c)(3) de rescate animal sin sacrificio que sirve al Condado de Rockland, NY</p>
<p>EIN # 27-039-7638</p>
```
✅ Spanish translation rendered correctly  
✅ EIN line present (same as English, as designed)

### No collateral damage
- footer-adopt, footer-involved, footer-visit sections unchanged [VERIFIED — curl output shows identical Adopt/Get Involved/Visit sections]
- Social icons, copyright line, legal links row unchanged [VERIFIED]
- No other theme files modified
