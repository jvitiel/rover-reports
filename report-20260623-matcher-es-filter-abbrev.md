# Matcher-Preview: Spanish Filter Abbreviation Report

**Date:** 2026-06-23  
**Commit:** `1bcffd0`  
**File changed:** `matcher-preview/app.js` (1 file, 3 insertions, 3 deletions)

---

## Changes (ES values only)

| Key | Before (ES) | After (ES) | EN (unchanged) | Line |
|-----|------------|------------|----------------|------|
| `filter.energy_unknown` | Desconocido | **Desc.** | Unknown | 182 |
| `filter.compat_unknown` | Desconocido | **Desc.** | Unknown | 188 |
| `filter.special_needs_label` | Necesidades Especiales | **Nec. Especiales** | Special Needs | 173 |

### Rendering impact:
- `filter.energy_unknown` → 1 pill (Energy group)
- `filter.compat_unknown` → 3 pills (Good with Kids / Dogs / Cats via shared cbMap at app.js:345,349,353)
- `filter.special_needs_label` → 1 group label
- **Total: 4 pills + 1 label abbreviated**

---

## Not Touched

- **EN values:** `'Unknown'` (lines 70, 76) and `'Special Needs'` (line 61) — unchanged
- **Overlay keys:** `overlay.special_needs` → still "Necesidades especiales" (line 246); `overlay.energy_*` → still "Energía baja/media/alta"
- **Modal keys:** `modal.*` — unchanged
- **Good-with group labels:** "Bueno con Niños/Perros/Gatos" — unchanged (second row, not the overflow culprit)
- **No key renames, no JS logic, no CSS changes**
- **matcher-web (production):** not touched

---

## Verification

- **ES (Español):** Filter labels show "NEC. ESPECIALES" (uppercased by CSS), "Desc." on Energy and all three compat Unknown pills. First filter row fits on two lines (no third-line overflow).
- **EN (English):** Still shows "SPECIAL NEEDS", "Unknown" — no abbreviation leaked. Two-line layout unchanged.
- **Overlay/popup (ES):** Hover overlay still displays full "Necesidades especiales" and full energy labels. Namespace isolation confirmed — `filter.*` changes did not affect `overlay.*` or `modal.*`.
- **Filter functionality:** Abbreviated pills still filter correctly — the underlying `value` attributes (e.g. `value="unknown"`) are unchanged; only the displayed label text shortened.
- **JS syntax:** `node -c` passes. Serves 200.
