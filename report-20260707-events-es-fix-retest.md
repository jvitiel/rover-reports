# Events EN→ES Fix + Retest — 2026-07-07

## PART 1 — THE FIX

### S1 — Backup

Filename: `functions.php.bak-20260707-023800` (61,524 bytes). [VERIFIED]

### S2 — Edit

Added `'post_status' => 'any',` after `'posts_per_page' => -1,` in the `$es_candidates = get_posts(...)` block inside `flg_create_and_link_es_event`. [VERIFIED]

### S3 — Diff gate

```diff
1571a1572
>             'post_status'    => 'any',
```

Exactly one line added, in the correct block. [VERIFIED]

### S4 — Syntax gate + swap

```
No syntax errors detected in functions.php.work
Swap complete
```

[VERIFIED]

### S5 — Site health

```
Homepage:  200
Events:    200
ES Events: 200
```

[VERIFIED]

---

## PART 2 — POST-FIX RE-TEST

### T1 — Create+link

**Response:**

```json
{
    "success": true,
    "post_id": 456,
    "action": "created",
    "es_post_id": 457,
    "es_status": "created"
}
HTTP: 200
```

EN=456, ES=457. Both immediately converted to draft. [VERIFIED]

**Linkage:**

```
pll_get_post(456, 'es') = 457  ✓
pll_get_post(457, 'en') = 456  ✓
EN term: 29 | a:2:{s:2:"en";i:456;s:2:"es";i:457;}
ES term: 29 | a:2:{s:2:"en";i:456;s:2:"es";i:457;}
```

Shared post_translations term 29, bidirectional link. [VERIFIED]

### T2 — Idempotency

**ES count BEFORE:** 2

**Response:**

```json
{
    "status": "adopted",
    "es_post_id": 457,
    "success": true
}
HTTP: 200
```

**ES count AFTER:** 2

Same es_post_id (457), `adopted`, count unchanged (2→2). **PASS.** [VERIFIED]

### T3 — Draft-orphan (FIX VALIDATION)

EN2=458, ORPHAN=459 (draft, event_date 2020-07-20, lang=es, unlinked: `pll_get_post(459,'en')=0`).

**ES count BEFORE:** 3

**Response:**

```json
{
    "status": "orphan_conflict",
    "message": "Unlinked ES event on the same event_date; refusing to create a duplicate",
    "orphan_es_post_id": 459,
    "success": false
}
HTTP: 409
```

**ES count AFTER:** 3

Draft orphan correctly detected. Count unchanged (3→3). **PASS — fix validated.** [VERIFIED]

Prior test (pre-fix): same scenario returned `status=created` with a new ES post, count 3→4 (the bug). Now returns `orphan_conflict` 409 (the fix). [VERIFIED — compared against report-20260707-events-es-test-artifact.md Scenario 4a]

### T4 — Draft orphan (second date)

EN3=460, DORPH=461 (draft, event_date 2020-08-25, lang=es, unlinked).

**ES count BEFORE:** 4

**Response:**

```json
{
    "status": "orphan_conflict",
    "message": "Unlinked ES event on the same event_date; refusing to create a duplicate",
    "orphan_es_post_id": 461,
    "success": false
}
HTTP: 409
```

**ES count AFTER:** 4

Count unchanged (4→4). **PASS.** [VERIFIED]

### T5 — Cleanup

All 6 test posts trashed:

```
Success: Updated post 456.  (EN, draft → trash)
Success: Updated post 457.  (ES, draft → trash)
Success: Updated post 458.  (EN2, draft → trash)
Success: Updated post 459.  (orphan, draft → trash)
Success: Updated post 460.  (EN3, draft → trash)
Success: Updated post 461.  (dorph, draft → trash)
```

All 6 confirmed `post_status=trash`. Zero ZZTEST2 posts in publish or draft. [VERIFIED]

---

## Summary

| Test | Result |
|------|--------|
| T1 Create+link | **PASS** — EN 456 + ES 457 created, linked, term 29 shared |
| T2 Idempotency | **PASS** — adopted, same id, count 2→2 |
| T3 Draft-orphan | **PASS** — orphan_conflict 409, count 3→3 (was FAIL pre-fix) |
| T4 Draft-orphan #2 | **PASS** — orphan_conflict 409, count 4→4 |
| T5 Cleanup | **PASS** — all 6 trashed |

All 5 tests pass. The `post_status => 'any'` fix resolves the draft-orphan gap. Site healthy throughout.
