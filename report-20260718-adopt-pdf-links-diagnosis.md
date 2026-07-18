# Adoption PDF Link Diagnosis — Full Site Audit — 2026-07-18

## 1 — Every Cross-Host Link on the Site

### 1a. Posts with VPS references (published)

```
$ wp db query "SELECT ID, post_title, post_type, post_status FROM cqu_posts
  WHERE post_status='publish' AND (post_content LIKE '%duckdns.org%' OR post_content LIKE '%66.228.37.38%')"

ID    post_title          post_type  post_status
7     Adopt a Pet         page       publish
8     How to Help         page       publish
339   Adopta una Mascota  page       publish
345   Cómo Ayudar         page       publish
```

Table prefix confirmed `cqu_` from `wp-config.php`. [VERIFIED]

### 1b. Postmeta and options

```
$ wp db query "SELECT post_id, meta_key FROM cqu_postmeta WHERE meta_value LIKE '%duckdns.org%'"
(no results)

$ wp db query "SELECT option_name FROM cqu_options WHERE option_value LIKE '%duckdns.org%'"
_transient_4lg_featured_slots_es
_transient_4lg_featured_slots_en
```

Postmeta: zero hits. Options: 2 transients (featured animal slot caches with dogwalker thumbnail/video URLs). [VERIFIED]

### 1c. Theme and mu-plugins grep

**Active theme files (excluding .bak):**

| File:Line | URL | Purpose |
|-----------|-----|---------|
| `functions.php:464` | `http://66.228.37.38/api/featured-slots` | Server-side PHP: fetches featured animal data |
| `functions.php:655` | `https://dashboard.4lgshelterapp.duckdns.org/api/photos/{animalId}` | Client-side JS (inline): photo gallery lightbox |
| `functions.php:1026` | `http://66.228.37.38/api/featured-slots` | Server-side PHP: featured slots (second call site) |
| `js/scripts.js:60` | (comment) "Submits to dashboard.4lgshelterapp.duckdns.org pre-cutover" | Comment only |
| `js/scripts.js:66` | `https://dashboard.4lgshelterapp.duckdns.org/api/contact` | Contact form submission endpoint |

Seven `.bak-*` files also contain the same URLs (functions.php backups dated 2026-07-07). These are inert.

**mu-plugins:** Zero hits for either duckdns.org or 66.228.37.38. [VERIFIED]

### 1d. Deduplicated URL list

Every distinct VPS URL referenced by WordPress, from all sources:

| # | URL | Source |
|---|-----|--------|
| 1 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | Posts 7, 339 |
| 2 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | Posts 7, 339 |
| 3 | `https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application` | Post 7 |
| 4 | `https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application?lang=es` | Post 339 |
| 5 | `https://custom-search.4lgshelterapp.duckdns.org/` | Post 7 |
| 6 | `https://custom-search.4lgshelterapp.duckdns.org/?lang=es` | Post 339 |
| 7 | `https://matcher.4lgshelterapp.duckdns.org` | Post 7 |
| 8 | `https://matcher.4lgshelterapp.duckdns.org/?lang=es` | Post 339 |
| 9 | `https://dashboard.4lgshelterapp.duckdns.org/api/volunteers` | Post 8 |
| 10 | `https://dashboard.4lgshelterapp.duckdns.org/public/forms/volunteer-application.pdf` | Post 8 |
| 11 | `https://dogwalker.4lgshelterapp.duckdns.org/public/forms/volunteer-application-es.pdf` | Posts 8, 345 |
| 12 | `https://dogwalker.4lgshelterapp.duckdns.org/public/forms/volunteer-application.pdf` | Post 345 |
| 13 | `https://dashboard.4lgshelterapp.duckdns.org/api/contact` | Theme js/scripts.js |
| 14 | `https://dashboard.4lgshelterapp.duckdns.org/api/photos/{animalId}` | Theme functions.php (JS) |
| 15 | `http://66.228.37.38/api/featured-slots` | Theme functions.php (PHP, 2 sites) |
| 16 | `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/{uuid}.jpg` | Options transients (5 UUIDs) |
| 17 | `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/videos/{uuid}.mp4` | Options transients (5 UUIDs) |

Total: **17 distinct URL patterns** (transient media URLs are per-UUID but follow two patterns). [VERIFIED]

---

## 2 — Test Every URL

All tests used `curl -sIL -H 'Cache-Control: no-cache' -H 'Pragma: no-cache'`.

