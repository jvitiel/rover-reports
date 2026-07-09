# Auditor 5 — Route Forensics (SiteGround) — 2026-07-09

**Date:** 2026-07-09 18:27 UTC
**Author:** Rover (automated, read-only)
**Access:** SSH to SiteGround via `ssh -p 18765 u3058-gfugkrmqxgso@ssh.johnv80.sg-host.com` with key `/home/rover/.ssh/id_ed25519`

---

## ITEM 1 — DOCUMENT ROOTS

### ls -la ~/www/

```
$ ls -la ~/www/
total 12
drwx--x--x 3 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jun 30 14:12 .
drwx--x--x 7 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul  6 17:21 ..
lrwxrwxrwx 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso   19 Jun 30 14:12 fourlegsgoodnynj.org -> johnv80.sg-host.com
drwx--x--x 5 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Mar 11 04:29 johnv80.sg-host.com
```

### readlink -f for Root 1 (johnv80)

```
$ readlink -f ~/www/johnv80.sg-host.com/public_html
/home/customer/www/johnv80.sg-host.com/public_html

$ readlink -f ~/www/johnv80.sg-host.com/public_html/wp-content
/home/customer/www/johnv80.sg-host.com/public_html/wp-content

$ readlink -f ~/www/johnv80.sg-host.com/public_html/wp-content/themes
/home/customer/www/johnv80.sg-host.com/public_html/wp-content/themes
```

### readlink -f for Root 2 (fourlegsgoodnynj)

```
$ readlink -f ~/www/fourlegsgoodnynj.org/public_html
/home/customer/www/johnv80.sg-host.com/public_html

$ readlink -f ~/www/fourlegsgoodnynj.org/public_html/wp-content
/home/customer/www/johnv80.sg-host.com/public_html/wp-content

$ readlink -f ~/www/fourlegsgoodnynj.org/public_html/wp-content/themes
/home/customer/www/johnv80.sg-host.com/public_html/wp-content/themes
```

**The two document roots resolve to ONE wp-content tree.** `~/www/fourlegsgoodnynj.org` is a symlink to `~/www/johnv80.sg-host.com` (created 2026-06-30). Both paths resolve to the same canonical path `/home/customer/www/johnv80.sg-host.com/public_html`. There are not two independent copies. [VERIFIED]

---

## ITEM 2 — GREP, PER ROOT, SEPARATELY

### ROOT 1 (johnv80.sg-host.com)

**themes — "link-es-translation":**
```
$ grep -rn "link-es-translation" ~/www/johnv80.sg-host.com/public_html/wp-content/themes
.../4lg-theme/functions.php.bak-20260707-185231:1654:    register_rest_route('4lg/v1', '/link-es-translation', array(
.../4lg-theme/functions.php.bak-20260707-134717:1654:    register_rest_route('4lg/v1', '/link-es-translation', array(
.../4lg-theme/functions.php:1654:    register_rest_route('4lg/v1', '/link-es-translation', array(
.../4lg-theme/functions.php.bak-20260707-023800:1646:    register_rest_route('4lg/v1', '/link-es-translation', array(
.../4lg-theme/functions.php.bak-20260707-142704:1654:    register_rest_route('4lg/v1', '/link-es-translation', array(
.../4lg-theme/functions.php.bak-20260707-044611:1654:    register_rest_route('4lg/v1', '/link-es-translation', array(
.../4lg-theme/functions.php.bak-20260707-032652:1647:    register_rest_route('4lg/v1', '/link-es-translation', array(
exit=0
```

**plugins — "link-es-translation":** (no output) `exit=0` (grep ran, no match) [VERIFIED]

**mu-plugins — "link-es-translation":** (no output) `exit=1` (grep failed — directory exists but contains no matching files)
```
$ ls -d ~/www/johnv80.sg-host.com/public_html/wp-content/mu-plugins
/home/u3058-gfugkrmqxgso/www/johnv80.sg-host.com/public_html/wp-content/mu-plugins
```
Directory exists. [VERIFIED]

**themes — "link_es_translation":**
```
$ grep -rn "link_es_translation" ~/www/johnv80.sg-host.com/public_html/wp-content/themes
.../4lg-theme/functions.php.bak-20260707-185231:1624:function flg_handle_link_es_translation($request) {
.../4lg-theme/functions.php.bak-20260707-185231:1656:        'callback'            => 'flg_handle_link_es_translation',
.../4lg-theme/functions.php.bak-20260707-134717:1624:function flg_handle_link_es_translation($request) {
(... same pattern for all .bak files and functions.php ...)
.../4lg-theme/functions.php:1624:function flg_handle_link_es_translation($request) {
.../4lg-theme/functions.php:1656:        'callback'            => 'flg_handle_link_es_translation',
exit=0
```

