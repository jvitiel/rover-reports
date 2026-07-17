# Generic Bio Job Time Move: 9:30 → 8:30 AM ET — 2026-07-17

## Changed Function (server.ts ~line 13322)

```typescript
function scheduleGenericBioJob(): void {
  const msUntilNext830AM = (): number => {
    const now = new Date();
    const etOffsetMs = 4 * 60 * 60 * 1000;
    const nowEt = new Date(now.getTime() - etOffsetMs);
    const next830amEt = new Date(nowEt);
    next830amEt.setHours(8, 30, 0, 0);
    if (next830amEt.getTime() <= nowEt.getTime()) {
      next830amEt.setDate(next830amEt.getDate() + 1);
    }
    return next830amEt.getTime() - nowEt.getTime();
  };

  const initialDelay = msUntilNext830AM();
  const hoursUntil = (initialDelay / 1000 / 60 / 60).toFixed(2);
  console.log(`[Generic Bio] Daily job scheduled in ${hoursUntil} hours (8:30am ET)`);

  setTimeout(() => {
    runGenericBioJob();
    setInterval(() => {
      runGenericBioJob();
    }, 24 * 60 * 60 * 1000);
  }, initialDelay);
}

scheduleGenericBioJob();
console.log('[Generic Bio] Daily 8:30am ET generic bio job initialized');
```

[VERIFIED — diff shows exactly 9 lines changed: variable/function renames 930→830, setHours(8,30,0,0), console.log strings updated. `etOffsetMs` untouched.]

## Verification

### 1. tsc clean + restart
[VERIFIED] `npx tsc --noEmit` exited code 0 (zero errors). `npm run build` exited code 0. `systemctl restart shelter-app` succeeded.

### 2. Startup log — 8:30am ET confirmed
[VERIFIED] From `journalctl -u shelter-app` at restart (14:45:51 UTC):

```
[Generic Bio] Daily job scheduled in 21.74 hours (8:30am ET)
[Generic Bio] Daily 8:30am ET generic bio job initialized
```

21.74 hours from 14:45 UTC = ~12:29 UTC tomorrow = 08:29 ET (rounds to 8:30 AM ET). ✓

### 3. Adoptable check timing comparison
[VERIFIED] From the same restart log:

```
[Adoptable Alert] First run scheduled in 22.24 hours
```

22.24 hours from 14:45 UTC = ~13:00 UTC tomorrow = 09:00 ET.

**Generic Bio fires at 08:30 ET → Adoptable Check fires at 09:00 ET → 30 minutes gap. ✓**

### 4. Other schedulers unchanged
[VERIFIED] Grep of all scheduler setHours calls:

| Line | setHours | Job | Changed? |
|------|----------|-----|----------|
| 12462 | (23, 55, 0, 0) | Activity Auto-Close | No |
| 12506 | (0, 0, 0, 0) | Feeding (midnight) | No |
| 12721 | (2, 0, 0, 0) | SM Photo Sync | No |
| 12883 | (9, 0, 0, 0) | Adoptable Alert | No |
| **13328** | **(8, 30, 0, 0)** | **Generic Bio** | **Yes — was (9, 30, 0, 0)** |
| 13357 | (0, 10, 0, 0) | Searcher Snapshot | No |
| 13466 | (16, 0, 0, 0) | Featured Email | No |

### 5. Sanity — next-fire timestamps

| Job | Next fire (UTC) | Next fire (ET) | Gap |
|-----|----------------|----------------|-----|
| Generic Bio | ~12:30 UTC Jul 18 | **08:30 ET** | — |
| Adoptable Check | ~13:00 UTC Jul 18 | **09:00 ET** | Bio finishes 30 min before |

Generic bios will be written before the adoptable email assembles its content. ✓

## Commit

```
commit 0067f6c
Move generic bio job 9:30 → 8:30 AM ET so generic bios exist before the 9:00 AM adoptable review email
 server/src/server.ts | 18 +++++++++----------
 1 file changed, 9 insertions(+), 9 deletions(-)
```

## What was NOT changed (per instruction)

- `etOffsetMs` hardcoded 4h EDT offset — left as-is (DST bug is a separate item)
- No other scheduler touched
- No functional change to what the job does
