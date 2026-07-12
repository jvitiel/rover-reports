# Volunteer Age Field — Client App HOLD Clearance

**Date:** 2026-07-12  
**Type:** Read-only pre-build hold check (Auditor SOP 3b)  
**Scope:** Do matcher-web/app.js, custom-search/app.js, or matcher-preview/app.js read or write volunteer age fields?

---

## 1. Grep Results

### Target field names searched

- `age_18_or_older`
- `age_under_18`
- `is_18_or_older`
- `age_if_under_18`

### Results

```
$ grep -n "age_18_or_older\|age_under_18\|is_18_or_older\|age_if_under_18" \
    matcher-web/app.js custom-search/app.js matcher-preview/app.js

(no output — exit code 1, zero matches)
```

**Zero hits across all three files.** [VERIFIED]

---

## 2. What the `age` Hits Actually Are

A broader `grep -n "age"` returns 75 hits (matcher-web), 63 hits (custom-search), 105 hits (matcher-preview). Every single one is **animal age** — i18n labels (`filter.age_label`, `card.age_yr`, `popup.age_year`), animal age filters (`ageFilter`, `ageInYears`, `ageMatch`), and animal age display functions (`truncateAgeToYears`, `formatAgeLong`). None reference volunteer data or the volunteers table.

These files have no concept of volunteers. They are public-facing animal browsing/matching UIs.

---

## 3. Bottom Line Per File

| File | Lines | Volunteer age field hits | Classification |
|------|-------|------------------------|----------------|
| **matcher-web/app.js** | 1178 | 0 | **NOT AFFECTED** — no volunteer age fields present |
| **custom-search/app.js** | 757 | 0 | **NOT AFFECTED** — no volunteer age fields present |
| **matcher-preview/app.js** | 1332 | 0 | **NOT AFFECTED** — no volunteer age fields present |

None of the three files READ or WRITE `age_18_or_older`, `age_under_18`, `is_18_or_older`, or `age_if_under_18`. They contain zero volunteer-related code. [VERIFIED]

---

## 4. SEARCHER/Matcher Handler Confirmation

The just-fixed SEARCHER handler (commits cf0cfc9, cce109c) lives in:
- `custom-search/app.js` — the AI search request path (`POST` to `/api/custom-search/search`, lines ~340-400)
- `matcher-web/app.js` and `matcher-preview/app.js` — animal card/filter rendering and media selection

**Confirmed:** None of the `age` hits in these files are inside the SEARCHER request path or the matcher media/selection logic. The SEARCHER request body (custom-search line 375) sends `{ species, sex, ageGroup, narrative }` — `ageGroup` is an animal age bracket filter (young/adult/senior), not a volunteer field. The matcher age filtering uses `animal.ageInYears` from the animal API response. [VERIFIED]

No volunteer data flows through any of these three files. The volunteer age fix (server.ts + localDatabase.ts + dashboard/index.html) has no impact on these client apps.

---

## Hold Clearance

**CLEARED.** All three files are unaffected by the volunteer age column changes. The change surface is limited to:
- `server/src/server.ts` (POST + PATCH handlers)
- `server/src/localDatabase.ts` (insert/update functions + schema migration)
- `dashboard/index.html` (age dropdown → read-only display)
- SQL backfill (one-time, 5 rows)
