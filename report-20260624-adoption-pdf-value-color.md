# Adoption PDF Value Color — Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Find where label/value pairs render in the PDF and how to make user values blue.

---

## 1. The PDF Generator

**File:** `/home/shelter/shelter-apps/server/src/pdfGenerator.ts`  
**Library:** PDFKit (`import PDFDocument from 'pdfkit'`)  
**290 lines total.**

Current color constants (pdfGenerator.ts:60–62):

```ts
const GREEN = '#7CB342';
const CHARCOAL = '#3D3835';
const GRAY = '#666666';
```

---

## 2. Label vs Value Separability — FULLY SEPARATE ✅

Two central helpers render almost every label/value pair:

### `fieldRow` (pdfGenerator.ts:97–105) — single-column field

```ts
const fieldRow = (label: string, value: string | undefined, width: number = 512) => {
    // ...page-break check...
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold')        // LABEL: gray, bold
       .text(label + ':', 50, y, { continued: false });
    doc.fontSize(10).fillColor(CHARCOAL).font('Helvetica')        // VALUE: charcoal, regular
       .text(value || '—', 50, y + 12, { width: width - 10 });
    // ...spacing...
};
```

### `twoColumn` (pdfGenerator.ts:107–121) — two fields side by side

```ts
const twoColumn = (label1: string, val1: string | undefined, label2: string, val2: string | undefined) => {
    // Left column
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold')        // LABEL 1: gray, bold
       .text(label1 + ':', 50, y);
    doc.fontSize(10).fillColor(CHARCOAL).font('Helvetica')        // VALUE 1: charcoal, regular
       .text(val1 || '—', 50, y + 12, { width: 230 });
    // Right column
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold')        // LABEL 2: gray, bold
       .text(label2 + ':', 290, y);
    doc.fontSize(10).fillColor(CHARCOAL).font('Helvetica')        // VALUE 2: charcoal, regular
       .text(val2 || '—', 290, y + 12, { width: 230 });
    // ...spacing...
};
```

**Labels and values are completely separate PDFKit `.text()` calls** with independent `.fillColor()` settings. Labels are `GRAY` (#666666) bold; values are `CHARCOAL` (#3D3835) regular.

---

## 3. How Color Is Set

PDFKit's `.fillColor(hex)` method sets the text color for subsequent `.text()` calls. Each label/value pair explicitly sets its own color before drawing. Current setup:

| Element | Color | Hex |
|---------|-------|-----|
| Section headers (green bars) | WHITE text on GREEN bg | `#FFFFFF` on `#7CB342` |
| Labels ("Full Name:") | GRAY, bold | `#666666` |
| User values ("Form Test User") | CHARCOAL, regular | `#3D3835` |
| Header/title | GREEN or CHARCOAL | varies |

---

## 4. Scope of Values — Central Helpers Cover Nearly All

The two helpers `fieldRow` and `twoColumn` cover the vast majority of rendered fields. A few special cases render values directly:

| Section | Rendering | Lines |
|---------|-----------|-------|
| All standard fields | `fieldRow` / `twoColumn` helpers | 97–121 (central) |
| Previous Pets (inline) | Direct `.text()` with `CHARCOAL` | 193–198 |
| References (inline) | `refRow` helper with `CHARCOAL` | 230–237 |
| Digital Signature | Direct `.text()` with `CHARCOAL` | 258–263 |
| Application # / date | Direct `.text()` with `GRAY` | 124–125 |

**Total spots to change value color:**

1. `fieldRow` — **1 spot** (line 101: `.fillColor(CHARCOAL)` → `.fillColor(VALUE_BLUE)`)
2. `twoColumn` — **2 spots** (lines 112, 116: both `.fillColor(CHARCOAL)` for values)
3. `refRow` values — **2 spots** (lines 234, 236)
4. Previous Pets values — **2 spots** (lines 195, 197)
5. Digital Signature name — **1 spot** (line 261)

Total: **8 `.fillColor(CHARCOAL)` calls** to change to blue. But 3 of those are in the central helpers (`fieldRow` + `twoColumn`), which cover ~90% of rendered fields.

---

## 5. Headers/Labels Stay Unchanged ✅

The change targets ONLY the `.fillColor()` calls on **value** `.text()` lines. Unaffected:

- **Section headers** (green bars): `sectionHeader()` at lines 88–93 — uses `GREEN` bg + `#FFFFFF` text
- **Labels** ("Full Name:", etc.): use `.fillColor(GRAY)` — distinct calls from values
- **Title/letterhead** ("ADOPTION APPLICATION"): uses `GREEN` at line 72
- **Shelter contact info**: uses `CHARCOAL` at lines 74–76 — these are static, not user values

The label and value draws are on completely separate lines with separate `.fillColor()` calls, so targeting values is clean and won't affect labels.

---

## 6. Minimal Change

**Approach:** Add a `VALUE_BLUE` constant and replace `CHARCOAL` with `VALUE_BLUE` on the 8 value-rendering lines.

**Constant (pdfGenerator.ts:60–62):**

```ts
const GREEN = '#7CB342';
const CHARCOAL = '#3D3835';
const GRAY = '#666666';
const VALUE_BLUE = '#1A5276';  // Dark navy blue — legible on white, doesn't clash with green
```

**Changes:**

| Location | Current | After |
|----------|---------|-------|
| `fieldRow` value (line 101) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| `twoColumn` val1 (line 112) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| `twoColumn` val2 (line 116) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| Previous Pet detail line 1 (line 195) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| Previous Pet detail line 2 (line 197) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| `refRow` detail line 1 (line 234) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| `refRow` detail line 2 (line 236) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |
| Digital Signature name (line 261) | `.fillColor(CHARCOAL)` | `.fillColor(VALUE_BLUE)` |

**Not changed (stay CHARCOAL):** shelter contact info in the header (lines 74–76) — these are static letterhead, not user values.

**Suggested blue:** `#1A5276` (dark navy — professional, readable on white, contrasts with gray labels without clashing with the green headers). Alternative: `#2155A3` (slightly brighter). John to confirm shade preference.

**Risk:** LOW — purely cosmetic. Only affects newly generated PDFs. Existing PDFs on disk are unchanged. The change touches only `pdfGenerator.ts`, no other files.
