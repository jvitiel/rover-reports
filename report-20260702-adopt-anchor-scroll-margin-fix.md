# Adopt Page Anchor Scroll-Margin — Implementation

## Step 1 — Backup

```
cp style.css style.css.bak-20260702-035058
```

Backup file: `style.css.bak-20260702-035058` (64,099 bytes, same directory as style.css). [VERIFIED via `ls -la`]

## Step 2 — Rule Added

Appended to the END of `/home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/style.css`:

```css
/* Deep-link anchor offset so the fixed 52px header does not cover the adopt-page anchor */
#adoption-application { scroll-margin-top: 100px; }
```

## Step 3 — Tail Verification

```
p.has-primary-color.has-heading-font-family[style*="font-weight:700"] {
    text-shadow:
        -1px -1px 0 rgba(0,0,0,0.5),
         1px -1px 0 rgba(0,0,0,0.5),
        -1px  1px 0 rgba(0,0,0,0.5),
         1px  1px 0 rgba(0,0,0,0.5);
}

/* Deep-link anchor offset so the fixed 52px header does not cover the adopt-page anchor */
#adoption-application { scroll-margin-top: 100px; }
```

Rule is well-formed, braces balanced, appended cleanly after the last existing rule. [VERIFIED via `tail -10`]

## Step 4 — Cache Purge

```
$ wp sg purge
Success: Speed Optimizer by SiteGround assets folder purged successfully.
Warning: Unable to Purge File Cache. Please make sure it is enabled.
Success: Dynamic Cache Successfully Purged.
```

SG assets folder + dynamic cache purged. File cache was not enabled (warning only, not an error). [VERIFIED]

## Step 5 — Live Verification

### 5a — Rule served in production CSS

```
$ curl -s 'https://www.fourlegsgoodnynj.org/wp-content/themes/4lg-theme/style.css' | grep -n 'adoption-application'
1859:#adoption-application { scroll-margin-top: 100px; }
```

Rule is live at line 1859 of the served stylesheet. [VERIFIED]

### 5b — Page status (no regression)

```
EN:  curl -sSI -L 'https://www.fourlegsgoodnynj.org/adopt/'                → HTTP/2 200
ES:  curl -sSI -L 'https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/' → HTTP/2 200
```

Both pages serve 200. [VERIFIED]

## Summary

| Item | Value |
|------|-------|
| File modified | `4lg-theme/style.css` (line 1859) |
| Backup | `style.css.bak-20260702-035058` |
| Rule | `#adoption-application { scroll-margin-top: 100px; }` |
| Cache purge | SG assets + dynamic cache purged |
| EN page | 200 ✅ |
| ES page | 200 ✅ |
| CSS served | Line 1859 ✅ |

No other files, templates, pages, DB options, or services were touched.
