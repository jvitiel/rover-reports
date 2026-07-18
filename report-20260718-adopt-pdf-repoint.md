# Adoption PDF Repoint — Implementation Report — 2026-07-18

## Step 1 — Source PDFs Fetched and Verified

```
$ curl -s -o /tmp/adopt-en.pdf 'https://dashboard.4lgshelterapp.duckdns.org/public/forms/blank-english.pdf'
$ curl -s -o /tmp/adopt-es.pdf 'https://dashboard.4lgshelterapp.duckdns.org/public/forms/blank-spanish.pdf'

EN: 309446 bytes  sha256: aa47fa6547d9d97b928184bed4f8a53dfe8e423fb5122615ca24797544426fe1
    file: PDF document, version 1.6 (zip deflate encoded)
ES: 127119 bytes  sha256: 905b64dcc28bfd212a1bd4fe42d3113b4e9eb63114263b1ebd64732da3777378
    file: PDF document, version 1.4, 3 page(s)
```

Both match gate sizes and hashes. [VERIFIED]

---

## Step 2 — PDF Title Metadata Fixed

**Tool:** `pdftk` (available at `/usr/bin/pdftk`). `exiftool` and `qpdf` not installed. `pypdf`/`PyPDF2` not installed. No packages installed.

**Before:**
- EN Title: `ApPLICATION FOR CAT ADOPTION` (stale 2024 Word metadata)
- ES Title: (none)

**After:**
- EN Title: `Four Legs Good - Adoption Application`
- ES Title: `Four Legs Good - Solicitud de Adopcion`

```
$ pdfinfo /tmp/adopt-en.pdf | grep -E 'Title|Pages'
Title:           Four Legs Good - Adoption Application
Pages:           3

$ pdfinfo /tmp/adopt-es.pdf | grep -E 'Title|Pages'
Title:           Four Legs Good - Solicitud de Adopcion
Pages:           3
```

Post-metadata sizes and hashes:
```
EN: 379198 bytes  sha256: bd0120dd72cccb04d31e2dce166037f0422b655f90258843ba5937826fc41f60
ES: 126999 bytes  sha256: 4d71e7e55d3f7c517f0020a5b183baed69ea9cb3a33380c3c8af6d8d6acd887d
```

Both still valid PDFs, both still 3 pages. Only Title changed. [VERIFIED]

---

## Step 3 — Imported to Media Library

```
$ wp media import /tmp/adoption-application-english.pdf --title="Adoption Application (English)" --porcelain
507

$ wp media import /tmp/adoption-application-spanish.pdf --title="Solicitud de Adopcion (Espanol)" --porcelain
508
```

| Attachment | ID | URL | On-disk size |
|------------|-----|-----|-------------|
| EN | 507 | `https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-english.pdf` | 379,198 bytes |
| ES | 508 | `https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-spanish.pdf` | 126,999 bytes |

On-disk sizes match Step 2c. [VERIFIED]

### 3a. Anonymous URL test (cache-busted)

```
$ curl -sIL -H 'Cache-Control: no-cache' '<EN URL>'
HTTP/2 200
content-type: application/pdf
content-length: 379198

$ curl -sIL -H 'Cache-Control: no-cache' '<ES URL>'
HTTP/2 200
content-type: application/pdf
content-length: 126999
```

Both return `application/pdf`. [VERIFIED]

---

## Step 4 — Content Built

### Post 7 extraction gate

```
post 7: 78018 bytes, 0 backslashes
post 339: 81361 bytes, 0 backslashes
```

[VERIFIED]

### Python script output — post 7

```
post 7
  old EN href matches: 1 (must be 1)
  old ES href matches: 1 (must be 1)
  backslashes in source: 0 (must be 0)
  old bytes: 78018
  new bytes: 78052
  wrote /tmp/post7-new.html
```

### Full diff — post 7

```
736c736
<       <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf" class="btn-outline" target="_blank">
---
>       <a href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-english.pdf" class="btn-outline" target="_blank">
740c740
<       <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf" class="btn-outline" target="_blank">
---
>       <a href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-spanish.pdf" class="btn-outline" target="_blank">
```

