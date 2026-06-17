# Short Source Badge Missing — Diagnosis

**Date:** 2026-06-17 01:07 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. The Source Badge Render

Both long and short source badges are rendered in `renderBioContent` using the same pattern:

```javascript
// dashboard/index.html:7556-7568
function sourceLabel(source) {
  if (!source) return null;
  const labels = {
    youth_generic: 'Generic - Youth',
    adult_generic: 'Generic - Adult',
    from_profile: 'Derived from Profile',
    from_sm: 'Derived from SM Comment',
  };
  return labels[source] || null;
}
const srcLabelLong = sourceLabel(bio ? bio.sourceLong : null);   // line 7567
const srcLabelShort = sourceLabel(bio ? bio.sourceShort : null); // line 7568
```

Long badge (line ~7585):
```html
${srcLabelLong ? `<span class="bio-source">${srcLabelLong}</span>` : ''}
```

Short badge (line ~7611):
```html
${srcLabelShort ? `<span class="bio-source">${srcLabelShort}</span>` : ''}
```

[VERIFIED — dashboard/index.html:7556-7568, 7585, 7611]

**Both badges read from `bio` (the `animal_bios` row). Neither reads from `draft`.** [VERIFIED]

---

## 2. Draft vs Approved Source — The Asymmetry

When `useDraftShort = true` (draft content is displayed), the SHORT bio **content** comes from `draft.bioEnShort` / `draft.bioEsShort` (line 7541-7542), but the SHORT **source badge** still reads `bio.sourceShort` (line 7568).

Same issue for long: `useDraftLong = true` means content comes from `draft.bioEnLong` but the badge reads `bio.sourceLong`.

```javascript
// Content: draft-aware (lines 7534-7543)
const useDraftLong = draft && !draft.promotedLong;
const useDraftShort = draft && !draft.promotedShort;
const displayEnShort = useDraftShort ? draft.bioEnShort : (bio ? bio.bioEnShort : '');

// Badge: NOT draft-aware (lines 7567-7568)
const srcLabelLong = sourceLabel(bio ? bio.sourceLong : null);    // ← always bio
const srcLabelShort = sourceLabel(bio ? bio.sourceShort : null);  // ← always bio
```

The badge lines are NOT draft-aware. They always read the approved bio's source, never the draft's source. [VERIFIED]

---

## 3. The Data — Why Short Badge Is Missing

### Achilles (A2025088)

| Field | animal_bios (bio) | animal_bio_drafts (draft) |
|---|---|---|
| sourceLong | `from_sm` | `from_profile` |
| sourceShort | **NULL** | `from_profile` |

[VERIFIED via batch endpoint response]

- Long badge reads `bio.sourceLong = 'from_sm'` → `sourceLabel` returns `'Derived from SM Comment'` → badge **SHOWN** ✅
- Short badge reads `bio.sourceShort = NULL` → `sourceLabel` returns `null` → badge **HIDDEN** ❌

### Dante (S20241099)

| Field | animal_bios (bio) | animal_bio_drafts (draft) |
|---|---|---|
| sourceLong | `from_profile` | `from_profile` |
| sourceShort | **NULL** | `from_profile` |

[VERIFIED via batch endpoint response]

- Long badge reads `bio.sourceLong = 'from_profile'` → `'Derived from Profile'` → badge **SHOWN** ✅
- Short badge reads `bio.sourceShort = NULL` → `null` → badge **HIDDEN** ❌

### Why source_short is NULL in animal_bios

Both animals' `animal_bios` rows have empty `bio_en_short` (0 chars). The source backfill migration (localDatabase.ts:276) has a guard:

```sql
UPDATE animal_bios SET source_short = '${newVal}' 
WHERE last_source = '${oldVal}' AND bio_en_short != '' AND source_short IS NULL
```

The `bio_en_short != ''` guard means source_short was never backfilled for rows with empty short content. [VERIFIED — localDatabase.ts:276]

### Client-side draft object

The draft object **does** include `sourceShort`:

```
draft.sourceLong = 'from_profile'
draft.sourceShort = 'from_profile'
```

Both fields are present and populated on the client. The data is available — the badge just doesn't read it. [VERIFIED]

---

## 4. Why Other Pending Animals Show the Short Badge

### Charlie (R2023007) — badge SHOWS

| Field | animal_bios (bio) | animal_bio_drafts (draft) |
|---|---|---|
| sourceLong | `from_profile` | `from_profile` |
| sourceShort | `adult_generic` | `from_profile` |

[VERIFIED via batch endpoint response]

- Short badge reads `bio.sourceShort = 'adult_generic'` → `'Generic - Adult'` → badge **SHOWN** ✅

Charlie's `animal_bios` row has a populated `bio_en_short` (with adult generic content) and therefore `source_short = 'adult_generic'` was set during the backfill migration. The badge shows — but it shows the **wrong source** (`Generic - Adult` when the displayed content is actually from the profile draft). [VERIFIED]

### The pattern

| Animal Category | bio.sourceShort | Badge Shows? | Badge Correct? |
|---|---|---|---|
| Has populated short in animal_bios (most of the 19) | non-NULL (e.g. `adult_generic`, `from_profile`) | ✅ Yes | ❌ No — shows old bio source, not draft source |
| Has empty short in animal_bios (Achilles, Dante) | NULL | ❌ No | N/A — hidden |

The badge appears for the other 17 pending animals only because their `animal_bios` rows happened to have populated `bio_en_short` (and thus `source_short`). The badge is technically showing the **wrong** source for those too — it shows the approved bio's source, not the draft's source — but since most had `adult_generic` as the old source and `from_profile` as the draft source, the mismatch was only visible as a wrong label, not as a missing badge.

For Achilles and Dante, the mismatch manifests as a **missing badge** because `bio.sourceShort` is NULL. [VERIFIED]

---

## Conclusions

**(a) What field the short source badge reads:**

Both `srcLabelLong` and `srcLabelShort` read from `bio` (the `animal_bios` row), never from `draft`. Line 7567-7568 are not draft-aware. [VERIFIED]

**(b) It's a display bug, not a data gap:**

The client-side draft object includes `sourceShort = 'from_profile'` for both animals. The data is present. The badge code simply never reads from `draft` — it hardcodes `bio.sourceLong` / `bio.sourceShort`. [VERIFIED]

**(c) Why other pending animals are unaffected:**

Their `animal_bios` rows have non-NULL `source_short` (because they had populated short bio content). The badge shows but displays the **old bio's source**, not the draft's source. This is technically wrong but not visibly broken (the badge appears, just with the old source label). [VERIFIED]

**(d) The cleanest fix — 2 lines (dashboard/index.html:7567-7568):**

```javascript
// Before:
const srcLabelLong = sourceLabel(bio ? bio.sourceLong : null);
const srcLabelShort = sourceLabel(bio ? bio.sourceShort : null);

// After:
const srcLabelLong = sourceLabel(useDraftLong && draft ? draft.sourceLong : (bio ? bio.sourceLong : null));
const srcLabelShort = sourceLabel(useDraftShort && draft ? draft.sourceShort : (bio ? bio.sourceShort : null));
```

This fixes both the missing badge (Achilles/Dante) and the wrong-source badge (all other draft animals). When displaying draft content, the badge now shows the draft's source. When displaying approved content, it shows the bio's source. [VERIFIED — no other code changes needed; `useDraftLong`, `useDraftShort`, and `draft` are already in scope at this point in the function (lines 7534-7535)]
