# Adoptions Table — Concrn Header Left-Align — 2026-07-18

CSS-only change to left-align and trim right padding on the Concrn header column.

---

## Current Alignment (Before)

Base rule from `.profiles-table th, .profiles-table td`:
```css
text-align: center;
padding: 5px 6px;
```
All headers inherited `text-align: center` — confirmed cause of "Concrn" floating toward the right/center of its column. [VERIFIED]

## Scoped Rule Applied

```css
/* before */
#adoptionsTable th:nth-child(8) { max-width: 8ch; }

/* after */
#adoptionsTable th:nth-child(8) { max-width: 8ch; text-align: left; padding-left: 4px; padding-right: 0; }
```
[VERIFIED — line 2535]

## nth-child(8) Confirmation

Header order (unchanged since prior commits):
1. Date, 2. Applicant, 3. Animal(s), 4. Species, 5. Vet Ref, 6. Pers Ref, 7. Incomp, **8. Concrn**, 9. Note, 10. PDF, 11. Pend, 12. In Prog, 13. Declined, 14. Approved, 15. Adopted

nth-child(8) = Concrn ✓ [VERIFIED]

## git diff

```
 dashboard/index.html | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

-    #adoptionsTable th:nth-child(8) { max-width: 8ch; }
+    #adoptionsTable th:nth-child(8) { max-width: 8ch; text-align: left; padding-left: 4px; padding-right: 0; }
```
[VERIFIED — only dashboard/index.html, CSS-only, 1 line changed]

## Build + Restart

```
tsc: clean
shelter-app: active
```
[VERIFIED]

## Commit

```
[master f5ec4f9] Adoptions table: left-align + trim right padding on Concrn header to separate it from Note
 1 file changed, 1 insertion(+), 1 deletion(-)
```
[VERIFIED]

## Note on Checkbox Alignment

The Concrn column body cells contain checkboxes (`<input type="checkbox">`). The checkbox alignment is controlled by the base `.profiles-table td` rule (`text-align: center`), which was NOT changed. The header-only left-align may create a visual mismatch between the left-aligned "Concrn" label and the centered checkbox below it. No fix applied per instructions — reporting for review.
