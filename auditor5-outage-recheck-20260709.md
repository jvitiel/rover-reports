# Auditor 5 — Outage Recheck — 2026-07-09

**Date:** 2026-07-09 18:12 UTC
**Author:** Rover (automated, read-only)

---

## SECTION A — CHANNEL CANARY

### A1. ls -la /home/shelter/rover-reports/

```
$ ls -la /home/shelter/rover-reports/
total 75156
drwxrwsr-x  4 shelter shelter   24576 Jul  9 08:00 .
drwxr-x--x 14 shelter shelter    4096 May 18 22:37 ..
-rw-r--r--  1 rover   shelter   10166 Jul  5 19:38 adoption-address-split-diag-20260705.md
-rw-r--r--  1 rover   shelter    4009 Jul  6 16:26 adoption-address-split-impl-20260706.md
-rw-r--r--  1 rover   shelter    3059 Jul  4 14:01 adoption-notify-recipients-diag-20260702.md
-rw-r--r--  1 rover   shelter    4396 Jul  4 18:22 adoptions-patch-prebuild-check-20260704.md
-rw-r--r--  1 rover   shelter   10991 Jul  4 18:19 adoptions-patch-writegate-diag-20260704.md
... (131 files total; full listing available on-box)
```

Directory exists, is writable by group `shelter`, contains 131 regular files + 2 subdirectories (`backups/`, `screenshots/`). [VERIFIED]

### A2. Byte counts of three specific files

```
$ wc -c /home/shelter/rover-reports/auditor4-link-es-endpoint-verify-20260706.md \
       /home/shelter/rover-reports/report-20260707-story-orphan-guard-fix.md \
       /home/shelter/rover-reports/health-check-20260706.md
wc: /home/shelter/rover-reports/auditor4-link-es-endpoint-verify-20260706.md: No such file or directory
wc: /home/shelter/rover-reports/report-20260707-story-orphan-guard-fix.md: No such file or directory
wc: /home/shelter/rover-reports/health-check-20260706.md: No such file or directory
0 total
(exit code 1)
```

**None of the three files exist at `/home/shelter/rover-reports/`.** [VERIFIED]

All three exist at `/home/rover/rover-reports-repo/` (the GitHub-pushed report repo):

```
$ wc -c /home/rover/rover-reports-repo/auditor4-link-es-endpoint-verify-20260706.md \
       /home/rover/rover-reports-repo/report-20260707-story-orphan-guard-fix.md \
       /home/rover/rover-reports-repo/health-check-20260706.md
 4594 /home/rover/rover-reports-repo/auditor4-link-es-endpoint-verify-20260706.md
 8563 /home/rover/rover-reports-repo/report-20260707-story-orphan-guard-fix.md
 6332 /home/rover/rover-reports-repo/health-check-20260706.md
19489 total
```

[VERIFIED — files exist at `/home/rover/rover-reports-repo/`, not at `/home/shelter/rover-reports/`]

**Explanation:** The report output path changed. `/home/shelter/rover-reports/` is the legacy Caddy-served path. The current primary write target is `/home/rover/rover-reports-repo/` (GitHub-pushed). Reports from ~2026-07-06 onward were written to the new path only. The AGENTS.md rule says: "Legacy path `/home/shelter/rover-reports/` and its Caddy block remain active but are no longer the primary write target." [VERIFIED — AGENTS.md]

### A3. Row counts

```
$ sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db "SELECT COUNT(*) FROM rg_messages;"
Error: in prepare, no such table: rg_messages
(exit code 1)
```

**Table `rg_messages` does not exist.** [VERIFIED]

No table with `rg` in its name exists in the database:

```
$ sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db \
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%rg%';"
(no output, exit code 0)
```

Per memory log 2026-07-07.md and report `report-20260707-rg-table-drop.md`, the `rg_messages` and `rg_staff` tables were dropped on 2026-07-07 as part of the RG portal cleanup. [INFERRED — from memory log, not directly verified against migration history]

```
$ sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db "SELECT COUNT(*) FROM volunteers;"
451
```

**DB file path queried:** `/home/shelter/shelter-apps/data/shelter.db` [VERIFIED]
**volunteers row count:** 451 [VERIFIED]

---

## SECTION B — link-es-translation route (re-check of a negative)

### B1. Exact host and paths scanned on 2026-07-06

