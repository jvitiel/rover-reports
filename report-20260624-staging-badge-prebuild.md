# Staging + Badge Pre-Build Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Confirm staging safety + badge dimensions for 2-row label.

---

## PART A — Staging Safety

### 1. Staging App Location

**Directory:** `/home/shelter/shelter-apps/staging-staff/`  
**Production:** `/home/shelter/shelter-apps/staff-pwa/`

Separate directories, confirmed by `ls -la`. Currently identical content (diff returns empty on both `app.js` and `styles.css`).

**Caddy block** (Caddyfile):
```
staging-staff.4lgshelterapp.duckdns.org {
    import security_headers
    @api path /api/*
    reverse_proxy @api localhost:3000
    @data path /data/*
    reverse_proxy @data localhost:3000
    @notapi not path /api/* /data/*
    rewrite @notapi /staging-staff{uri}
    reverse_proxy localhost:3000
}
```

Non-API requests get rewritten to `/staging-staff{uri}` and proxied to the same Node server, which serves static files from `/home/shelter/shelter-apps/staging-staff/`. The API backend is shared (same server.ts / same DB) — only the frontend files are separate.

### 2. Sync Script

**Script:** `/home/shelter/scripts/staging-sync.sh`  
**Direction:** `staff-pwa → staging-staff` (**production OVERWRITES staging**)  
**Schedule:** Weekly, 02:30 UTC (Saturday night / Sunday morning ET)  
**Mechanism:** System crontab (shelter or root user — not readable by rover, but log confirms weekly execution)

**Idle gate** (staging-sync.sh, line ~42):
```bash
RECENT_EDITS=$(find "$TARGET" -type f -mtime -$STALE_THRESHOLD_DAYS ! -name "sw.js" ! -name "manifest.json" 2>/dev/null | head -5)
if [ -n "$RECENT_EDITS" ]; then
  log "SKIPPED — staging has edits within last ${STALE_THRESHOLD_DAYS} days:"
```

**Threshold:** 7 days (`STALE_THRESHOLD_DAYS=7`). If ANY file in staging-staff was modified within the last 7 days (excluding sw.js and manifest.json), the sync **SKIPS**. The log confirms this works — May 17/24/31 all SKIPPED because staging had recent edits.

**Risk assessment:**

| Question | Answer |
|----------|--------|
| Will the sync overwrite Stage 2? | **NO** — as long as we edit staging within 7 days of the next sync run |
| Next sync run | ~2026-06-28 02:30 UTC (Saturday night) |
| Protection | The idle gate. Our edits to staging-staff/ will set file mtime to today (6/24), which is well within 7 days of the 6/28 run → sync SKIPS. |
| What if staging goes untouched for 7+ days? | Then the NEXT Sunday sync (7/5) would overwrite. But by then we'll have either promoted to prod or touched staging again. |
| Rsync uses `--delete`? | **Yes** — files in staging not in staff-pwa get deleted on sync. This is fine as long as Stage 2 only modifies existing files (app.js, styles.css) and doesn't create new ones that prod doesn't have. |

**Bottom line:** Staging is safe to build on. The idle gate protects us. If we want extra safety, we can `touch` a staging file before any sync window.

---

## PART B — The Badge Box

### 3. Badge Markup + CSS Class at All 3 Render Sites

All three render sites are in **`staff-pwa/app.js`** (and identically in `staging-staff/app.js`):

**Site 1 — "My Cards" (pending checkout)** (app.js:776):
```js
<button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" onclick="openBehaviorForSession('${session.id}')" title="Profile">Profile</button>
```

