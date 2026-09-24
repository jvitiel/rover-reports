# Availability Grid Cell-Color Logic — Diagnosis

**Date:** 2026-09-24  
**Type:** Read-only diagnosis (no writes, no restarts)  
**Subject:** How each grid cell gets its color, what yellow means, grid hour range, and web_form unparseable behavior

---

## 1. Color Logic

The cell color is determined by `availCellState()` at `dashboard/index.html:14319–14327`:

```javascript
function availCellState(vol, day, hourIdx) {
  const h = HOURS[hourIdx];
  const declined = vol.declines && vol.declines.some(d => d.day_of_week === day && d.hour === h);
  if (declined) return 'white_declined';
  const committed = vol.commitments.some(c => c.day_of_week === day && c.hour === h);
  if (committed) return 'red';
  const mask = vol.availability_mask[day];
  if (!mask || !mask[hourIdx]) return 'white';
  return vol.approved_for_task ? 'green' : 'yellow';
}
```

### Conditions (evaluated in order):

| Color | Condition | Meaning | file:line |
|-------|-----------|---------|-----------|
| **WHITE (declined)** | `vol.declines` contains a match for this day+hour | Volunteer explicitly declined this slot | `dashboard/index.html:14321` |
| **RED** | `vol.commitments` contains a match for this day+hour | Volunteer is already committed/booked for this slot | `dashboard/index.html:14323` |
| **WHITE** | `mask[hourIdx]` is false or mask is missing | Volunteer is NOT available at this hour (or availability unparseable → all-false mask) | `dashboard/index.html:14325` |
| **GREEN** | `mask[hourIdx]` is true AND `vol.approved_for_task` is true | Available AND approved for the selected task/skill | `dashboard/index.html:14326` |
| **YELLOW** | `mask[hourIdx]` is true AND `vol.approved_for_task` is false | Available but NOT YET approved for the selected task/skill | `dashboard/index.html:14326` |

### What drives each:
- **mask** (`vol.availability_mask[day]`): the 8-element boolean array from `parseTimeRange()` on the server, delivered via the `/api/volunteers/availability-grid` API
- **commitments/declines**: separate `volunteer_commitments` / `volunteer_declines` tables, loaded alongside the mask
- **approved_for_task**: whether the volunteer's `approved_<task>` column is true (e.g. `approved_dog_walk_socialize`)

---

## 2. Yellow Meaning [VERIFIED]

**Yellow = "available at this hour but NOT approved for the selected task."**

Evidence at `dashboard/index.html:14326`:
```javascript
return vol.approved_for_task ? 'green' : 'yellow';
```

This line is reached only when `mask[hourIdx]` is true (volunteer IS available). The sole difference between green and yellow is the `approved_for_task` boolean — it has nothing to do with:
- ~~"granularity unknown"~~ — not a factor
- ~~"almost any time" flag~~ — that flag just produces an all-true mask (8 cells lit), same as any fully-available day
- ~~"unparseable availability"~~ — unparseable values produce all-false masks, which show as WHITE, not yellow

**Yellow is purely an approval-status indicator, not an availability-confidence indicator.** [VERIFIED at `dashboard/index.html:14326`]

---

## 3. Grid Hours

Constants at `dashboard/index.html:14184–14185`:

```javascript
const HOURS = [9,10,11,12,13,14,15,16];
const HOUR_LABELS = ['9','10','11','12','1','2','3','4'];
```

**8 columns: 9am, 10am, 11am, 12pm, 1pm, 2pm, 3pm, 4pm.**

Each cell represents a 1-hour slot: cell index 0 = 9:00–10:00, ..., cell index 7 = 16:00–17:00 (4pm–5pm).

### Does a 4–5pm column exist?

**Yes.** The last column (hour 16, label "4") covers 4:00pm–5:00pm. The grid covers the full 9am–5pm range.

### Is 5pm truncated?

**No.** In `parseTimeRange()` at `server.ts:11203–11208`:

