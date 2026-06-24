# Staging vs Production Diff — Pre-Port Analysis

**Date:** 2026-06-24  
**Scope:** Read-only comparison of staging-staff/ vs staff-pwa/.

---

## 1. File-Level Diff

| File | Status |
|------|--------|
| **app.js** | Differs — badge work only |
| **styles.css** | Differs — badge CSS only |
| **sw.js** | Differs — cache name only (`staging-staff-v61` vs `staff-v24`) |
| **manifest.json** | Differs — app name only (`Staging Staff` vs `Staff | Four Legs Good`) |
| **index.html** | Identical ✅ |
| **icon-192-original.png** | Staging-only (backup file, not in production) |
| **icon-512-original.png** | Staging-only (backup file, not in production) |
| All other files (icons, placeholder, logo, etc.) | Identical ✅ |

---

## 2. app.js — Every Hunk Classified

**Total: 7 diff hunks. ALL are category (a) badge work. Zero (b) drift. Zero (c) production-only.**

| Hunk | Lines (prod→staging) | Category | Description |
|------|---------------------|----------|-------------|
| 1 | 735a736–763 | (a) Badge | `getProfileBadge()` helper function (28 lines added) |
| 2 | 760c788–791 | (a) Badge | Site 1: replace `behaviorBtnClass` with `getProfileBadge` + badgeHtml |
| 3 | 776c807 | (a) Badge | Site 1: replace old button with `${badgeHtml}` |
| 4 | 1159c1190–1193 | (a) Badge | Site 2: replace `behaviorBtnClass` with `getProfileBadge` + badgeHtml |
| 5 | 1176c1210 | (a) Badge | Site 2: replace old button with `${badgeHtml}` |
| 6 | 1262c1296–1299 | (a) Badge | Site 3: replace `behaviorBtnClass` with `getProfileBadge` + badgeHtml |
| 7 | 1278c1315 | (a) Badge | Site 3: replace old button with `${badgeHtml}` |
| 8 | 2510–2512c2547–2563 | (a) Badge | `openBehaviorForSession` lookup fix (serverSessionId + serverActiveSessions fallback) |
| 9 | 2515c2566–2567 | (a) Badge | `openBehaviorForSession` scrollTo(0,0) + destructured args |

**(b) Unrelated drift: NONE.**  
**(c) Production-only code staging lacks: NONE.**

Staging app.js = production app.js + badge work. Nothing else.

---

## 3. styles.css — Every Hunk Classified

**Total: 3 diff hunks. ALL are category (a) badge CSS. Zero drift.**

| Hunk | Category | Description |
|------|----------|-------------|
| 1019c1019 | (a) Badge | Comment change: "Behavior button colors" → "Profile badge — 3-state (Stage 2)" |
| 1021a1022–1028 | (a) Badge | `.behavior-btn` additions: font-size 0.85rem, line-height 1.15, padding 2px, white-space normal, text-align center, overflow hidden |
| 1024c1031–1067 | (a) Badge | Replace `.behavior-green` with `.behavior-good` (pointer-events:none, cursor:default), add `.behavior-needs` (orange), `.behavior-priority` (red), hover states, legacy `.behavior-green`/`.behavior-red` compat rules |

**(b) Unrelated drift: NONE.**  
**(c) Production-only CSS staging lacks: NONE.**

---

## 4. Service Worker / Cache

### sw.js
Only difference: cache name string.
- **Production:** `const CACHE_NAME = 'staff-v24';` (staff-pwa/sw.js:2)
- **Staging:** `const CACHE_NAME = 'staging-staff-v61';` (staging-staff/sw.js:2)

The rest of the file is identical. Both use **network-first for code files** (HTML/CSS/JS) — fetch from network first, fall back to cache on failure (staff-pwa/sw.js:55–71).

### Cache bump needed?
Technically **no** — network-first means browsers get fresh code on every load when online. However, bumping from `staff-v24` to `staff-v25` will:
1. Force the SW to re-install (new cache name ≠ old → activate event deletes old cache)
2. Ensure any offline-cached copies of the old app.js/styles.css are replaced

**Recommendation:** Bump to `staff-v25` as a safety measure, even though network-first makes it technically optional.

### manifest.json
- **Production:** `"name": "Staff | Four Legs Good"`, `"short_name": "Staff"`
- **Staging:** `"name": "Staging Staff"`, `"short_name": "Stage"`

**Do NOT port** — production manifest must keep its own name.

---

## 5. Data Dependency — Production Endpoint

```
GET /api/sessions/active/cat → bioState=present, dateOfBirth=present ✅
```

Both fields confirmed live on the production endpoint (commits c03b2cd + bc76975 already deployed to server.ts). The port is **frontend-only** — no server changes needed.

(Dog sessions were all checked in at time of test; cat sessions confirmed both fields.)

---

## 6. Port Plan

### The port is CLEAN ✅

Staging = production + badge work. Zero unrelated drift. Zero production-only code at risk.

### Changes to apply to production staff-pwa/:

**staff-pwa/app.js** — apply all 9 diff hunks (all badge work):
1. Add `getProfileBadge()` helper (after line 735)
2. Replace `behaviorBtnClass` logic + button at Sites 1, 2, 3 (lines 760/776, 1159/1176, 1262/1278)
3. Replace `openBehaviorForSession` body (lines 2510–2515) with serverSessionId + serverActiveSessions fallback + scrollTo

**staff-pwa/styles.css** — apply all 3 diff hunks (all badge CSS):
1. Update `.behavior-btn` block (add font-size, line-height, padding, white-space, text-align, overflow)
2. Replace `.behavior-green` with `.behavior-good` + add `.behavior-needs`, `.behavior-priority`, hover states, legacy compat

**staff-pwa/sw.js** — bump cache version:
- `staff-v24` → `staff-v25` (safety, not strictly required with network-first)

### Do NOT port:
- **manifest.json** — staging has "Staging Staff" name; production keeps "Staff | Four Legs Good"
- **icon-*-original.png** — staging backup files, not needed in production
- **sw.js cache name prefix** — production uses `staff-v*`, not `staging-staff-v*`

### Nothing to preserve:
No production-only code exists that staging lacks. A diff-apply is safe. A wholesale `cp` of app.js/styles.css would also work (they're identical except for badge work), but the diff-apply approach is more explicit.