Exactly 2 changes (two href swaps). [VERIFIED]

---

## Step 5 — Post 7 Applied and Verified

```
$ wp post update 7 /tmp/post7-new.html
Success: Updated post 7.
```

### Readback

```
$ sha256sum /tmp/post7-new.html /tmp/post7-readback.html
1d1e02504e0de15e2128fb03948c2a9b86bf3d5e965588926e022fe9bdafb044  /tmp/post7-new.html
1d1e02504e0de15e2128fb03948c2a9b86bf3d5e965588926e022fe9bdafb044  /tmp/post7-readback.html
```

SHA256 match. [VERIFIED]

| Check | Result | Expected |
|-------|--------|----------|
| 5a. Backslash count | 0 | 0 |
| 5b. `adoption-pdfs` count | 0 | 0 |
| 5c. `charCodeAt` count | 1 | 1 |
| 5d. `method="post" novalidate` count | 1 | 1 |

All pass. [VERIFIED]

### 5e. Guard state

```json
{
  "last_checked": "2026-07-18T03:29:32+00:00",
  "last_checked_id": 7,
  "last_problems": [],
  "last_alert": "2026-07-18T01:31:35+00:00",
  "last_alert_id": 494,
  "last_mail_result": "true"
}
```

Guard fired on the save, checked post 7, found **zero problems**. `last_alert` is unchanged (still the earlier test alert on post 494). **No false positive.** [VERIFIED]

---

## Step 6 — Post 339 Applied and Verified

### Python script output — post 339

```
post 339
  old EN href matches: 1 (must be 1)
  old ES href matches: 1 (must be 1)
  backslashes in source: 0 (must be 0)
  ES page: untranslated button text matches: 1 (must be 1)
  old bytes: 81361
  new bytes: 81396
  wrote /tmp/post339-new.html
```

### Full diff — post 339

```
769c769
<       <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf" class="btn-outline" target="_blank">
---
>       <a href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-english.pdf" class="btn-outline" target="_blank">
771c771
<         Download English Application (PDF)
---
>         Descargar Solicitud en Ingles (PDF)
773c773
<       <a href="https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf" class="btn-outline" target="_blank">
---
>       <a href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-spanish.pdf" class="btn-outline" target="_blank">
```

Exactly 3 changes: 2 href swaps + 1 button label translation (`Download English Application (PDF)` → `Descargar Solicitud en Ingles (PDF)`). No other text altered. Used "Ingles" without accent to avoid potential encoding issues. [VERIFIED]

### Readback

```
$ sha256sum /tmp/post339-new.html /tmp/post339-readback.html
36628c82a9f4d1b706d1d351db503131b994afe8e4e8b8b98df06fbcb76b7846  /tmp/post339-new.html
36628c82a9f4d1b706d1d351db503131b994afe8e4e8b8b98df06fbcb76b7846  /tmp/post339-readback.html
```

SHA256 match. [VERIFIED]

| Check | Result | Expected |
|-------|--------|----------|
| 5a. Backslash count | 0 | 0 |
| 5b. `adoption-pdfs` count | 0 | 0 |
| 5c. `charCodeAt` count | 1 | 1 |
| 5d. `method="post" novalidate` count | 1 | 1 |

All pass. [VERIFIED]

### Guard state after post 339

```json
{
  "last_checked": "2026-07-18T03:30:08+00:00",
  "last_checked_id": 339,
  "last_problems": [],
  "last_alert": "2026-07-18T01:31:35+00:00",
  "last_alert_id": 494,
  "last_mail_result": "true"
}
```

Guard checked post 339, zero problems. No false positive. [VERIFIED]

---

## Step 7 — Purge and Live-Verify

### Cache purge

```
$ wp sg purge
Success: Speed Optimizer by SiteGround assets folder purged successfully.
Success: Dynamic Cache Successfully Purged.

$ wp cache flush
Success: The cache was flushed.
```

[VERIFIED]

### Live verification

