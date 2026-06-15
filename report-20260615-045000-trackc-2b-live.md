# Track C 2b-live — Adult generic writes + daily job wiring

**Commit:** `e586a89` — `server: Track C 2b-live — write adult generics + AI-seed aged-out animals, wire into daily job`
**Base:** `157c818`
**Scope:** `server/src/server.ts` only

## Part A — Write path + on-demand run

### New functions

**`classifyAgedOut(animal)`** — classifies each aged-out animal into one of three buckets:
1. `has_caregiver_profile` — behavior notes present → **skip** (staff path owns it)
2. `has_sm_comment` — meaningful SM comment (sentinel-aware) → AI-seed as draft
3. `no_content` — neither → deterministic adult generic, approved immediately

**`upgradeAgedOutGeneric(animal, bucket)`** — performs the write for one animal:
- `no_content`: calls `renderAdultGenericBios()`, saves with `source: 'generic_adult'`, status approved
- `has_sm_comment`: calls `generateAnimalBio()` (GPT), saves with `source: 'sm_generate'`, status **draft** (never auto-approved)
- `has_caregiver_profile`: returns `{ action: 'skipped' }`, writes nothing

**`runAdultGenericUpgrades()`** — orchestrator: calls `findAgedOutGenerics()`, classifies, upgrades each

**`POST /api/dashboard/adult-generic/run`** — on-demand trigger endpoint

### Part A verification — Orchid & Peony

First run result:
```json
{
  "upgraded": 2, "skipped": 0,
  "results": [
    { "shelterCode": "S2026358", "name": "Orchid", "bucket": "no_content", "action": "adult_generic" },
    { "shelterCode": "S2026356", "name": "Peony", "bucket": "no_content", "action": "adult_generic" }
  ]
}
```

DB verification after first run:
| Field | Orchid (S2026358) | Peony (S2026356) |
|-------|-------------------|------------------|
| last_source | generic_adult | generic_adult |
| status_long | approved | approved |
| status_short | approved | approved |
| computeBioState | needed | needed |

Bio text (Orchid EN long): "Meet Orchid! Orchid is a female Domestic Short Hair, approximately 12 weeks old, with a Black coat and a medium build..."
Bio text (Peony ES long): "¡Conoce a Peony! Peony es Domestic Short Hair (hembra), de aproximadamente 12 semanas, con pelaje negro y blanco y de tamaño mediano..."

Matches dry-run preview exactly.

Row counts:
| Table | Pre-run | Post-run |
|-------|---------|----------|
| animal_bios | 113 | 113 (delete-then-insert, no duplication) |
| animal_bios_history | 173 | 175 (+2 new entries) |

### Idempotency check — second run

```json
{ "upgraded": 0, "skipped": 0, "results": [] }
```
`findAgedOutGenerics` selects `lastSource === 'generic'` only; Orchid/Peony are now `generic_adult`, so they're excluded. No additional writes (bios: 113, history: 175 unchanged).

## Part B — Daily job wiring

### runGenericBioJob diff

```diff
-async function runGenericBioJob(): Promise<{ published: number; animals: string[] }> {
+async function runGenericBioJob(): Promise<{ published: number; animals: string[]; adultUpgrades: number }> {
   console.log('[Generic Bio] Daily job running');
+
+  // Pass 1: youth generics (existing behavior)
   const candidates = await findGenericBioCandidates();
-  if (candidates.length === 0) {
-    console.log('[Generic Bio] No new qualifying animals found');
-    return { published: 0, animals: [] };
-  }
   ...existing youth-generic loop unchanged...
-  console.log(`[Generic Bio] Published ${names.length} generic bios: ${names.join(', ')}`);
-  return { published: names.length, animals: names };
+  if (names.length > 0) {
+    console.log(`[Generic Bio] Published ${names.length} youth generic bios: ${names.join(', ')}`);
+  }
+
+  // Pass 2: age-crossing upgrades (aged-out youth generics → adult generic or AI-seed)
+  const upgradeResult = await runAdultGenericUpgrades();
+
+  if (names.length === 0 && upgradeResult.upgraded === 0) {
+    console.log('[Generic Bio] No new youth candidates or aged-out upgrades');
+  }
+
+  return { published: names.length, animals: names, adultUpgrades: upgradeResult.upgraded };
 }
```

The daily 9:30am ET job now runs both passes sequentially. Pass 1 creates youth generics (unchanged). Pass 2 upgrades any that aged out since last run. The early-exit for zero candidates was removed so both passes always run.

Build: clean (tsc exit 0). Service: restarted, active. Dry-run endpoint preserved.
