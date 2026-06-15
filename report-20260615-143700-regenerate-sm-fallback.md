# Regenerate endpoint — SM comment fallback

**Commit:** `41245c3` — `server: regenerate endpoint falls back to SM comment seed when no caregiver profile`
**Base:** `be26f73`
**Scope:** `server/src/server.ts` only — regenerate endpoint at `POST /api/bio/:bioId/regenerate/:size`

## Change

Replaced the profile-only seed check with the same two-tier logic the generate endpoint uses:
1. Profile (preferred): `getBehaviorNotes()` → full transcript + merged attributes
2. SM comment fallback: `hasStaffSMComment()` → `animal.description` as transcript, `'{}'` as attributes
3. Neither → 400 "No caregiver data available" (unchanged)

## Verification — Blizzard (S20251236)

### Before (pre-deploy)
| Field | Value |
|-------|-------|
| bio_en_long | "Not meant to be a household pet, but would be a great barn cat." |
| bio_en_short | "" (empty) |
| bio_es_long | "" (empty) |
| bio_es_short | "" (empty) |
| status_long | approved |
| status_short | draft |
| approved_at_long | 2026-06-15T13:19:22.270Z |
| last_source | manual_edit_long |

### After (regenerate/short called)
| Field | Value |
|-------|-------|
| bio_en_long | "Not meant to be a household pet, but would be a great barn cat." ← **UNCHANGED** |
| bio_en_short | "Meet Blizzard, the cool cat with a heart full of adventure! This tabby grey and white Domestic Short Hair prefers the barn life..." |
| bio_es_long | "" (empty — not touched by short regenerate) |
| bio_es_short | "¡Conoce a Blizzard, el gato aventurero con un corazón lleno de emoción!..." |
| status_long | approved ← **UNCHANGED** |
| status_short | draft |
| approved_at_long | 2026-06-15T13:19:22.270Z ← **UNCHANGED** |
| last_source | regenerate_short |

### Checks
1. ✅ No "No caregiver data available" error — used SM comment fallback
2. ✅ bioEnShort + bioEsShort populated, statusShort = draft
3. ✅ bioEnLong unchanged, statusLong = approved, approvedAtLong intact
4. ✅ Animal with neither profile nor SM comment (Orchid/S2026358) still returns 400

Build: clean (tsc exit 0). Service: restarted, active.