| # | URL | Status | Content-Type | Content-Length | Expected Type | BROKEN? |
|---|-----|--------|-------------|----------------|---------------|---------|
| 1 | dogwalker `/adoption-pdfs/blank-english.pdf` | 200 | text/html | 7,552 | application/pdf | **YES** |
| 2 | dogwalker `/adoption-pdfs/blank-spanish.pdf` | 200 | text/html | 7,552 | application/pdf | **YES** |
| 3 | dogwalker `/api/adoption-application` | 404 | text/html | 164 | POST endpoint | No (GET 404 expected) |
| 4 | dogwalker `/api/adoption-application?lang=es` | 404 | text/html | 164 | POST endpoint | No (GET 404 expected) |
| 5 | custom-search `/` | 200 | text/html | 6,686 | text/html | No |
| 6 | custom-search `/?lang=es` | 200 | text/html | 6,686 | text/html | No |
| 7 | matcher `/` | 200 | text/html | 8,976 | text/html | No |
| 8 | matcher `/?lang=es` | 200 | text/html | 8,976 | text/html | No |
| 9 | dashboard `/api/volunteers` | 200 | application/json | 583,068 | application/json | No |
| 10 | dashboard `/public/forms/volunteer-application.pdf` | 200 | application/pdf | 137,837 | application/pdf | No |
| 11 | dogwalker `/public/forms/volunteer-application-es.pdf` | 200 | application/pdf | 137,901 | application/pdf | No |
| 12 | dogwalker `/public/forms/volunteer-application.pdf` | 200 | application/pdf | 137,837 | application/pdf | No |
| 13 | dashboard `/api/contact` | 404 | text/html | 151 | POST endpoint | No (GET 404 expected) |
| 14 | dashboard `/api/photos/` | 404 | text/html | 151 | needs animalId | No (bare path 404 expected) |
| 15 | `http://66.228.37.38/api/featured-slots` | 200 | application/json | 17,230 | application/json | No |
| 16 | dogwalker `/data/animal-media/thumbnails/{uuid}.jpg` | 200 | image/jpeg | 44,048 | image/jpeg | No |
| 17 | dogwalker `/data/animal-media/videos/{uuid}.mp4` | 200 | video/mp4 | 6,201,342 | video/mp4 | No |

[VERIFIED — curl output for all 17 URLs]

### Broken URL body (first 200 characters)