```javascript
for (let h = 9; h <= 16; h++) {
  const cellStart = h * 60;       // 960 for h=16
  const cellEnd = (h + 1) * 60;   // 1020 for h=16
  if (startMin < cellEnd && endMin > cellStart) {
    cells[h - 9] = true;
  }
}
```

An availability range ending at 5pm (endMin = 17×60 = 1020) lights cell 16 because `startMin < 1020` and `1020 > 960`. The full 9am–5pm window is represented.

---

## 4. Mask Source

`parseTimeRange()` at `server.ts:11100–11215` produces the boolean mask. It emits **8 boolean slots** per day (indices 0–7, mapping to hours 9–16).

Called via `parseAvailability()` at `server.ts:11217–11240`, which produces a `Record<string, boolean[]>` (7 days × 8 hours).

Source verbatim:

```typescript
function parseTimeRange(str: string): boolean[] {
  const cells = [false, false, false, false, false, false, false, false]; // hours 9-16
  const segments = str.split(',');
  let anyParsed = false;

  function parseToken(tok: string): { hour: number; minute: number; ampm: string | null } | null {
    const t = tok.trim();
    const m = t.match(/^(\d{1,4})(:(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return null;
    const digits = m[1];
    const colonMin = m[3] ? parseInt(m[3], 10) : null;
    const ampm = m[4] ? m[4].toLowerCase() : null;
    let hour: number;
    let minute: number;

    if (colonMin !== null) {
      hour = parseInt(digits, 10);
      minute = colonMin;
    } else if (digits.length === 3) {
      hour = parseInt(digits[0], 10);
      minute = parseInt(digits.slice(1), 10);
    } else if (digits.length === 4) {
      hour = parseInt(digits.slice(0, 2), 10);
      minute = parseInt(digits.slice(2), 10);
    } else {
      hour = parseInt(digits, 10);
      minute = 0;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute, ampm };
  }

  function to24(tok: { hour: number; minute: number; ampm: string | null }): number {
    let h = tok.hour;
    if (tok.ampm === 'am') { h = h === 12 ? 0 : h; }
    else if (tok.ampm === 'pm') { h = h === 12 ? 12 : h + 12; }
    return h;
  }

  for (const seg of segments) {
    const trimmed = seg.trim();
    const parts = trimmed.split(/\s*[-–—]\s*|\s+to\s+/i);
    if (parts.length !== 2) continue;

    const startTok = parseToken(parts[0]);
    const endTok = parseToken(parts[1]);
    if (!startTok || !endTok) continue;

    let startH: number;
    let endH: number;

    if (startTok.ampm && endTok.ampm) {
      startH = to24(startTok); endH = to24(endTok);
    } else if (startTok.ampm && !endTok.ampm) {
      startH = to24(startTok); endH = endTok.hour;
      if (endH <= startH && endH >= 1 && endH <= 12) endH += 12;
    } else if (!startTok.ampm && endTok.ampm) {
      endH = to24(endTok); startH = startTok.hour;
    } else {
      startH = startTok.hour; endH = endTok.hour;
      if (startH === 12) startH = 12;
      else if (startH >= 1 && startH <= 6) startH += 12;
      if (endH === 12) endH = 12;
      else if (endH >= 1 && endH <= 8) endH += 12;
    }

    const startMin = startH * 60 + startTok.minute;
    const endMin = endH * 60 + endTok.minute;
    if (endMin <= startMin) continue;

    for (let h = 9; h <= 16; h++) {
      const cellStart = h * 60;
      const cellEnd = (h + 1) * 60;
      if (startMin < cellEnd && endMin > cellStart) {
        cells[h - 9] = true;
      }
    }
    anyParsed = true;
  }

  return anyParsed ? cells : [false, false, false, false, false, false, false, false];
}
```

---

## 5. Submission Parser + Interpretation Table

### `AVAILABILITY_INTERPRETATIONS` — `server.ts:249–259`