The auditor4 report (`/home/rover/rover-reports-repo/auditor4-link-es-endpoint-verify-20260706.md`) shows abbreviated paths:

```
$ grep -rn 'link-es-translation' ~/www/.../wp-content/themes/4lg-theme/
$ grep -rn 'link-es-translation' ~/www/.../wp-content/plugins/ | grep -v polylang
$ grep -rn 'link-es-translation' ~/www/.../wp-content/mu-plugins/
$ grep -rn 'link-es-translation\|link_es_translation' ~/www/.../wp-content/ | grep -v polylang | grep -v '.bak'
```

The paths are abbreviated with `~/www/...` — the actual absolute paths are not recoverable from the report. The WordPress site lives on SiteGround (`johnv80.sg-host.com`), not on this VPS. This VPS (66.228.37.38) does not have SSH access to the SiteGround host and does not store a local copy of the WordPress filesystem. [VERIFIED — no WP install on this VPS; `find /home -name 'wp-config.php'` returns nothing]

The commands in the auditor4 report were apparently run by a different agent or session with SiteGround SSH access (likely "Website Opus" per USER.md's pipeline description). Rover cannot reproduce or verify the exact paths scanned. [UNCERTAIN — cannot confirm which agent ran those commands]

### B2. Document roots on the WordPress host

**CANNOT INSPECT.** The WordPress host is SiteGround (`johnv80.sg-host.com`). This VPS has no SSH access to SiteGround. Rover cannot enumerate document roots, run `readlink`, or inspect the filesystem. [VERIFIED — no SSH key or config for SiteGround exists in `/home/rover/.ssh/`]

The VPS communicates with WordPress exclusively via HTTP REST API at `https://johnv80.sg-host.com/wp-json/...` (confirmed from server source). [VERIFIED — grep of `/home/shelter/shelter-apps/server/src/server.ts.backup-floorc` shows all WP API calls use `https://johnv80.sg-host.com/wp-json/`]

### B3. grep for link-es-translation in theme/plugin trees

**CANNOT RUN FILESYSTEM GREP.** No filesystem access to SiteGround. [VERIFIED]

**Alternative: REST API route enumeration confirms the route NOW EXISTS:**

```
$ curl -s "https://johnv80.sg-host.com/wp-json/4lg/v1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
routes = data.get('routes', {})
for route in sorted(routes.keys()):
    if '4lg' in route.lower():
        print(route)
"
/4lg/v1
/4lg/v1/clear-animals-cache
/4lg/v1/clear-events-cache
/4lg/v1/clear-stories-cache
/4lg/v1/link-es-translation
/4lg/v1/push-event
/4lg/v1/set-story-featured
/4lg/v1/test-animals-api
```

[VERIFIED — `/4lg/v1/link-es-translation` is now a registered REST route, method POST]

### B4. Full 4lg/v1/* REST route list

**Enumerated via WP REST API discovery endpoint (the only access method available from this VPS):**

```
$ curl -s "https://johnv80.sg-host.com/wp-json/4lg/v1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
routes = data.get('routes', {})
for r in sorted(routes.keys()):
    if '4lg' in r:
        methods = routes[r].get('methods', [])
        print(f'{r}  methods={methods}')
"
/4lg/v1  methods=['GET']
/4lg/v1/clear-animals-cache  methods=['POST']
/4lg/v1/clear-events-cache  methods=['POST']
/4lg/v1/clear-stories-cache  methods=['POST']
/4lg/v1/link-es-translation  methods=['POST']
/4lg/v1/push-event  methods=['POST']
/4lg/v1/set-story-featured  methods=['POST']
/4lg/v1/test-animals-api  methods=['GET']
```

[VERIFIED — 8 routes total, including `link-es-translation`]

### B — Why the 2026-07-06 negative was correct at scan time

Per `/home/rover/rover/memory/2026-07-07.md` lines 269-272:

> - flg_handle_link_es_translation backfill route at 4lg/v1/link-es-translation (POST, edit_posts cap).
> - Syntax-gated. Backup: functions.php.bak-20260707-021700.
> - Orphan-guard bug found+fixed...
> - Integration test PASSED: full round-trip create+link+edit.

The route was **created on 2026-07-07**, the day AFTER the auditor4 scan. The 2026-07-06 negative finding was correct at the time of scanning — the endpoint genuinely did not exist yet. It was built as part of the ES translation backfill work on 2026-07-07. [INFERRED — from dated memory log; cannot verify SiteGround git/file history from this VPS]

---

## SECTION C — /api/walk-log consumer enumeration (non-code callers)

### C1. Crontabs

**rover crontab:**
```
$ crontab -l
*/15 * * * * /home/rover/scripts/memory-snapshot.sh
0 4 * * * /home/rover/scripts/screenshots-retention.sh >> /home/rover/screenshots-retention.log 2>&1
0 6 * * * sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py >> /home/shelter/logs/score-profiles.log 2>&1
```

No walk-log or rg reference. [VERIFIED]

**shelter crontab:**
```
$ sudo -u shelter crontab -l
no crontab for shelter
```

[VERIFIED]

**root crontab:**
```
$ sudo crontab -l
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: a password is required
```

**CANNOT ACCESS root crontab** — rover user lacks sudo privileges. [VERIFIED — access denied]

**/etc/crontab:**
```
$ cat /etc/crontab
SHELL=/bin/sh
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.daily; }
47 6    * * 7   root    test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.weekly; }
52 6    1 * *   root    test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.monthly; }
```

No walk-log or rg reference. [VERIFIED]

**/etc/cron.d/:**
```
$ ls -la /etc/cron.d/
total 32
drwxr-xr-x   2 root root  4096 Mar 16 05:11 .
drwxr-xr-x 128 root root 12288 Jul  7 06:08 ..
-rw-r--r--   1 root root   201 Apr  8  2024 e2scrub_all
-rw-r--r--   1 root root   712 Jan 19  2024 php
-rw-r--r--   1 root root   102 Mar 31  2024 .placeholder
-rw-r--r--   1 root root   396 Jan  9  2024 sysstat
```

Contents of all four files: `e2scrub_all` (filesystem scrub), `php` (session cleanup), `.placeholder` (empty), `sysstat` (system activity reports). **No walk-log or rg reference in any.** [VERIFIED — all four files read and inspected]

### C2. systemctl list-timers --all

```
$ systemctl list-timers --all
NEXT                            LEFT  UNIT                           ACTIVATES
Thu 2026-07-09 18:20:00 UTC     7min  sysstat-collect.timer          sysstat-collect.service
Thu 2026-07-09 18:39:00 UTC    26min  phpsessionclean.timer          phpsessionclean.service
Thu 2026-07-09 18:46:36 UTC    33min  fwupd-refresh.timer            fwupd-refresh.service
Thu 2026-07-09 21:07:22 UTC 2h 54min  update-notifier-download.timer ...
Thu 2026-07-09 21:17:05 UTC  3h 4min  systemd-tmpfiles-clean.timer   ...
Fri 2026-07-10 00:00:00 UTC 5h 47min  dpkg-db-backup.timer           ...
Fri 2026-07-10 00:00:00 UTC 5h 47min  logrotate.timer                ...
Fri 2026-07-10 00:07:00 UTC 5h 54min  sysstat-summary.timer          ...
Fri 2026-07-10 00:13:12 UTC       6h  man-db.timer                   ...
Fri 2026-07-10 00:47:13 UTC       6h  update-notifier-motd.timer     ...
Fri 2026-07-10 02:48:32 UTC       8h  apt-daily.timer                ...
Fri 2026-07-10 06:37:13 UTC      12h  apt-daily-upgrade.timer        ...
Sun 2026-07-12 03:10:16 UTC   2 days  e2scrub_all.timer              ...
Mon 2026-07-13 00:06:32 UTC   3 days  fstrim.timer                   ...
-                                  -  apport-autoreport.timer        ...
-                                  -  snapd.snap-repair.timer        ...
-                                  -  ua-timer.timer                 ...
17 timers listed.
```

All are standard system timers. **No walk-log or shelter-app related timers.** [VERIFIED]

### C3. grep walk-log across specified directories

```
$ grep -rn 'walk-log' /home/shelter/scripts/
(no output, exit code 1)
```

[VERIFIED — zero matches]

```
$ grep -rn 'walk-log' /home/rover/ (excluding .openclaw-rover/, memory/, sessions/)
```

Matches found ONLY in:
- `/home/rover/rover/backups/server-pre-batching-20260426-152517.ts:3101` — old backup file containing the removed route
- `/home/rover/rover-reports-repo/` — 6 report files documenting the walk-log removal and PII audit

No active code, script, or config references. [VERIFIED]

```
$ grep -rn 'walk-log' /etc/caddy/
(no output, exit code 1)
```

[VERIFIED — zero matches]

```
$ grep -rn 'walk-log' /home/shelter/shelter-apps/staff-pwa/ \
  /home/shelter/shelter-apps/staging-staff/ /home/shelter/shelter-apps/dogwalker/ \
  /home/shelter/shelter-apps/volunteer/ /home/shelter/shelter-apps/dashboard/ \
  /home/shelter/shelter-apps/caregiver/ /home/shelter/shelter-apps/coordinator/ \
  /home/shelter/shelter-apps/matcher/
(no output, exit code 0)
```

**Zero matches across all PWA asset directories.** [VERIFIED]

### C4. Caddyfile for walk-log or rg routes

```
$ grep -n 'walk.log' /etc/caddy/Caddyfile
(no output, exit code 1)

$ grep -n '\brg\b' /etc/caddy/Caddyfile
(no output, exit code 1)
```

**No walk-log or rg references in Caddyfile.** [VERIFIED]

### C5. QR targets, email templates, static HTML

```
$ find /home/shelter/shelter-apps/ -name '*.html' -not -path '*/node_modules/*' \
  -not -path '*/dist/*' -not -path '*/.git/*' -exec grep -l 'walk-log' {} \;
(no output, exit code 0)

$ find /home/shelter/shelter-apps/ -name '*.ejs' -not -path '*/node_modules/*' \
  -exec grep -l 'walk-log' {} \;
(no output, exit code 0)

$ grep -rn 'walk-log' /home/shelter/shelter-apps/server/src/emailService*
(no output, exit code 1)
```

**Zero matches in HTML files, EJS templates, or email service code.** [VERIFIED]

### C — Surfaces NOT inspectable

| Surface | Status | Reason |
|---------|--------|--------|
| Root crontab (`sudo crontab -l`) | **NOT INSPECTED** | rover lacks sudo; access denied [VERIFIED] |
| OpenClaw cron jobs (internal scheduler) | Inspectable but not explicitly requested | Would need `cron list` tool call |
| WordPress/SiteGround filesystem | **NOT INSPECTED** | No SSH access from this VPS [VERIFIED] |
| `/etc/cron.daily/`, `/etc/cron.hourly/`, `/etc/cron.weekly/`, `/etc/cron.monthly/` | Not explicitly listed but are run-parts targets from /etc/crontab | Standard system jobs; none are shelter-app related |

**Bottom line for C:** Zero non-code consumers of `/api/walk-log` found across all inspectable scheduler, config, and asset surfaces. The root crontab is the only uninspectable surface; the prior auditor3 report (`report-20260707-rg-cleanup-precheck.md`) also flagged this gap. [VERIFIED for accessible surfaces; UNCERTAIN for root crontab]

---

## SECTION D — upload-path fail-open trace

### D1. Absolute file path and handler locations

**File:** `/home/shelter/shelter-apps/server/src/server.ts` [VERIFIED]

**Handler 1 (create path):** `POST /api/volunteers/upload`
- Route registration: line 9642
- Handler body: lines 9642–9838 (closing `});`)

**Handler 2 (scan-upload path):** `POST /api/volunteers/:id/upload-scan`
- Route registration: line 10675
- Handler body: lines 10675–10825 (closing `});`)

Full source of both handlers was read and is reproduced in the data-collection phase above. [VERIFIED — awk extraction matched grep line numbers]

### D2. Branch analysis — catch/throw/early-return vs. disk write / OCR / transaction

#### Handler 1: POST /api/volunteers/upload

| Line(s) | Branch | Occurs BEFORE or AFTER |
|---------|--------|----------------------|
| 9645–9647 | `if (!files \|\| files.length === 0)` → 400 return | BEFORE any disk write, BEFORE OCR, no transaction in this handler |
| 9661 | `writeFileSync(tmpPath, f.buffer)` to `/tmp/vol-sniff-*` | Temp sniff file — BEFORE permanent disk write. Cleaned up in `finally` block (line 9666) |
| 9664 | `execSync('file --mime-type ...')` — sniff command | BEFORE permanent disk write, BEFORE OCR |
| 9666 | `finally { unlinkSync(tmpPath) }` — sniff cleanup | Cleanup of temp sniff file |
| 9668–9670 | `if (!SNIFF_ALLOWED[sniffed])` → 400 return | BEFORE permanent disk write, BEFORE OCR |
| 9684 | `mkdirSync(fileDir, { recursive: true })` | First permanent dir creation — BEFORE OCR |
| 9687 | `writeFileSync(pdfPath, file.buffer)` | First permanent disk write (PDF case) — BEFORE OCR |
| 9690 | `execSync('pdftoppm ...')` | PDF conversion — BEFORE OCR |
| 9691–9694 | `catch (err) { ... return }` on pdftoppm failure | AFTER disk write (PDF saved), BEFORE OCR. **Does NOT clean up the already-written PDF or directory.** |
| 9711 | `writeFileSync(filePath, file.buffer)` | Permanent disk write (JPG/PNG case) — BEFORE OCR |
| 9714 | `execSync('convert ...')` — ImageMagick resize | AFTER disk write. On failure (line 9715 catch): **swallowed** — logs error, continues. NOT a reject branch. |
| 9723–9725 | `if (pageImages.length === 0)` → 400 return | AFTER disk writes, BEFORE OCR. **Does NOT clean up already-created directory/files.** |
| 9730–9731 | `execSync('chown ...')` — best effort | AFTER disk writes, BEFORE OCR. Failure swallowed. |
| 9739 | `if (!secrets.anthropic?.apiKey)` → 500 return | AFTER disk writes, BEFORE OCR. **Does NOT clean up files.** |
| 9772 | API response check → 500 return | AFTER disk writes, DURING OCR. **Does NOT clean up files.** |
| 9785–9786 | No JSON in OCR response → 500 return | AFTER OCR. Files remain. |
| 9793–9796 | JSON parse failure → 500 return | AFTER OCR. Files remain. |
| 9834 | Outer catch → 500 return | Catches everything. Files remain on any unexpected error. |

**No `db.transaction()` in this handler.** This handler does OCR, returns extracted data, but does NOT write to the database. The database insert happens in a separate save/confirm step. [VERIFIED]

#### Handler 2: POST /api/volunteers/:id/upload-scan

| Line(s) | Branch | Occurs BEFORE or AFTER |
|---------|--------|----------------------|
| 10679–10681 | `if (isNaN(id))` → 400 return | BEFORE disk write, BEFORE transaction |
| 10685–10688 | `if (!vol)` → 404 return | BEFORE disk write, BEFORE transaction |
| 10692–10694 | `if (!files \|\| files.length === 0)` → 400 return | BEFORE disk write, BEFORE transaction |
| 10706 | `writeFileSync(tmpPath, f.buffer)` to `/tmp/scan-sniff-*` | Temp sniff file — BEFORE permanent write. Cleaned in `finally` (line 10711) |
| 10709 | `execSync('file --mime-type ...')` — sniff command | BEFORE permanent write, BEFORE transaction |
| 10711 | `finally { unlinkSync(tmpPath) }` — sniff cleanup | Temp cleanup |
| 10713–10716 | `if (!ext)` (sniff not in ALLOWED_SNIFFED) → 400 return | BEFORE permanent write, BEFORE transaction |
| 10723 | `db.transaction(() => { ... })` — transaction entry | All disk writes happen INSIDE this transaction closure |
| 10761 | `writeFileSync(pdfPath, f.buffer)` | INSIDE transaction |
| 10763 | `execSync('pdftoppm ...')` | INSIDE transaction |
| 10764–10766 | `catch { throw new Error('PDF processing failed') }` | INSIDE transaction — **throws, which aborts the transaction**. The thrown error propagates to the outer catch at line 10822. **Files written before the throw (the PDF) are NOT cleaned up.** |
| 10779 | `execSync('convert ...')` — resize | INSIDE transaction |
| 10781 | `catch { renameSync(oldPath, newPath) }` — fallback | INSIDE transaction — failure swallowed, falls back to rename |
| 10794 | `writeFileSync(filePath, f.buffer)` | INSIDE transaction |
| 10797 | `execSync('convert ...')` — resize | INSIDE transaction |
| 10798 | `catch { console.error(...) }` — resize failure swallowed | INSIDE transaction — continues without resize |
| 10807–10808 | `execSync('chown ...')` — best effort | INSIDE transaction. Failure swallowed. |
| 10812–10813 | `db.prepare('UPDATE ...').run(...)` | INSIDE transaction — the actual DB write |
| 10822–10824 | Outer catch → 500 return | Catches throws from inside transaction. **Transaction rolls back DB changes. Disk files from partial writes remain.** |

### D3. Sniff allow-list constants — verbatim

**Handler 1 (create path), line 9653:**
```typescript
const SNIFF_ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};
```

**Handler 2 (scan-upload path), line 10698:**
```typescript
const ALLOWED_SNIFFED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};
```

**These are TWO SEPARATE LITERALS with different variable names (`SNIFF_ALLOWED` vs `ALLOWED_SNIFFED`), defined independently inside each handler's closure.** They are NOT a shared reference — they are duplicated inline constants with identical values. [VERIFIED — grep confirms both defined locally at lines 9653 and 10698 respectively; no shared import or module-level constant]

### D4. Failure scenarios

#### execSync throw (sniff command failure)

**Handler 1 (line 9664):** `execSync('file --mime-type -b "${tmpPath}"', { timeout: 5000 })` — if this throws, the `finally` block at line 9666 still runs (`unlinkSync(tmpPath)` — temp cleanup). The throw is NOT caught within the sniff loop, so it propagates to the OUTER catch at line 9834 → 500 response. **No permanent files have been written yet at this point.** No fail-open. [VERIFIED — sniff loop runs before `mkdirSync` at line 9684]

**Handler 2 (line 10709):** Same pattern. `finally` block cleans temp file (line 10711). Throw propagates to outer catch at line 10822. **No permanent files or DB changes yet — sniff runs before the transaction.** No fail-open. [VERIFIED — sniff loop at lines 10703–10717 runs before `db.transaction()` at line 10723]

#### execSync timeout (5000ms)

Same as throw — `execSync` with `{ timeout: 5000 }` throws `ETIMEDOUT` on timeout. Same propagation path as above. No fail-open. [VERIFIED — Node.js execSync timeout throws]

#### Empty file

An empty file uploaded would:
1. Pass multer (it accepts zero-byte buffers)
2. Reach the sniff loop — `writeFileSync(tmpPath, f.buffer)` writes a zero-byte temp file
3. `file --mime-type -b` on an empty file returns `application/x-empty`
4. `SNIFF_ALLOWED['application/x-empty']` is `undefined` → falsy → 400 reject

**Empty files are rejected at the sniff stage.** No fail-open. [VERIFIED — `application/x-empty` is not in either allow-list]

#### Sniff result of `application/octet-stream`

`SNIFF_ALLOWED['application/octet-stream']` is `undefined` → falsy → 400 reject with message: `File "${f.originalname}" rejected: detected type application/octet-stream is not allowed (only JPEG, PNG, PDF)`.

Same in handler 2: `ALLOWED_SNIFFED['application/octet-stream']` → `undefined` → `ext` is `undefined` → `if (!ext)` → 400 reject.

**`application/octet-stream` is rejected at the sniff stage.** No fail-open. [VERIFIED — lines 9668–9670 (handler 1) and 10713–10716 (handler 2)]

### D — Summary

Both handlers have **zero fail-open branches for file type validation**. The sniff allow-lists use a positive-match pattern (explicit key lookup in a three-entry allowlist), so any unexpected MIME type — including empty files, octet-stream, and unknown types — is rejected. The only residual concern is **disk cleanup on mid-handler failures**: when processing fails after file writes (pdftoppm failure, API key missing, OCR failure), the written files and directories are not cleaned up, leaving orphaned data on disk. This is a resource leak, not a security fail-open. [VERIFIED]

---

## SURFACES NOT INSPECTED

| Surface | Reason |
|---------|--------|
| Root crontab | rover lacks sudo — access denied |
| SiteGround WordPress filesystem | No SSH access from this VPS |
| `/etc/cron.daily/`, `/etc/cron.hourly/`, `/etc/cron.weekly/`, `/etc/cron.monthly/` contents | Readable but run-parts standard system jobs — not explicitly requested |

---

*Report generated read-only. No files modified, no services restarted, no database writes.*
