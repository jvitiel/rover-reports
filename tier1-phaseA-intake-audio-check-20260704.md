# Tier-1 Phase A: Intake-Audio Route 2c — Structure Check

## STEP 1 Finding: On-Disk Layout Is Nested, Not Flat

The prompt assumed intake-audio files are stored flat. They are not — they are in per-id subdirectories:

```
/home/shelter/shelter-apps/intake-audio/
├── 14/voice_1774567593525.webm
├── 15/voice_1776433650857.webm
├── 16/voice_1776901907299.webm
├── 18/voice_1777478630579.webm
├── 19/voice_1777478815596.webm
├── 21/voice_1777817600148.webm
├── 24/voice_1777835325111.webm
├── 25/voice_1777836392349.webm
├── 30/voice_1777839948443.webm
├── 31/voice_1777840125486.webm
├── 32/voice_1777840259663.webm
└── 44/voice_1778693566569.webm
```
[VERIFIED — `ls -R /home/shelter/shelter-apps/intake-audio/`]

## DB Stored Path — Nested

```sql
SELECT id, voice_note_url FROM overnight_intakes WHERE voice_note_url IS NOT NULL;
-- 44|/intake-audio/44/voice_1778693566569.webm
```
[VERIFIED]

## Dashboard Consumer — Uses Nested Path

```js
// dashboard/index.html, symbol intakeVoiceAudio
audioEl.src = intake.voice_note_url;
// Sets src to /intake-audio/{id}/voice_{ts}.webm
```
[VERIFIED]

## Route 2c As Committed — Correct

```
GET /api/docs/intake-audio/:id/:file
→ path.resolve(baseDir, idParam, file)
→ /home/shelter/shelter-apps/intake-audio/44/voice_1778693566569.webm
```

This matches the on-disk nested layout. The route will resolve correctly. [VERIFIED]

## Conclusion

**No fix needed.** Per the prompt's STEP 1 instruction: "if STEP 1 shows the current link is actually nested (/intake-audio/{id}/...), STOP and report that instead." The original route 2c is correct as committed in `6195c91`. No code change made.