**plugins — "link_es_translation":** (no output) `exit=0` [VERIFIED]
**mu-plugins — "link_es_translation":** (no output) `exit=1` [VERIFIED]

**themes — "flg_handle_link_es_translation":** Same results as `link_es_translation` above — found in functions.php and all .bak files. `exit=0` [VERIFIED]
**plugins — "flg_handle_link_es_translation":** (no output) `exit=0` [VERIFIED]
**mu-plugins — "flg_handle_link_es_translation":** (no output) `exit=1` [VERIFIED]

### ROOT 2 (fourlegsgoodnynj.org — symlink)

All grep results are identical to ROOT 1, with paths showing `~/www/fourlegsgoodnynj.org/...` instead of `~/www/johnv80.sg-host.com/...`. This is expected: both paths resolve to the same filesystem tree. Same exit codes for all commands. [VERIFIED]

---

## ITEM 3 — WHEN THE ROUTE LANDED

### ls -la functions.php and backups (full-iso timestamps)

```
$ ls -la --time-style=full-iso ~/www/johnv80.sg-host.com/public_html/wp-content/themes/4lg-theme/functions.php*
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 70406 2026-07-07 18:53:14.243200767 +0000 functions.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 54740 2026-07-07 02:17:49.963877786 +0000 functions.php.bak-20260707-021700
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 61524 2026-07-07 02:36:57.924036679 +0000 functions.php.bak-20260707-023800
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 61563 2026-07-07 03:26:52.084550803 +0000 functions.php.bak-20260707-032652
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 67187 2026-07-07 04:46:11.739293070 +0000 functions.php.bak-20260707-044611
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 67348 2026-07-07 13:47:17.987552079 +0000 functions.php.bak-20260707-134717
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 68094 2026-07-07 14:27:04.283510030 +0000 functions.php.bak-20260707-142704
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 68558 2026-07-07 18:52:31.727126825 +0000 functions.php.bak-20260707-185231
```

### grep -l flg_handle_link_es_translation per backup (chronological)

```
functions.php.bak-20260707-021700: exit=1  ← does NOT contain the route
functions.php.bak-20260707-023800: exit=0  ← CONTAINS the route (earliest)
functions.php.bak-20260707-032652: exit=0
functions.php.bak-20260707-044611: exit=0
functions.php.bak-20260707-134717: exit=0
functions.php.bak-20260707-142704: exit=0
functions.php.bak-20260707-185231: exit=0
```

**Earliest backup containing `flg_handle_link_es_translation`:** `functions.php.bak-20260707-023800`, mtime `2026-07-07 02:36:57.924036679 +0000`. [VERIFIED]

**The backup immediately preceding it** (`functions.php.bak-20260707-021700`, mtime `2026-07-07 02:17:49.963877786 +0000`) does NOT contain the string (`exit=1`). [VERIFIED]

**Bracketed window:** The route entered functions.php between `2026-07-07 02:17:49 UTC` and `2026-07-07 02:36:57 UTC`. The `.bak-20260707-021700` is the last state without the route; `.bak-20260707-023800` is the first state with it. [VERIFIED]

### Version control

```
$ ls -a ~/www/johnv80.sg-host.com/public_html/wp-content/themes/4lg-theme | grep -i '^\.git$'
(no output)
exit=1
```

**No `.git` directory in the theme dir.** The theme is not under version control. [VERIFIED]

---

## ITEM 4 — WHEN THE BACKFILL RAN

### wp post list --post_type=shelter_event

