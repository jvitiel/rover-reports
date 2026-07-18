# Adoptions Table Header Relabel — 2026-07-18

Two cosmetic header text renames in `dashboard/index.html`. No width/CSS, handler, or sort-key changes.

---

## Changed Lines

```html
<!-- line 5004: Concern → Concrn -->
<th class="sortable" onclick="sortAdoptionsBy('concerns')">Concrn <span class="sort-arrow" id="ad-sort-concerns"></span></th>

<!-- line 5005: Notes → Note -->
<th>Note</th>
```
[VERIFIED]

## Handlers Unchanged

```
sortAdoptionsBy('concerns')  → line 5004 (onclick intact) [VERIFIED]
openAdoptionNotesModal       → line 14885 (cell handler intact) [VERIFIED]
openAdoptionNotesModal       → line 14967 (function definition intact) [VERIFIED]
```

## git diff

```
 dashboard/index.html | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

-              <th class="sortable" onclick="sortAdoptionsBy('concerns')">Concern <span ...
-              <th>Notes</th>
+              <th class="sortable" onclick="sortAdoptionsBy('concerns')">Concrn <span ...
+              <th>Note</th>
```
[VERIFIED — only dashboard/index.html, only the two header words]

## Build + Restart

```
tsc: clean
shelter-app: active
```
[VERIFIED]

## Commit

```
[master ace40da] Adoptions table: relabel headers Concern->Concrn and Notes->Note (visual spacing, no width change)
 1 file changed, 2 insertions(+), 2 deletions(-)
```
[VERIFIED]
