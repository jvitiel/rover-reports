# Remove Pet Supplies Plus — ES Page (ID 345, como-ayudar)

**Date:** 2026-05-27 09:52 ET (13:52 UTC)
**Page:** ID 345, slug `como-ayudar` (ES mirror of page 8)
**Action:** Removed Pet Supplies Plus retailer card from "Envía suministros directamente al refugio" section

## Before (supplier-cards container)

```html
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide">
  <!-- wp:column ... --> The Family Pet Store <!-- /wp:column -->
  <!-- wp:column ... --> Pet Supplies Plus <!-- /wp:column -->
  <!-- wp:column ... --> Chewy <!-- /wp:column -->
  <!-- wp:column ... --> Amazon <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

4 child `wp:column` blocks, no explicit column widths.

## After (supplier-cards container)

```html
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide">
  <!-- wp:column ... --> The Family Pet Store <!-- /wp:column -->
  <!-- wp:column ... --> Chewy <!-- /wp:column -->
  <!-- wp:column ... --> Amazon <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

3 child `wp:column` blocks. No width adjustment needed — columns have no explicit widths, auto-distribution handles the 4→3 shift (same as EN page 8 edit).

## Layout adjustment

None required. The `wp:columns` container uses automatic equal-width distribution. Removing one child column causes the remaining three to auto-distribute at ~33.33% each. No explicit `width` attributes were present on any column. Identical behavior to the EN page 8 edit.

## Timestamps

| | Value |
|---|---|
| post_modified before | 2026-05-25 21:16:06 |
| post_modified after | 2026-05-27 13:52:32 |

## Verification

| Check | Result |
|---|---|
| post_content grep "Pet Supplies Plus" | 0 matches [VERIFIED] |
| post_content grep "Family Pet" | 1 match [VERIFIED] |
| post_content grep "Chewy" | 1 match [VERIFIED] |
| post_content grep "Amazon" | 1 match [VERIFIED] |
| curl live page grep "Pet Supplies Plus" | 0 matches [VERIFIED] |
| curl live page grep "Family Pet" | 1 match [VERIFIED] |
| curl live page grep "Chewy" | 1 match [VERIFIED] |
| curl live page grep "Amazon" | 1 match [VERIFIED] |

No cache purge needed — live page reflected the change immediately.

## Scope

- Single `wp post update 345` — no other pages, posts, or theme files touched
- Section heading "Envía suministros directamente al refugio" and intro paragraph unchanged
- Remaining three card contents unchanged (titles, descriptions, links, classes)
- Business names kept in English (proper nouns, matching existing pattern)
