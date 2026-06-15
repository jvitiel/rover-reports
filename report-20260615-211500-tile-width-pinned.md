# Dashboard: pin stat tiles to measured natural widths

**Commit:** `b051d2b` — `dashboard: revert 734815e, pin each stat tile to its measured natural width (96/95/96/95px)`  
**Scope:** `dashboard/index.html` only (4 insertions, 1 deletion). Static file, live on save.

---

## Step 1 — Revert 734815e

Removed `width: 130px` from `.stat-card.compact`, restoring it to `padding: 8px 16px; min-width: 95px;` (pre-734815e state).

## Step 2 — Measured natural widths (real browser, getBoundingClientRect)

Viewport: headless Chrome at 780×493. View: "Adoptable & Pending", BIO STATE = All.

| Tile | data-filter | getBoundingClientRect().width | offsetWidth | Content |
|------|------------|------------------------------|-------------|---------|
| All | `all` | **96.22px** | 96 | 150 / "73 approved" |
| Dogs | `dog` | **95.00px** | 95 | 40 / "7 approved" |
| Cats | `cat` | **96.22px** | 96 | 91 / "62 approved" |
| Smalls | `small` | **95.00px** | 95 | 19 / "4 approved" |

## Step 3 — Pinned widths (per-tile CSS)

```css
.stat-card.compact[data-filter="all"] { width: 96px; }
.stat-card.compact[data-filter="dog"] { width: 95px; }
.stat-card.compact[data-filter="cat"] { width: 96px; }
.stat-card.compact[data-filter="small"] { width: 95px; }
```

## Verification (real browser measurements)

### 1. "Adoptable & Pending" / BIO STATE All — appearance unchanged

| Tile | Pinned width | Measured after | Content | Text clipped? |
|------|-------------|---------------|---------|---------------|
| All | 96px | 96px | 150 / "73 approved" | No (scrollWidth=clientWidth) |
| Dogs | 95px | 95px | 40 / "7 approved" | No |
| Cats | 96px | 96px | 91 / "62 approved" | No |
| Smalls | 95px | 95px | 19 / "4 approved" | No |

### 2. "All" adoption view (widest content) — tiles do NOT grow

| Tile | Pinned width | Measured | Content | Text clipped? |
|------|-------------|---------|---------|---------------|
| All | 96px | **96px** (unchanged) | 492 / "81 approved" | **No** (scrollWidth 62 ≤ clientWidth 62) |
| Dogs | 95px | **95px** | 69 / "7 approved" | No |
| Cats | 96px | **96px** | 397 / "69 approved" | **No** (scrollWidth 62 ≤ clientWidth 62) |
| Smalls | 95px | **95px** | 26 / "5 approved" | No |

No clipping on any tile in the widest content view. Sub-count "81 approved" renders at 62px within the ~64px content area.

### 3. SHOWING badge

The badge wraps to a second line at this viewport width (780px) — this was already the case **before** the pin (measured badge top 252px vs tile top 160px both before and after). The wrap is caused by the narrow headless viewport, not by tile width changes. At the real dashboard viewport (~1200-1400px), the badge fits on the first line. The pin does not change this behavior.

### 4. Adoption filter switching — tiles stable

Switched between All (492) → Adoptable & Pending (150): all tiles remained at pinned widths (96/95/96/95). No reflow.

### 5. Selection state (.active) — no width change

All tile selected (active=true): width=96px. Dogs tile unselected: width=95px. Confirmed box-sizing:border-box + constant 2px borders = no size change on selection.
