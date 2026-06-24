# Adoptions Tab Stage 2 — Dashboard Tab Implementation

**Date:** 2026-06-24  
**Commit:** `838f40b` — `dashboard/index.html` only (80 insertions)

---

## Tab Button (between Profiles and Web Stories)

**dashboard/index.html:5228** (new line):

```html
<button class="tab-btn" onclick="switchTab('adoptions')" id="tab-adoptions">📝 Adoptions</button>
```

Tab order: Media → Profiles → **Adoptions** → Web Stories → Web Events → Activities → ...

## Content Section

**dashboard/index.html:5406–5427** — `<div class="tab-content" id="content-adoptions">`

Contains:
- Header "Adoption Applications" + stats line (count)
- Table using `profiles-table` class (matches existing dashboard table styling)
- 5 columns: Date | Applicant | Animal(s) | Species | PDF
- Empty state: "No adoption applications found."
- Loading state: "Loading applications…"

## switchTab Integration

**dashboard/index.html** (in `switchTab()` function):

```js
} else if (tabName === 'adoptions') {
    loadAdoptionsData();
}
```

## Data Loader

**`loadAdoptionsData()`** — async function mirroring `volLoadList()`:

1. Shows loading state, hides table/empty
2. Fetches `GET /api/adoption-applications`
3. On success:
   - Shows stats: `"9 applications"`
   - Renders rows newest-first (endpoint's order preserved)
   - Date formatted as MM/DD/YY (matches volunteer table: `toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })`)
   - Species mapped: `cat → Cat`, `dog → Dog`, `small_animal → Small Animal`
   - PDF column: `<a href="/adoption-pdfs/..." target="_blank" rel="noopener">📄 View PDF</a>` — opens in new tab
   - Missing pdfUrl → shows "—"
   - Names escaped via existing `escapeHtml()`
4. On error: shows "Failed to load adoption applications."

---

## Untouched

| Component | Status |
|-----------|--------|
| server/src/server.ts | **Not modified** — GET endpoint from Stage 1 unchanged |
| POST /api/adoption-application | **Not modified** — submission handler untouched |
| Other tabs (Profiles, Web Stories, etc.) | **Not modified** — switchTab structure preserved |

---

## Verification

### Tab positioning
- Tab bar order confirmed: Media → Profiles → **Adoptions** → Web Stories → ...
- Content section order confirmed: content-profiles (5321) → content-adoptions (5406) → content-stories (5430)

### Table data
- Endpoint returns 9 applications, newest first
- Row 1: 05/14/26 | John Vitiello | — | Cat | 📄 View PDF
- Row 3: 03/15/26 | Email Test | Buddy | Dog | 📄 View PDF
- All 9 rows have pdfUrl (all PDFs verified resolving to HTTP 200 in Stage 1)

### PDF links
- `target="_blank" rel="noopener"` on all PDF links — opens in new tab
- URL pattern: `/adoption-pdfs/{id}-{Name}-{date}.pdf` — served by Express static middleware

### Other tabs
- Profiles, Web Stories, Volunteers, and all other tabs unaffected — switchTab function has new `else if` appended, no existing branches modified

---

## Commit

```
838f40b dashboard: add Adoptions tab between Profiles and Web Stories (table of adoption applications with PDF links)
 1 file changed, 80 insertions(+)
 dashboard/index.html
```