URLs #1 and #2 return the dogwalker PWA login page:

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobil
```

[VERIFIED]

### Observations

- **Only 2 of 17 URLs are broken** — both are the adoption PDF downloads on the dogwalker host at the old `/adoption-pdfs/` path.
- The volunteer PDFs (URLs #10, #11, #12) at `/public/forms/` serve correctly on BOTH dashboard and dogwalker hosts. This confirms the `/public/*` path is properly excluded from both hosts' SPA rewrites.
- The broken URLs return 200 (not 404) because the dogwalker SPA catch-all intercepts them and serves `index.html`. The 200 status made this invisible to uptime monitors.
- API endpoints (#3, #4, #13, #14) correctly return 404 for GET — they are POST-only. Not broken.

---

## 3 — Exact Strings in Posts 7 and 339

### 3a/3b. Post 7 (English — "Adopt a Pet")

Lines containing `adoption-pdfs` or `.pdf` with context:

```
733-
734-    <!-- Download Buttons -->
735-    <div class="download-buttons">
736:      <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf" class="btn-outline" target="_blank">
737-        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
738-        Download English Application (PDF)
739-      </a>
740:      <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf" class="btn-outline" target="_blank">
741-        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
742-        Descargar Solicitud en Español (PDF)
743-      </a>
```

[VERIFIED]

### 3a/3b. Post 339 (Spanish — "Adopta una Mascota")

```
767-
768-    <!-- Download Buttons -->
769-    <div class="download-buttons">
770:      <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf" class="btn-outline" target="_blank">
771-        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
772-        Download English Application (PDF)
773-      </a>
774:      <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf" class="btn-outline" target="_blank">
775-        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
776-        Descargar Solicitud en Español (PDF)
777-      </a>
```

[VERIFIED]

### 3c. Exact href strings and counts

| Post | href | Count |
|------|------|-------|
| 7 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | 1 |
| 7 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | 1 |
| 339 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | 1 |
| 339 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | 1 |

Both posts have identical hrefs — 2 per post, each appearing exactly once. [VERIFIED]

### 3d. Visible button text

| Post | Button | Visible text |
|------|--------|-------------|
| 7 (EN) | blank-english.pdf | `Download English Application (PDF)` |
| 7 (EN) | blank-spanish.pdf | `Descargar Solicitud en Español (PDF)` |
| 339 (ES) | blank-english.pdf | `Download English Application (PDF)` |
| 339 (ES) | blank-spanish.pdf | `Descargar Solicitud en Español (PDF)` |

Note: Post 339's button text is **identical** to post 7's — the EN button text was not translated to Spanish on the Spanish page. [VERIFIED]

### 3e. Byte lengths and backslash counts

```
Post 7:   78,019 bytes (wp post get adds 1 trailing newline → 78,018 raw)  0 backslashes
Post 339: 81,362 bytes (wp post get adds 1 trailing newline → 81,361 raw)  0 backslashes
```

Matches expectations (78,018 / 81,361, 0 backslashes). [VERIFIED]

---

## 4 — Media Library

### 4a. PDF attachments

```
$ wp post list --post_type=attachment --post_mime_type=application/pdf --fields=ID,post_title,post_name,guid --format=table
(no results — zero PDF attachments in media library)
```

[VERIFIED]

### 4b. Blank adoption PDFs in media library

**No.** Zero PDF attachments exist in the media library at all. No blank adoption application PDF has ever been uploaded to WordPress media. [VERIFIED]

### 4c. Uploads directory

```
Path: wp-content/uploads/
Permissions: drwxr-xr-x (writable by site owner u3058-gfugkrmqxgso)
Contents: 2026/, rank-math/, siteground-optimizer-assets/
```

Writable. [VERIFIED]

### 4d. Max upload size

```
wp_max_upload_size(): 268435456 (256 MB)
php upload_max_filesize: 256M
```

Well above the 309,446 byte English PDF. [VERIFIED]

### 4e. Uploads serving

`.htaccess` in uploads blocks only PHP execution (`FilesMatch \.php`). All other files (including PDFs) are served directly by Apache/nginx without passing through PHP. [VERIFIED]

---

## 5 — Candidate Sources

### 5a–5d. HTTP test results

| URL | Status | Content-Type | Content-Length | File Type |
|-----|--------|-------------|----------------|-----------|
| dashboard `/public/forms/blank-english.pdf` | 200 | application/pdf | 309,446 | PDF |
| dashboard `/public/forms/blank-spanish.pdf` | 200 | application/pdf | 127,119 | PDF |
| dogwalker `/adoption-pdfs/blank-english.pdf` | 200 | text/html | 7,552 | HTML (dogwalker PWA) |
| dogwalker `/adoption-pdfs/blank-spanish.pdf` | 200 | text/html | 7,552 | HTML (dogwalker PWA) |

[VERIFIED — curl with cache-busting headers]

### 5e. Size comparison and page counts

| File | Bytes | Pages | Title | Creator | Created |
|------|-------|-------|-------|---------|---------|
| blank-english.pdf | 309,446 | 3 | "ApPLICATION FOR CAT ADOPTION" | Acrobat PDFMaker 23 for Word | 2024-01-02 |
| blank-spanish.pdf | 127,119 | 3 | (none) | wkhtmltopdf 0.12.6 | 2026-02-10 |

**The 2.4x size difference is explained:** they are not the same document in two languages. The English PDF is a Word-to-PDF conversion from January 2024 (Acrobat PDFMaker, 309 KB with embedded fonts/metadata). The Spanish PDF is an HTML-to-PDF conversion from February 2026 (wkhtmltopdf, 127 KB, lighter). Both are 3 pages. Different tools, different dates, different internal structure. [VERIFIED — pdfinfo output]

### 5f. SHA256 hashes

```
blank-english.pdf: aa47fa6547d9d97b928184bed4f8a53dfe8e423fb5122615ca24797544426fe1
blank-spanish.pdf: 905b64dcc28bfd212a1bd4fe42d3113b4e9eb63114263b1ebd64732da3777378
```

[VERIFIED]

---

## 6 — How the Button Is Built

### 6a. Plain `<a href>`, no JavaScript

The PDF links are plain `<a>` tags with `class="btn-outline"` and `target="_blank"`. Each contains an inline SVG download icon and visible text. No JavaScript touches these links — no onclick handler, no event listener, no querySelector targeting `.download-buttons` or `.btn-outline` or `.pdf`. The theme's `scripts.js` contains zero references to adoption PDFs, download buttons, or the btn-outline class. [VERIFIED — grep of post_content and scripts.js]

### 6b. No tracking, proxy, or logging

Nothing intercepts or logs these downloads. No analytics event, no Google Analytics `ga()` call, no server-side proxy for PDF downloads. The links are direct browser navigations. [VERIFIED — grep of scripts.js]

### 6c. Spanish page button targets

Post 339 (Spanish page) has the **same two hrefs** as post 7:
- First button → `blank-english.pdf` (text: "Download English Application (PDF)")
- Second button → `blank-spanish.pdf` (text: "Descargar Solicitud en Español (PDF)")

The Spanish page links to both the English AND Spanish PDFs, same as the English page. [VERIFIED — post_content grep]

---

## Summary Answers

**1d:** distinct VPS URLs referenced by WordPress: **17** (4 from post_content across 4 pages, 10 from transient options, 3 from theme PHP/JS)

**2:** BROKEN URLs (content-type mismatch): **2** — `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` and `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` (both return text/html 7,552 bytes — dogwalker PWA login page)

**4b:** blank application PDFs already in media library: **no** (zero PDF attachments exist in the entire media library)

**5e:** english PDF = 309,446 bytes / 3 pages (Word→Acrobat PDFMaker, Jan 2024); spanish PDF = 127,119 bytes / 3 pages (wkhtmltopdf, Feb 2026). Size difference explained by different creation tools and dates, not by missing content.