| Check | Result | Expected |
|-------|--------|----------|
| 7a. EN PDF URL | 200, `application/pdf`, 379,198 bytes | application/pdf |
| 7b. ES PDF URL | 200, `application/pdf`, 126,999 bytes | application/pdf |
| 7c. `adoption-pdfs` on /adopt/ | 0 | 0 |
| 7d. PDF hrefs on /adopt/ | (see below) | fourlegsgoodnynj.org URLs |
| 7e. `adoption-pdfs` on ES page | 0 | 0 |
| 7e. PDF hrefs on ES page | (see below) | fourlegsgoodnynj.org URLs |
| 7f. /adopt/ status | HTTP/2 200 | 200 |
| 7g. homepage status | HTTP/2 200 | 200 |

All pass. [VERIFIED]

### 7d. PDF hrefs on /adopt/ (live page)

```
href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-english.pdf"
href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-spanish.pdf"
```

Same-origin. Both `application/pdf`. [VERIFIED]

### 7e. PDF hrefs on ES page (live page)

```
href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-english.pdf"
href="https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-spanish.pdf"
```

Same-origin. [VERIFIED]

### ES page button text (live)

```
EN button: Descargar Solicitud en Ingles (PDF)
ES button: Descargar Solicitud en Español (PDF)
```

Both buttons on the Spanish page now have Spanish labels. [VERIFIED]

---

## Step 8 — Record

### 8a. Revert commands

```
wp post update 7 /tmp/post7-revert.html
wp post update 339 /tmp/post339-revert.html
```

Revert files at `/tmp/post7-revert.html` and `/tmp/post339-revert.html` on SiteGround. Durable fallback: WordPress revisions created by each save.

### 8b. Attachment IDs and URLs

| ID | URL |
|----|-----|
| 507 | `https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-english.pdf` |
| 508 | `https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/adoption-application-spanish.pdf` |

### 8c. mu-plugins

All 3 present, untouched:
- `4lg-adopt-form-guard.php`
- `4lg-disable-user-enumeration.php` — sha256: `d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663` [VERIFIED — matches expected]
- `dashboard-service-role.php`

### 8d. Posts 8 and 345 untouched

```
Post 8  (How to Help):     post_modified = 2026-05-27 19:44:29
Post 345 (Cómo Ayudar):    post_modified = 2026-05-27 19:47:47
```

Neither was modified. [VERIFIED]

### 8e. VPS originals still reachable

```
$ curl -sIL 'https://dashboard.4lgshelterapp.duckdns.org/public/forms/blank-english.pdf'
HTTP/2 200, application/pdf, 309,446 bytes

$ curl -sIL 'https://dashboard.4lgshelterapp.duckdns.org/public/forms/blank-spanish.pdf'
HTTP/2 200, application/pdf, 127,119 bytes
```

VPS fallback intact. Nothing was deleted or modified on the VPS. [VERIFIED]

---

## Summary

| Item | Before | After |
|------|--------|-------|
| EN PDF href | `dogwalker.../adoption-pdfs/blank-english.pdf` (BROKEN — served HTML) | `fourlegsgoodnynj.org/.../adoption-application-english.pdf` (200, application/pdf) |
| ES PDF href | `dogwalker.../adoption-pdfs/blank-spanish.pdf` (BROKEN — served HTML) | `fourlegsgoodnynj.org/.../adoption-application-spanish.pdf` (200, application/pdf) |
| EN PDF Title | "ApPLICATION FOR CAT ADOPTION" | "Four Legs Good - Adoption Application" |
| ES PDF Title | (none) | "Four Legs Good - Solicitud de Adopcion" |
| Post 339 EN button text | "Download English Application (PDF)" (untranslated) | "Descargar Solicitud en Ingles (PDF)" |
| Post 7 size | 78,018 bytes | 78,052 bytes (+34) |
| Post 339 size | 81,361 bytes | 81,396 bytes (+35) |
| Backslashes | 0 in both | 0 in both |
| Guard alerts | None fired | None fired |
| Posts 8, 345 | Untouched | Untouched |
| VPS originals | Still serving | Still serving |
