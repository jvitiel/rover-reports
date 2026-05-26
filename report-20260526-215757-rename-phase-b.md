# Dashboard 11 — Phase B: Clients send shelterCode instead of animalId

**Date:** 2026-05-26 21:57 UTC
**Commit:** 30c8b70
**Depends on:** Phase A (c414ade) — server accept-both with warn-log

## Changes

### 1. profile-form.html (line 640)

**Before:**
```js
animalId: selectedAnimal.code,
```

**After:**
```js
shelterCode: selectedAnimal.code,
```

### 2. staff-pwa/app.js (line 2417)

**Before:**
```js
body: JSON.stringify({ audio: base64Audio, animalId: behaviorAnimalId, animalName: behaviorAnimalName, filename: 'recording.webm', caregiver: userName }),
```

**After:**
```js
body: JSON.stringify({ audio: base64Audio, shelterCode: behaviorAnimalId, animalName: behaviorAnimalName, filename: 'recording.webm', caregiver: userName }),
```

Note: line 2489 (`activeSessions.find(s => s.animalId.toUpperCase() ...)`) is a client-side session lookup, not a server POST field — left unchanged.

### 3. staging-staff/app.js (line 2417)

Identical change to staff-pwa/app.js.

### 4. Service worker cache bumps

| PWA | Before | After |
|-----|--------|-------|
| staff-pwa/sw.js | `staff-v22` | `staff-v23` |
| staging-staff/sw.js | `staging-staff-v60` | `staging-staff-v61` |

profile-form.html is not a PWA — no SW bump needed.

## Verification

### No deprecation warnings [VERIFIED]
- Started journalctl capture during test
- POST /api/caregiver/transcribe with `shelterCode: "A2023030"` (no `animalId` field) → success
- POST /api/caregiver/save with response → success
- `grep -i "deprecated"` on captured log → zero matches [VERIFIED]

### DB row correct [VERIFIED]
- `shelter_code = A2023030`, `caregiver = Phase B Test`, `source = app` [VERIFIED via sqlite3 query]

### Cleanup [VERIFIED]
- Test row deleted, count confirmed 0

## Not touched
- No server-side files modified
- No schema changes
- localDatabase.ts unchanged
- No other client files modified

## Phase C readiness
After Phase B, all three known Dashboard clients send `shelterCode`. Any future deprecation warn-logs in journalctl would indicate an unknown caller still using `animalId` — that's the signal Phase C (removing accept-both) waits for before proceeding.
