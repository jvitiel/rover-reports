# visual.sh Screenshot Workflow Diagnosis

**Date:** 2026-05-27 12:40 ET (16:40 UTC)
**Scope:** Read-only. Understand visual.sh write path, consumption pattern, and Caddy dependency.

---

## 1. visual.sh Script

**Path:** `/home/rover/scripts/visual.sh`
**Length:** ~220 lines
**Subcommands:** `screenshot`, `measure`, `element`
**Dependencies:** Playwright (Node.js), chromium headless

### Key configuration (hardcoded in script)
```bash
SCREENSHOTS_DIR="/home/shelter/rover-reports/screenshots"
BASE_URL="https://rover-reports.4lgshelterapp.duckdns.org/screenshots"
INDEX_FILE="${SCREENSHOTS_DIR}/index.txt"
```

## 2. Screenshot Output Directory

**Path:** `/home/shelter/rover-reports/screenshots/`
**Current contents:** 53 files (PNGs + measure TXTs + index.txt)
**Date range:** 2026-05-12 to 2026-05-26
**Owner pattern:** `rover:shelter` (script runs as rover, directory has setgid for shelter group)

Files are NOT pruned by `rover-reports-prune.sh` — that script operates on `/home/shelter/rover-reports/*.md` only. The `visual-cleanup.sh` cron (`0 4 * * *` in rover's crontab) handles screenshot retention (14-day).

## 3. AGENTS.md Screenshot Section (lines 143–149)

```
16. Use `/home/rover/scripts/visual.sh` for layout work:
    - `visual.sh screenshot <url> <descriptor> [<viewport>]` — full-page screenshot
    - `visual.sh measure <url> <selector> <descriptor>` — DOM metrics
    - `visual.sh element <url> <selector> <descriptor> [<viewport>]` — element screenshot

    Discovery index: `https://rover-reports.4lgshelterapp.duckdns.org/screenshots/index.txt`.
    14-day retention. Any agent can fetch the index, find a descriptor, and retrieve the file.
```

The "any agent" language refers to the multi-agent pipeline: OC (Rover), Dashboard Opus, Website Opus. The index.txt URL is the cross-agent rendezvous point.

## 4. Discovery Index (index.txt)

**Path:** `/home/shelter/rover-reports/screenshots/index.txt`
**Lines:** 52
**Format:** `<ISO-8601 timestamp> | <type> | <descriptor> | <full URL>`
**Ordering:** Newest first (prepended)

Sample:
```
2026-05-26T18:00:12Z | screenshot | foster-form-phase2b-mobile | https://rover-reports.4lgshelterapp.duckdns.org/screenshots/2026-05-26-180012-foster-form-phase2b-mobile-mobile.png
```

## 5. Consumption Pattern

### a. How screenshots are returned
When OC runs `visual.sh screenshot`, the script outputs the full URL to stdout. OC captures that URL and typically:
1. Pastes the URL in the chat response or report for John to click
2. Pastes the URL in handoff reports for Dashboard Opus to fetch via `web_fetch`
3. Sometimes reads the local file path directly via OC's `read` or `image` tool (5+ instances found in session transcripts)

### b. How operational instances view screenshots
**Three consumption paths:**
1. **John in browser:** clicks the URL in chat/report, views PNG directly. This is the primary use case for screenshots.
2. **Dashboard Opus:** fetches the URL via web_fetch to analyze layout during multi-agent paste-relay sessions. The URL is the only way Dashboard Opus can see the screenshot (it doesn't have filesystem access).
3. **OC (Rover) itself:** can read the local file at `/home/shelter/rover-reports/screenshots/<filename>` directly. Does not need the Caddy URL for its own consumption. Session transcripts show OC using both the `image` tool with local paths and the `read` tool on measure TXTs.

### c. URL clickability
**Yes — the URL is designed to be clickable in chat.** John opens screenshot URLs in his browser to visually verify layout changes. This is the core value proposition of the screenshot workflow. Reports also embed these URLs for anyone reading the report to click.

### d. Index.txt consultation frequency
**Low.** In practice, OC runs `visual.sh`, captures the URL from stdout, and uses it directly. The index.txt is designed as a cross-agent discovery mechanism (e.g., Dashboard Opus asks "what did the last screenshot look like?" and fetches the index to find it), but most consumption is via the direct URL that visual.sh prints. The index is more of a safety net than a primary path.

## 6. Caddy Block

```
# Lines 170-180 of /etc/caddy/Caddyfile
rover-reports.4lgshelterapp.duckdns.org {
    import security_headers
    root * /home/shelter/rover-reports
    @md path *.md
    header @md Content-Type "text/plain; charset=utf-8"
    @indexfile path /screenshots/index.txt
    header @indexfile Cache-Control "no-cache, no-store, must-revalidate"
    file_server browse
}
```

The block serves the entire `/home/shelter/rover-reports/` directory — both `.md` reports AND the `screenshots/` subdirectory. The `@indexfile` matcher adds no-cache headers specifically for index.txt (so agents always get the latest).

Screenshots (PNGs, TXTs) are served with default MIME types by Caddy's file_server. No special screenshot-specific configuration beyond the index.txt cache header.

## 7. File Naming Pattern

```
YYYY-MM-DD-HHMMSS-<descriptor>-<viewport-label>.png    (screenshots)
YYYY-MM-DD-HHMMSS-<descriptor>-measure.txt              (measure results)
YYYY-MM-DD-HHMMSS-<descriptor>-elem-<viewport-label>.png (element screenshots)
```

Examples:
```
2026-05-24-214442-matcher-en-default-1280x900.png
2026-05-24-214538-es-hero-title-measure.txt
2026-05-26-180012-foster-form-phase2b-mobile-mobile.png
```

---

## Impact Assessment: Caddy Block Retirement

### What breaks if the Caddy block is retired

| Consumer | Impact | Severity |
|----------|--------|----------|
| **John clicking URLs in chat** | Dead links — can't view screenshots in browser | 🔴 High |
| **Dashboard Opus fetching via web_fetch** | Can't fetch screenshots for layout analysis | 🔴 High |
| **OC (Rover) itself** | No impact — reads local files directly | ⚪ None |
| **Reports with embedded screenshot URLs** | Historical URLs become dead links | 🟡 Low (historical) |
| **index.txt cross-agent discovery** | Index URLs dead; index itself inaccessible via web | 🟡 Medium |

### Key insight
**Reports have migrated to GitHub raw URLs, but screenshots have NOT.** GitHub raw URLs work well for `.md` text files, but PNGs would need to be committed to the repo (bloating it), or served from a different image hosting path. The Caddy block currently does double duty: text reports (migrated away) and binary screenshots (not migrated).

### Migration options

**(a) Migrate screenshots to GitHub:** Would bloat the repo with binary files. Not practical for 53+ PNGs (some 4MB+). Could use GitHub Releases or LFS, but that's heavyweight for a debugging workflow.

**(b) Keep Caddy serving screenshots only:** Comment out the `.md` content-type header and the general report serving. Narrow the Caddy block to serve only `screenshots/` subdirectory. Keeps existing workflow intact with minimal change.

**(c) Replace with a different serving mechanism:** e.g., inline the screenshots as base64 in chat (bad — huge), or use OC's built-in media serving if available, or just have OC describe the screenshots to Dashboard Opus (loses visual verification for John).

**(d) Use OC's image tool + Telegram:** OC takes screenshot → sends PNG to John via Telegram `--media` flag. No URL needed. Dashboard Opus would need a different path (OC describes the image).

### Recommendation [INFERRED — not a directive, just analysis]
Option (b) appears simplest: narrow the Caddy block to screenshots-only serving. The `.md` reports are already on GitHub. This preserves John's click-to-view workflow and Dashboard Opus's web_fetch access with minimal change to the Caddy config and zero change to visual.sh.
