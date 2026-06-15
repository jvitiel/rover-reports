# Dashboard: lock stat tiles to fixed width

**Commit:** `734815e` — `dashboard: lock stat tiles to fixed 130px width so sub-count length can't wrap SHOWING badge`  
**Scope:** `dashboard/index.html` only (1 insertion). Static file, live on save.

---

## Change

Added `width: 130px` to the existing `.stat-card.compact` rule:

```css
.stat-card.compact {
  padding: 8px 16px;
  min-width: 95px;
  width: 130px;    /* ← ADDED */
}
```

All four tiles (All, Dogs, Cats, Smalls) use this class. With `box-sizing: border-box` (global), the 2px border is included in the 130px — no size change on selection or hover.

## Width validation

Available content width inside 130px: `130 - 32px padding - 2px border = 96px`.

### Widest real content (All view)

| Tile | Big number | Sub-count | Fits 96px? |
|------|-----------|-----------|------------|
| All | 492 (3 digits @ 1.5rem bold ≈ 45px) | "81 approved" (11 chars @ 0.7rem ≈ 72px) | ✅ |
| Cats | 397 (3 digits ≈ 45px) | "69 approved" (11 chars ≈ 72px) | ✅ |
| Dogs | 69 (2 digits ≈ 30px) | "7 approved" (10 chars ≈ 65px) | ✅ |
| Smalls | 26 (2 digits ≈ 30px) | "5 approved" (10 chars ≈ 65px) | ✅ |

Labels ("All", "Dogs", "Cats", "Smalls") at 0.65rem are all well under 96px.

### Flex row width estimate

4 tiles (520px) + 3 inter-tile gaps (48px) + adoption toggle (~350px) + badge (~60px) + 2 more gaps (32px) ≈ 1010px — fits comfortably in typical dashboard viewport (1200-1400px).

## Verification

1. **Text clipping at 130px:** Widest content is "492" + "81 approved" (All view). At 0.7rem, "81 approved" ≈ 72px of the 96px available content width. No clipping or internal wrap.
2. **SHOWING badge wrap:** With fixed 130px tiles, the total first-row width is stable (~1010px) regardless of sub-count text. Badge stays on the same line.
3. **Equal width/alignment:** All four tiles are now 130px wide, aligned uniformly.
4. **Adoption filter switching:** Tiles stay 130px regardless of number changes (150→492→23). No reflow.
5. **Selection state:** `.active` changes only `border-color` and `background` — border width stays 2px, padding stays 8px 16px, width stays 130px. No box-size change.

## Not changed

- Species count logic, sub-count predicates, SHOWING badge, adoption toggle, search/BIO STATE section, active/hover rules, padding, borders, fonts