**Site 2 — "Server Sessions" (other users' cards)** (app.js:1176):
```js
<button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" onclick="openBehaviorForSession('${sessionId}')" title="Profile">Profile</button>
```

**Site 3 — "Confirmed Cards" (post-confirmation)** (app.js:1278):
```js
<button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" onclick="openBehaviorForSession('${session.id}')" title="Profile">Profile</button>
```

All three use the identical class chain: `card-btn card-btn-small behavior-btn ${behaviorBtnClass}`.  
`behaviorBtnClass` resolves to either `behavior-green` or `behavior-red`.

### 4. Size CSS (styles.css)

**`.card-btn`** (styles.css:980):
```css
.card-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 8px;
  background: #F5F7F8;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
}
```

**`.card-btn-small`** (styles.css:1011):
```css
.card-btn-small {
  flex: 1;
  height: 40px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 600;
}
```

**`.behavior-btn`** (styles.css:1020):
```css
.behavior-btn {
  font-weight: 700;
}
```

**Parent container `.card-actions-row`** (styles.css:938):
```css
.card-actions-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
```

### 5. Effective Box Dimensions

| Property | Value | Source |
|----------|-------|-------|
| **Height** | **40px** (fixed) | `.card-btn-small { height: 40px }` |
| **Width** | **flex: 1** (auto-distributed) | `.card-btn-small { flex: 1 }` — all 4 buttons in the row share equal width |
| **Padding** | 8px top/bottom, 12px left/right | `.card-btn-small { padding: 8px 12px }` |
| **Border** | 2px solid | `.card-btn { border: 2px solid }` |
| **Font size** | 0.85rem (~13.6px at default 16px root) | `.card-btn-small` |
| **Font weight** | 700 | `.behavior-btn` overrides 600 from card-btn-small |
| **Line height** | ~1.2 (browser default, not explicitly set) | No line-height on `.card-btn`, body, or `.card-btn-small` |
| **Text alignment** | centered both axes | `.card-btn { display: flex; align-items: center; justify-content: center }` |
| **Content height** | ~16.3px for one line (13.6px × 1.2) | |
| **Available inner height** | 40px - 2×2px border - 2×8px padding = **20px** | |

**Width is NOT fixed** — it's `flex: 1`, meaning all 4 buttons in the `.card-actions-row` split the available width equally (minus 3 × 6px gaps). On a typical phone (375px viewport, ~20px card padding), each button gets approximately **85px** wide. No min-width or max-width is set.

### 6. Two-Row Label Recommendation

**Current single-line budget:**
- Inner height: 20px
- One line at 0.85rem (~13.6px) with ~1.2 line-height = ~16.3px → fits with ~3.7px slack

**Two-row target (must fit in 20px inner height):**
- Two lines need: `2 × (fontSize × lineHeight)` ≤ 20px
- At **0.65rem** (~10.4px) with **line-height: 1.0**: 2 × 10.4px = **20.8px** — borderline, needs tight line-height
- At **0.6rem** (~9.6px) with **line-height: 1.05**: 2 × 10.1px = **20.2px** — tight fit
- At **0.6rem** (~9.6px) with **line-height: 1.0**: 2 × 9.6px = **19.2px** — clean fit with 0.8px slack

**Starting recommendation:**
```css
.behavior-btn {
  font-size: 0.6rem;     /* ~9.6px — readable on mobile */
  line-height: 1.0;      /* tight but legible for 2-word labels */
  flex-direction: column; /* if using flex children, or... */
  white-space: normal;    /* allow text wrap within the button */
  text-align: center;
}
```

With the button's `display: flex; align-items: center; justify-content: center` already set, two lines of text at 0.6rem/1.0 will center vertically inside the 40px box. The label text (e.g. "Bio\nNeeded" or "Bio\nPriority") wraps naturally if `white-space: normal` is set (buttons default to `nowrap`).

**Alternative**: use an explicit `<br>` or `<span>` stack inside the button for precise control over which word goes on which line.

### 7. Do All 3 Sites Share the CSS Class?

**YES.** All three render sites use the identical class chain:
```
class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}"
```

One CSS change to `.behavior-btn` (or a new modifier class) covers all three sites. The only per-site difference is the JS variable source for `behaviorBtnClass` — the rendered HTML and CSS classes are identical.