```
$ wp post list --post_type=shelter_event --post_status=any --fields=ID,post_title,post_date,post_modified,post_status --format=table
ID   post_title                          post_date            post_modified        post_status
471  Finales de Invierno Bow Wow         2026-07-07 02:59:49  2026-07-07 02:59:49  publish
469  Orientación para Voluntarios        2026-07-07 02:59:45  2026-07-07 02:59:45  publish
468  Orientación para Voluntarios        2026-07-07 02:59:43  2026-07-07 02:59:43  publish
467  Orientación para Voluntarios        2026-07-07 02:59:35  2026-07-07 02:59:35  publish
466  ¡Encuentra a Tu Nuevo Mejor Amigo!  2026-07-07 02:59:30  2026-07-07 02:59:30  publish
465  Orientación para Voluntarios        2026-07-07 02:59:27  2026-07-07 02:59:27  publish
464  Orientación para Voluntarios        2026-07-07 02:59:24  2026-07-07 02:59:24  publish
440  Find Your New Best Friend!          2026-07-05 22:22:18  2026-07-06 22:59:56  publish
438  Volunteer Orientation               2026-06-29 19:16:57  2026-06-29 21:36:35  publish
437  Volunteer Orientation               2026-06-29 19:13:30  2026-06-29 21:36:45  publish
371  Volunteer Orientaton                2026-05-24 20:51:05  2026-05-24 20:51:05  publish
366  Orientación para Voluntarios        2026-05-04 00:30:08  2026-05-24 19:26:52  publish
323  Volunteer Orientaton                2026-05-04 00:30:08  2026-05-04 00:34:00  publish
310  Volunteer Orientation               2026-04-10 19:39:03  2026-05-04 00:28:38  publish
309  test event                          2026-04-08 18:32:18  2026-04-08 18:32:43  draft
307  Volunteer Orientation               2026-04-07 21:37:00  2026-04-10 19:41:43  publish
298  second test event                   2026-04-01 15:31:15  2026-04-08 17:15:02  draft
254  Late Winter Bow Wow                 2026-03-16 17:37:04  2026-03-16 17:37:04  publish
251  St Paddys day                       2026-03-16 17:22:39  2026-03-16 17:35:27  draft
249  Volunteer Orientation               2026-03-16 17:17:02  2026-03-16 17:17:02  publish
248  Pet Supplies Plus Fundraiser        2026-03-16 17:17:00  2026-03-16 17:17:00  publish
247  Spring Adoption Fair                2026-03-16 17:16:48  2026-03-16 17:16:48  publish
```

### wp eval — Polylang language + EN link per shelter_event

```
$ wp eval '...(pll_get_post_language + pll_get_post)...'
471|es|en_link=254|2026-07-07 02:59:49|2026-07-07 02:59:49|publish|Finales de Invierno Bow Wow
469|es|en_link=307|2026-07-07 02:59:45|2026-07-07 02:59:45|publish|Orientación para Voluntarios
468|es|en_link=310|2026-07-07 02:59:43|2026-07-07 02:59:43|publish|Orientación para Voluntarios
467|es|en_link=371|2026-07-07 02:59:35|2026-07-07 02:59:35|publish|Orientación para Voluntarios
466|es|en_link=440|2026-07-07 02:59:30|2026-07-07 02:59:30|publish|¡Encuentra a Tu Nuevo Mejor Amigo!
465|es|en_link=437|2026-07-07 02:59:27|2026-07-07 02:59:27|publish|Orientación para Voluntarios
464|es|en_link=438|2026-07-07 02:59:24|2026-07-07 02:59:24|publish|Orientación para Voluntarios
440|en|en_link=440|2026-07-05 22:22:18|2026-07-06 22:59:56|publish|Find Your New Best Friend!
438|en|en_link=438|2026-06-29 19:16:57|2026-06-29 21:36:35|publish|Volunteer Orientation
437|en|en_link=437|2026-06-29 19:13:30|2026-06-29 21:36:45|publish|Volunteer Orientation
371|en|en_link=371|2026-05-24 20:51:05|2026-05-24 20:51:05|publish|Volunteer Orientaton
366|es|en_link=323|2026-05-04 00:30:08|2026-05-24 19:26:52|publish|Orientación para Voluntarios
323|en|en_link=323|2026-05-04 00:30:08|2026-05-04 00:34:00|publish|Volunteer Orientaton
310|en|en_link=310|2026-04-10 19:39:03|2026-05-04 00:28:38|publish|Volunteer Orientation
309|en|en_link=309|2026-04-08 18:32:18|2026-04-08 18:32:43|draft|test event
307|en|en_link=307|2026-04-07 21:37:00|2026-04-10 19:41:43|publish|Volunteer Orientation
298|en|en_link=298|2026-04-01 15:31:15|2026-04-08 17:15:02|draft|second test event
254|en|en_link=254|2026-03-16 17:37:04|2026-03-16 17:37:04|publish|Late Winter Bow Wow
251|en|en_link=251|2026-03-16 17:22:39|2026-03-16 17:35:27|draft|St Paddys day
249|en|en_link=249|2026-03-16 17:17:02|2026-03-16 17:17:02|publish|Volunteer Orientation
248|en|en_link=248|2026-03-16 17:17:00|2026-03-16 17:17:00|publish|Pet Supplies Plus Fundraiser
247|en|en_link=247|2026-03-16 17:16:48|2026-03-16 17:16:48|publish|Spring Adoption Fair
```

