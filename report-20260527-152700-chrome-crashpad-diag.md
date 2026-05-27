# Report: Chrome-as-shelter-user crashpad diagnostic

**Date:** 2026-05-27 15:27 ET
**Scope:** Dashboard 11 — read-only diagnosis of Chrome crashpad failure when invoked as shelter user.

---

## Findings

### Step 1 — Chrome binary

```
/usr/bin/google-chrome → /etc/alternatives/google-chrome → /usr/bin/google-chrome-stable → /opt/google/chrome/google-chrome
```
Google Chrome 148.0.7778.178 [VERIFIED]

### Step 2 — Version check as shelter

`sudo -u shelter google-chrome --version` → **succeeds**: `Google Chrome 148.0.7778.178` [VERIFIED]

### Step 3 — Headless run as shelter

`sudo -u shelter google-chrome --headless --no-sandbox --disable-gpu --dump-dom https://example.com` → **crashes**:

```
chrome_crashpad_handler: --database is required
Try 'chrome_crashpad_handler --help' for more information.
[3759850:3759850:0527/192747.425420:ERROR:third_party/crashpad/crashpad/util/linux/socket.cc:120] recvmsg: Connection reset by peer (104)
```

The crash is in `chrome_crashpad_handler` — it needs a `--database` directory to store crash reports, and it can't find or create one.

### Step 4 — Shelter's Chrome directories

| Path | Exists? |
|------|---------|
| `/home/shelter/.config/google-chrome/` | **No** |
| `/home/shelter/.config/chromium/` | **No** |
| `/home/shelter/.cache/google-chrome/` | **No** |
| `/home/shelter/.cache/chromium/` | **No** |
| `/home/shelter/Crashpad/` | **No** |
| `/tmp/Crashpad/` | **No** |

No Chrome profile directory exists for the shelter user at all.

### Step 5 — Rover's Chrome directories (working reference)

```
/home/rover/.config/google-chrome/
└── Crash Reports/
    ├── attachments/
    ├── completed/
    ├── new/
    ├── pending/
    └── settings.dat
```

This is the crashpad database directory that Chrome creates on first successful run. Rover has it; shelter doesn't.

### Step 6 — Root cause identified

**`/home/shelter/.config/` is owned by `root:root` (mode 755).** [VERIFIED]

```
drwxr-xr-x  2 root root 4096 May 15 03:21 /home/shelter/.config/
```

Shelter user **cannot create new files or directories** inside `.config/` — confirmed by touch test returning `Permission denied` [VERIFIED].

Chrome needs to create `~/.config/google-chrome/Crash Reports/{attachments,completed,new,pending}` on first run. It can't because the parent `.config/` directory denies write access to the shelter user.

**Why root-owned?** Directory was born 2026-02-13 (shelter account creation) and last modified 2026-05-15 03:21 by a root process. The existing files inside (shelter-secrets.json, google-sheets-credentials.json, etc.) were all created by root and are shelter-owned individually, but the directory itself was never chowned.

### Step 7 — visual.sh context

visual.sh uses **Playwright's bundled Chromium** at `/home/rover/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome` — not system Chrome [VERIFIED]. It runs as rover (no sudo in the script). This is why visual.sh works: it's a different browser binary running as a different user who has writable `.config/`.

The crashpad issue affects system `google-chrome` invoked as `shelter`, not Playwright's Chromium invoked as `rover`.

### Step 8 — Historical context

First identified during volunteer PDF generation (2026-05-25). Workaround: run Chrome/PDF generators as rover instead of shelter. Flagged as open infrastructure issue in Dashboard 10 handoff notes. No fix attempted — just documented as "generator must run as rover."

---

## Preliminary read on fix shape

**This is a simple ownership fix.** Two things needed:

1. **chown shelter:shelter /home/shelter/.config/** — give shelter write access to its own .config directory. This is the root cause. Once shelter can write to `.config/`, Chrome will auto-create `google-chrome/Crash Reports/` on first headless run.

2. **Test run** — after the chown, invoke `sudo -u shelter google-chrome --headless --no-sandbox --dump-dom https://example.com` and confirm it completes without the crashpad error.

**What this is NOT:**
- Not a Chrome installation issue (binary is accessible, --version works)
- Not a sandbox/seccomp issue (we're using --no-sandbox)
- Not a Playwright issue (Playwright uses its own bundled browser as rover)
- Not an environment variable issue (HOME is correct at /home/shelter)

**Risk:** Low. The only thing in `/home/shelter/.config/` right now is config files already owned by shelter. Changing directory ownership to shelter:shelter just lets shelter manage its own profile directory — standard Unix practice.

**Note:** The existing files inside `.config/` (shelter-secrets.json, etc.) are already `shelter:shelter` owned with mode 600. Only the directory itself is root-owned.