```typescript
const AVAILABILITY_INTERPRETATIONS: Record<string, string> = {
  'all day': '9:00 AM - 5:00 PM',
  'anytime': '9:00 AM - 5:00 PM',
  'any time': '9:00 AM - 5:00 PM',
  'open': '9:00 AM - 5:00 PM',
  'flexible': '9:00 AM - 5:00 PM',
  'before noon': '9:00 AM - 12:00 PM',
  'morning': '9:00 AM - 12:00 PM',
  'afternoon': '12:00 PM - 5:00 PM',
  'evening': '2:00 PM - 5:00 PM',
};
```

### `normalizeAvailabilityString()` — `server.ts:264–310`

```typescript
function normalizeAvailabilityString(raw: string): { text: string; flag: 'interpreted' | 'unparseable' | null } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { text: '', flag: null };
  const upper = trimmed.toUpperCase();
  if (upper === 'NONE' || upper === 'NA' || upper === 'N/A' || upper === '—' || upper === '-')
    return { text: '', flag: null };

  const interpreted = AVAILABILITY_INTERPRETATIONS[trimmed.toLowerCase()];
  if (interpreted) return { text: interpreted, flag: 'interpreted' };

  const parts = trimmed.split(/\s*[\-–—]\s*|\s+to\s+/i);
  if (parts.length !== 2) return { text: trimmed, flag: 'unparseable' };

  const formatted = parts.map(part => {
    let p = part.trim().replace(/\s*(am|pm)\.?\s*$/i, '');
    if (p.includes(':')) {
      const [h, m] = p.split(':');
      const hour = h.replace(/^0+/, '') || '0';
      return `${hour}:${m}`;
    }
    const digits = p.replace(/\D/g, '');
    if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`;
    if (digits.length === 4) {
      const hour = digits.slice(0, 2).replace(/^0/, '');
      return `${hour}:${digits.slice(2)}`;
    }
    if (digits.length >= 1 && digits.length <= 2)
      return `${digits.replace(/^0/, '') || '0'}:00`;
    return p;
  });

  const result = `${formatted[0]} - ${formatted[1]}`;
  const digitCheck = formatted.every(f => /^\d{1,2}:\d{2}$/.test(f));
  if (!digitCheck) return { text: result, flag: 'unparseable' };
  return { text: result, flag: null };
}
```

---

## 6. Web_Form Unparseable Path [VERIFIED]

### The 400 rejection is scoped to `manual_entry` ONLY.

At `server.ts:9897–9901`:

```typescript
if (submissionSource === 'manual_entry' && formData.availability_flags) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const bad = days.filter(d => formData.availability_flags[d] === 'unparseable');
  if (bad.length > 0) {
    res.status(400).json({ ... });
    return;
  }
}
```

The guard is `submissionSource === 'manual_entry'` — web_form and paper_ocr submissions skip this check entirely.

### What happens for web_form with unparseable availability:

1. `normalizeAvailabilityFields(formData)` runs at `server.ts:9894` — normalizes text and sets `availability_flags` with `unparseable` markers
2. The 400 check is skipped (not `manual_entry`)
3. The row is INSERTed with the normalized text and stored flags
4. **Result: store + flag.** The unparseable value is stored (normalized text in `availability`, flag in `availability_flags`), and the volunteer is saved successfully. No 400 rejection.

**Web_form submissions are NOT being silently rejected** on unparseable availability. They are stored with flags. However, unparseable values will produce all-false masks in `parseTimeRange()`, making the volunteer invisible on the scheduling grid for those days. [VERIFIED at `server.ts:9894–9901`]

### Same behavior for paper_ocr:

Paper_ocr also skips the 400 check (not `manual_entry`). Unparseable OCR values are stored + flagged, shown with red highlight in the dashboard edit form, but saved.

### The PATCH path (edits):

At `server.ts:10892–10900`, dashboard edits DO reject unparseable availability regardless of source:

```typescript
if (formData.availability_flags) {
  const days = [...];
  const bad = days.filter(d => formData.availability_flags[d] === 'unparseable');
  if (bad.length > 0) { res.status(400)...; return; }
}
```

This means: initial paper_ocr/web_form submissions with unparseable values get saved, but staff cannot re-save the record without fixing those values first.
