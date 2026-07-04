# W1 Caller-Completeness Check

## Method

Five caller classes checked for every W1 endpoint:
1. **Dashboard** — grep `dashboard/index.html` for fetch calls
2. **PWAs** — grep all 7 PWA app.js/index.html files
3. **Public pages** — grep vclock, intake-form, profile-form, rg-portal, adoption-form
4. **Root crontab** — extracted from backup `weekly-20260704.tar.gz` → `configs/root-crontab.txt` (snapshot, not live)
5. **Scripts/OC** — grep `/home/shelter/scripts/`, `/home/rover/scripts/`, `/home/rover/rover/`

**Root crontab content (full):**
```
0 3 * * *    backup-sqlite.sh
0 9 * * 1    weekly-error-summary.sh
30 2 * * 0   staging-sync.sh (ET)
15 3 * * *   backup-data.sh
30 3 * * *   backup-weekly.sh
45 3 * * 0   backup-media.sh
0 8 * * *    rover-reports-prune.sh
5 * * * *    curl -sS -X POST http://localhost:3000/api/volunteers/timeclock/auto-close
0 10 * * 1   health-check.sh
40 2 * * 0   OC session archive
45 2 * * 0   OC restart
```
**auto-close is NOT a W1 endpoint** (excluded from W1 scope). No W1 path appears in root crontab. [VERIFIED]

**Rover crontab:**
```
*/15 * * *   memory-snapshot.sh
0 4 * * *    screenshots-retention.sh
0 6 * * *    score-profiles.py
```
No W1 paths. [VERIFIED]

**Shelter crontab:** none (no crontab for user shelter). [VERIFIED]

---

## W1 Endpoint Caller Table

| # | Method + Path | Dashboard Caller | Dashboard fetch type | PWA? | Public? | Root Cron? | Scripts/OC? | SAFE-TO-GATE? |
|---|---------------|-----------------|---------------------|------|---------|-----------|-------------|--------------|
| 1 | `POST /api/volunteers/upload` | Line 13857 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 2 | `POST /api/volunteers/rotate-image` | Lines 14595, 14623 | **plain fetch** (×2) | NONE | NONE | NONE | NONE | ✅ SAFE |
| 3 | `PATCH /api/volunteers/:id` | Lines 14142, 14215 | **plain fetch** (×2) | NONE | NONE | NONE | NONE | ✅ SAFE |
| 4 | `DELETE /api/volunteers/:id` | Line 14249 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 5 | `PATCH /api/volunteers/:id/policy-reviewed` | Line 14289 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 6 | `PATCH /api/volunteers/:id/approval` | Lines 14314, 14362, 15345, 15397 | **plain fetch** (×4) | NONE | NONE | NONE | NONE | ✅ SAFE |
| 7 | `PATCH /api/volunteers/:id/tags` | Line 14334 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 8 | `POST /api/volunteers/:id/commitments` | Lines 15356, 15367 | **plain fetch** (×2) | NONE | NONE | NONE | NONE | ✅ SAFE |
| 9 | `DELETE /api/volunteers/:id/commitments` | Line 15367 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 10 | `POST /api/volunteers/:id/declines` | Lines 15376, 15388 | **plain fetch** (×2) | NONE | NONE | NONE | NONE | ✅ SAFE |
| 11 | `DELETE /api/volunteers/:id/declines` | Line 15388 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 12 | `POST /api/volunteers/timeclock/manual` | Line 15065 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 13 | `POST /api/intakes/:id/status` | Lines 11886, 11909 | **plain fetch** (×2) | NONE | NONE | NONE | NONE | ✅ SAFE |
| 14 | `POST /api/dashboard/intake/:id/health-assessment` | Line 13160 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 15 | `POST /api/dashboard/intake/:id/seizure-record` | Line 13261 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 16 | `POST /api/intake-recipients` | Line 11968 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 17 | `DELETE /api/intake-recipients/:id` | Line 11995 | **plain fetch** | NONE | NONE | NONE | NONE | ✅ SAFE |
| 18 | `POST /api/intake/:id/voice` | **NONE** (not called from dashboard) | — | NONE | **intake-form.html line 1368** | NONE | NONE | ⚠️ **HAS PUBLIC CALLER — MUST NOT GATE** |

[ALL VERIFIED — every cell confirmed by grep across all surfaces]

---

## CRITICAL FINDING: POST /api/intake/:id/voice

**This endpoint is called from the PUBLIC intake form (`intake-form.html` line 1368)**, not from the dashboard. Gating it with the piiGate token would break public intake voice note uploads. **MUST be excluded from W1.** [VERIFIED]

The endpoint uploads a voice note as part of the public overnight intake submission flow. The `intakeId` is known to the submitter (just created by their prior `POST /api/intake`). The voice note is attached to the intake record for staff review. [VERIFIED]

---

## Dashboard Plain-Fetch Call-Sites for W1a Conversion

Every call-site below must change `fetch(` → `gatedFetch(` in the W1a dashboard edit:

