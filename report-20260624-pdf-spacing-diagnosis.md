# Adoption PDF Spacing — Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Find why values overlap next labels, identify spacing levers, scope the fix.

---

## 1. The Overlap Cause — FIXED Row Heights on Variable-Length Content

### `fieldRow` (pdfGenerator.ts:98–108)

```ts
const fieldRow = (label: string, value: string | undefined, width: number = 512) => {
    // ...page-break at y > 720...
    doc.fontSize(9)...text(label + ':', 50, y);          // label at y
    doc.fontSize(10)...text(value || '—', 50, y + 12, { width: width - 10 });  // value at y+12
    const lines = Math.ceil((value || '—').length / 80) || 1;                  // LINE ESTIMATE
    y += 25 + (lines > 1 ? (lines - 1) * 12 : 0);                            // SEMI-DYNAMIC
};
```

`fieldRow` **attempts** dynamic spacing via `Math.ceil(len/80)` — estimates wrapped lines by dividing character count by 80. This is approximate: at 10pt Helvetica in 502pt width, actual chars/line is ~91, so the 80-char estimate is conservative (slightly over-estimates lines for full-width). **For full-width fields, this is roughly OK** but imprecise.

### `twoColumn` (pdfGenerator.ts:110–127)

```ts
const twoColumn = (...) => {
    // ...page-break at y > 720...
    doc...text(label1 + ':', 50, y);
    doc...text(val1 || '—', 50, y + 12, { width: 230 });    // value in 230pt column
    doc...text(label2 + ':', 290, y);
    doc...text(val2 || '—', 290, y + 12, { width: 230 });   // value in 230pt column
    y += 30;                                                  // FIXED — THE PROBLEM
};
```

`twoColumn` uses a **completely fixed** `y += 30` regardless of value length. At 10pt Helvetica in a 230pt column, ~42 characters fit per line. A value like "Elementary school teacher at Clarkstown South High School" (57 chars) wraps to 2 lines (~24pt of text), but only 30pt total is allocated for label (9pt) + value + gap. A longer value like the fence description (55 chars) or the personality type (80 chars → 2 lines) collides with the next field.

**Root cause:** `twoColumn` has zero line-wrapping awareness. `fieldRow` has crude awareness via character counting.

### Neither uses PDFKit's `heightOfString()`

PDFKit provides `doc.heightOfString(text, { width, fontSize })` which returns the exact rendered height including wraps. Neither helper uses it. Verified available: `typeof doc.heightOfString === 'function'` ✅.

---

## 2. Spacing Levers

### Label-to-value gap

| Helper | Gap | Location |
|--------|-----|----------|
| `fieldRow` | 12pt (value drawn at `y + 12`) | pdfGenerator.ts:106 |
| `twoColumn` | 12pt (values drawn at `y + 12`) | pdfGenerator.ts:119, 124 |

### Field-to-field gap (y increment after a field)

| Helper | Increment | Location | Dynamic? |
|--------|-----------|----------|----------|
| `fieldRow` | `25 + (lines-1)*12` | pdfGenerator.ts:108 | Semi (char-count estimate) |
| `twoColumn` | `30` (fixed) | pdfGenerator.ts:126 | **NO — root cause of overlap** |
| Previous Pet entry | `14 + 12 + 18 = 44` per pet | pdfGenerator.ts:209–213 | Fixed |
| Reference entry | `14 + 12 + 20 = 46` per ref | pdfGenerator.ts:241–245 | Fixed |

### Section header gap

| Element | Height | Location |
|---------|--------|----------|
| Green bar height | 22pt | pdfGenerator.ts:92 |
| Post-header gap | `y += 30` (bar 22pt + 8pt gap) | pdfGenerator.ts:95 |
| Pre-header page-break threshold | `y > 680` | pdfGenerator.ts:88 |

### Page margins

| Margin | Value | Location |
|--------|-------|----------|
| Top | 50pt | pdfGenerator.ts:49 |
| Bottom | 50pt | pdfGenerator.ts:49 |
| Left/Right | 50pt | pdfGenerator.ts:49 |
| Page-break threshold (fieldRow) | `y > 720` | pdfGenerator.ts:99 |
| Page-break threshold (sectionHeader) | `y > 680` | pdfGenerator.ts:88 |
| Page-break threshold (refRow) | `y > 700` | pdfGenerator.ts:235 |

LETTER page = 792pt. With 50pt bottom margin, usable bottom = 742pt. The fieldRow page-break at 720 leaves 22pt of safety (enough for one more label+value pair). Trimming bottom margin to 35pt would give an extra 15pt per page.

---

## 3. Page Budget

Simulation of the fully-populated test PDF (dog application, every field filled):

- **Page 1:** Header through Household (y reaches ~666 before Household header)
- **Page 2:** Residence through start of Commitment (y reaches ~584 after Commitment header)
- **Page 3:** Vet through Signature — **final y ≈ 463**

**Free space on page 3:** 742 − 463 = **~279pt (~3.9 inches)**

This is very generous. Even adding 5pt per field across ~40 fields (200pt total) would be absorbed within the 3-page budget. The main risk is per-page overflow pushing content to the next page earlier, but with 279pt of slack on page 3, there's ample room.

---

## 4. Recommended Fix — Dynamic Height via `heightOfString()`

### Option A (recommended): Make both helpers use `heightOfString()`

Replace the character-count estimate in `fieldRow` and the fixed `y += 30` in `twoColumn` with:

```ts
// In fieldRow:
const valueHeight = doc.fontSize(10).font('Helvetica').heightOfString(value || '—', { width: width - 10 });
y += 12 + valueHeight + 6;  // 12pt label-to-value + actual value height + 6pt gap

// In twoColumn:
const h1 = doc.fontSize(10).font('Helvetica').heightOfString(val1 || '—', { width: 230 });
const h2 = doc.fontSize(10).font('Helvetica').heightOfString(val2 || '—', { width: 230 });
y += 12 + Math.max(h1, h2) + 6;  // label + taller of the two values + gap
```

This is the **correct** fix because:
- It handles variable-length content exactly
- It uses PDFKit's own text-measurement (accounts for font metrics, word wrapping, etc.)
- No character-count heuristics that break at different widths
- The `Math.max(h1, h2)` for twoColumn handles the case where left and right values have different heights

**Feasibility:** Straightforward — `heightOfString` is a synchronous method available on the doc object. The change is ~4 lines per helper. No restructuring needed.

### Option B: Bump fixed values + trim margin

Increase `twoColumn`'s `y += 30` to `y += 40` and trim bottom margin from 50 to 35. This would reduce overlap for moderate values but still fail on very long ones. **Not recommended** — it's a band-aid.

### Additional improvements (both options)

- Trim bottom margin from 50pt to 35pt (page-break thresholds from 720→735, 680→695, 700→715) — gains ~15pt per page
- Add 2–3pt to the gap between fields (the `+ 6` above vs current tighter gaps)
- Both are safe given the 279pt slack on page 3

---

## 5. Revert Point

**Commit:** `bf233d9` — "adoption PDF: render user values in blue (#1A5276), labels/headers unchanged"

This is the current HEAD of pdfGenerator.ts. If spacing changes misbehave or push to 4 pages, revert to this commit.

```
bf233d9  server/src/pdfGenerator.ts
```