### ES event analysis

**ES posts created by the backfill (IDs 464–471):**

| Post ID | post_date | post_modified | EN counterpart | Title |
|---------|-----------|---------------|----------------|-------|
| 464 | 2026-07-07 02:59:24 | 2026-07-07 02:59:24 | 438 | Orientación para Voluntarios |
| 465 | 2026-07-07 02:59:27 | 2026-07-07 02:59:27 | 437 | Orientación para Voluntarios |
| 466 | 2026-07-07 02:59:30 | 2026-07-07 02:59:30 | 440 | ¡Encuentra a Tu Nuevo Mejor Amigo! |
| 467 | 2026-07-07 02:59:35 | 2026-07-07 02:59:35 | 371 | Orientación para Voluntarios |
| 468 | 2026-07-07 02:59:43 | 2026-07-07 02:59:43 | 310 | Orientación para Voluntarios |
| 469 | 2026-07-07 02:59:45 | 2026-07-07 02:59:45 | 307 | Orientación para Voluntarios |
| 471 | 2026-07-07 02:59:49 | 2026-07-07 02:59:49 | 254 | Finales de Invierno Bow Wow |

**Backfill ran at:** 2026-07-07 02:59:24–02:59:49 UTC (25-second burst creating 7 posts). [VERIFIED]

**Post 366 (the known ADOPT target, EN counterpart 323):**
- post_date: `2026-05-04 00:30:08`
- post_modified: `2026-05-24 19:26:52`
- Language: es, linked to EN 323

**Post 366 was created approximately 2 months before the backfill** (2026-05-04 vs 2026-07-07). Its post_date is the same as EN 323's post_date (2026-05-04 00:30:08), which is consistent with it being hand-created as a manual translation at the same time as its EN counterpart. It was merely ADOPTED (linked) by the backfill, not created by it. [VERIFIED — post_date predates the backfill by 64 days]

---

## ITEM 5 — ROUTE REGISTRATION OUTSIDE functions.php

### grep register_rest_route across all wp-content PHP (excluding .bak, Polylang)

All `register_rest_route` calls that reference `'4lg/v1'` are in a single file:

```
$ grep -rn "'4lg/v1'\|\"4lg/v1\"" ~/www/johnv80.sg-host.com/public_html/wp-content --include=*.php | grep -v ".bak"
.../themes/4lg-theme/functions.php:210:    register_rest_route('4lg/v1', '/clear-stories-cache', array(
.../themes/4lg-theme/functions.php:219:    register_rest_route('4lg/v1', '/set-story-featured', array(
.../themes/4lg-theme/functions.php:1023:   register_rest_route('4lg/v1', '/test-animals-api', array(
.../themes/4lg-theme/functions.php:1048:   register_rest_route('4lg/v1', '/clear-animals-cache', array(
.../themes/4lg-theme/functions.php:1152:   register_rest_route('4lg/v1', '/push-event', array(
.../themes/4lg-theme/functions.php:1161:   register_rest_route('4lg/v1', '/clear-events-cache', array(
.../themes/4lg-theme/functions.php:1654:   register_rest_route('4lg/v1', '/link-es-translation', array(
exit=0
```

Other `register_rest_route` calls exist in plugins (`sg-security`, `sg-ai-studio`, `sg-cachepress`, `wordpress-starter`, `seo-by-rank-math`) but NONE of them register under the `4lg/v1` namespace. [VERIFIED]

ROOT 2 (fourlegsgoodnynj.org) — identical results (symlink). `exit=0` [VERIFIED]

**No `4lg/v1` route is registered anywhere other than `functions.php` in the `4lg-theme`.** [VERIFIED]

### Live registered routes (cross-reference)

```
$ curl -s 'https://www.fourlegsgoodnynj.org/wp-json/4lg/v1' | python3 ...
/4lg/v1             methods=['GET']
/4lg/v1/clear-animals-cache   methods=['POST']
/4lg/v1/clear-events-cache    methods=['POST']
/4lg/v1/clear-stories-cache   methods=['POST']
/4lg/v1/link-es-translation   methods=['POST']
/4lg/v1/push-event            methods=['POST']
/4lg/v1/set-story-featured    methods=['POST']
/4lg/v1/test-animals-api      methods=['GET']
```

7 custom routes registered (8 including the namespace root). All match functions.php grep results. [VERIFIED]

---

*Report generated read-only. No files modified on SiteGround or VPS.*
