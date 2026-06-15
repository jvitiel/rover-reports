# Track C 2b-dry — Aged-out generic detection + classification dry-run

**Commit:** `157c818` — `server: add aged-out-generic detection + classification + dry-run endpoint (Track C 2b-dry, no writes)`
**Base:** `cb579f5`
**Scope:** `server/src/server.ts` only — no writes to animal_bios, no GPT calls

## What was added

### `findAgedOutGenerics()` — detection function
Iterates adoptable animals. Selects those where:
- Current bio exists with `lastSource === 'generic'` (youth-generic only, not `generic_adult`)
- `ageInDays(dateOfBirth) > GENERIC_BIO_MAX_AGE_DAYS` (84 days)

### `hasMeaningfulSMComment()` — sentinel-aware SM comment check
Same sentinel logic as `hasRealStaffContentForLabel` (rejects empty, 'Unknown', 'Not specified', 'N/A', 'None specified'), but checks SM comment only (no behavior notes — those are a separate bucket).

### `POST /api/dashboard/adult-generic/dry-run` — classification endpoint
Classifies each aged-out animal into exactly one bucket (first match wins):
1. **has_caregiver_profile** — `getBehaviorNotesCount > 0` (would be skipped by 2b-live)
2. **has_sm_comment** — meaningful SM comment present (2b-live would AI-seed → pending)
3. **no_content** — neither (2b-live would write adult factual generic → approved)

For `no_content`, renders the full `renderAdultGenericBios()` preview. For `has_sm_comment`, includes the raw SM comment. Performs NO writes and NO GPT calls.

## Dry-run output

```
Total aged-out generics: 2
has_caregiver_profile: 0
has_sm_comment: 0
no_content: 2
```

### no_content animals (with rendered adult-generic text):

**Orchid (S2026358)** — 85 days old, female DSH, Black, medium
- EN long: "Meet Orchid! Orchid is a female Domestic Short Hair, approximately 12 weeks old, with a Black coat and a medium build..."
- ES long: "¡Conoce a Orchid! Orchid es Domestic Short Hair (hembra), de aproximadamente 12 semanas, con pelaje negro y de tamaño mediano..."
- EN short: "Meet Orchid, a female Domestic Short Hair with a Black coat who is approximately 12 weeks old..."
- ES short: "¡Conoce a Orchid, Domestic Short Hair (hembra) con pelaje negro, de aproximadamente 12 semanas!..."

**Peony (S2026356)** — 85 days old, female DSH, Black and White, medium
- EN long: "Meet Peony! Peony is a female Domestic Short Hair, approximately 12 weeks old, with a Black and White coat and a medium build..."
- ES long: "¡Conoce a Peony! Peony es Domestic Short Hair (hembra), de aproximadamente 12 semanas, con pelaje negro y blanco y de tamaño mediano..."
- EN short: "Meet Peony, a female Domestic Short Hair with a Black and White coat who is approximately 12 weeks old..."
- ES short: "¡Conoce a Peony, Domestic Short Hair (hembra) con pelaje negro y blanco, de aproximadamente 12 semanas!..."

## Verification — no writes

| Table | Pre-deploy | Post-dry-run |
|-------|-----------|-------------|
| animal_bios | 113 | 113 |
| animal_bios_history | 173 | 173 |

Confirmed identical. No writes occurred.

Build: clean (tsc exit 0). Service: restarted, active.