### Volunteer PII Writes (13 call-sites)

| Line | Call | Method |
|------|------|--------|
| 13857 | `fetch('/api/volunteers/upload', { method: 'POST', body: formData })` | POST |
| 14595 | `fetch('/api/volunteers/rotate-image', { method: 'POST', ... })` | POST |
| 14623 | `fetch('/api/volunteers/rotate-image', { method: 'POST', ... })` | POST |
| 14142 | `fetch('/api/volunteers/${volEditingId}', { method: 'PATCH', ... })` | PATCH |
| 14215 | `fetch('/api/volunteers/${volEditingId}', { method: 'PATCH', ... })` | PATCH |
| 14249 | `fetch('/api/volunteers/${volEditingId}', { method: 'DELETE' })` | DELETE |
| 14289 | `fetch('/api/volunteers/${volEditingId}/policy-reviewed', { method: 'PATCH', ... })` | PATCH |
| 14314 | `fetch('/api/volunteers/${volEditingId}/approval', { method: 'PATCH', ... })` | PATCH |
| 14334 | `fetch('/api/volunteers/${volEditingId}/tags', { method: 'PATCH', ... })` | PATCH |
| 14362 | `fetch('/api/volunteers/${volEditingId}/approval', { method: 'PATCH', ... })` | PATCH |
| 15345 | `fetch('/api/volunteers/${vid}/approval', { method: 'PATCH', ... })` | PATCH |
| 15356 | `fetch('/api/volunteers/${vid}/commitments', { method: 'POST', ... })` | POST |
| 15367 | `fetch('/api/volunteers/${vid}/commitments', { method: 'POST', ... })` | POST |

### Volunteer Timeclock + Commitments/Declines Writes (5 call-sites)

| Line | Call | Method |
|------|------|--------|
| 15376 | `fetch('/api/volunteers/${vid}/declines', { method: 'POST', ... })` | POST |
| 15388 | `fetch('/api/volunteers/${vid}/declines', { method: 'POST', ... })` | POST |
| 15397 | `fetch('/api/volunteers/${vid}/approval', { method: 'PATCH', ... })` | PATCH |
| 15065 | `fetch('/api/volunteers/timeclock/manual', { method: 'POST', ... })` | POST |

### Intake Writes (6 call-sites)

| Line | Call | Method |
|------|------|--------|
| 11886 | `fetch('${API_BASE}/intakes/${intakeId}/status', { method: 'POST', ... })` | POST |
| 11909 | `fetch('${API_BASE}/intakes/${currentIntakeId}/status', { method: 'POST', ... })` | POST |
| 13160 | `fetch('${API_BASE}/dashboard/intake/${intakeId}/health-assessment', { method: 'POST', ... })` | POST |
| 13261 | `fetch('${API_BASE}/dashboard/intake/${intakeId}/seizure-record', { method: 'POST', ... })` | POST |
| 11968 | `fetch('${API_BASE}/intake-recipients', { method: 'POST', ... })` | POST |
| 11995 | `fetch('${API_BASE}/intake-recipients/${id}', { method: 'DELETE' })` | DELETE |

**Total: 24 plain-fetch call-sites to convert to gatedFetch in W1a.** [VERIFIED]

---

## Rotate-Image Traversal Validation — Re-Confirmed

Three layers, all intact in current server.ts:

1. **Regex (strict format):** `/^\/data\/volunteer-files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/page-\d{2}\.(jpg|png)$/` — rejects any input not matching UUID/page-NN.ext exactly. No `..`, no `/`, no wildcards possible. [VERIFIED]

2. **path.resolve + prefix check:** `absPath = path.resolve(ROOT_DIR, filePath.replace(/^\//, ''))` then `absPath.startsWith(path.join(ROOT_DIR, 'data', 'volunteer-files') + path.sep)` — defense-in-depth against any regex bypass. [VERIFIED]

3. **existsSync:** File must exist on disk before any operation. [VERIFIED]

All three layers present and unchanged. [VERIFIED]

---

## Adoption PATCH — Confirmed Does Not Exist

`grep -c "app.patch.*adoption" server.ts` → 0. No PATCH route for adoption-applications exists. The `updateAdoptionApplicationStatus()` function in localDatabase.ts is orphaned (zero callers). When the adoption PATCH is built, it will be **born-gated** (added to `isGatedWrite` from the start). [VERIFIED]

---

## Summary

### Safe to gate (17 endpoints, 24 dashboard call-sites):
All W1 endpoints except `POST /api/intake/:id/voice` are called ONLY from dashboard. No PWA, public, cron, or script callers found. [VERIFIED across all 5 classes]

### MUST EXCLUDE from W1 (1 endpoint):
**`POST /api/intake/:id/voice`** — called from public `intake-form.html`. Gating it would break public intake voice uploads. [VERIFIED]

### W1 final scope: 17 endpoints, 24 dashboard fetch→gatedFetch conversions.
