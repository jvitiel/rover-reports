# Tier-1 Phase B Fix: Intake-Audio Clean Failure

## Change

All three fallback branches in the intake-audio conversion block now fail clean instead of loading the ungated URL:

| Branch | Before | After |
|--------|--------|-------|
| `gatedBlobUrl` returns null | `audioEl.src = intake.voice_note_url` | `console.warn('[Intake] gated audio load failed'); audioEl.style.display = 'none'` |
| `.catch()` | `audioEl.src = intake.voice_note_url` | `console.warn('[Intake] gated audio load failed'); audioEl.style.display = 'none'` |
| URL pattern mismatch | `audioEl.src = intake.voice_note_url` | `console.warn('[Intake] unexpected voice_note_url format:', ...); audioEl.style.display = 'none'` |

Success path and revoke-previous-blob logic unchanged. [VERIFIED]

## Revised Block

```js
if (audioMatch) {
  gatedBlobUrl('/api/docs/intake-audio/' + audioMatch[1] + '/' + audioMatch[2]).then(b => {
    if (b) { audioEl.src = b; audioEl.dataset.blobUrl = b; }
    else { console.warn('[Intake] gated audio load failed'); audioEl.style.display = 'none'; }
  }).catch(() => { console.warn('[Intake] gated audio load failed'); audioEl.style.display = 'none'; });
} else {
  console.warn('[Intake] unexpected voice_note_url format:', intake.voice_note_url);
  audioEl.style.display = 'none';
}
audioEl.style.display = 'block';
```

## Confirmation

- No other code changed (PDF/volunteer conversions, helpers, mounts, Caddy, routes all untouched) [VERIFIED]
- git diff --stat: `dashboard/index.html | 7 ++++---` — 1 file, 4 insertions, 3 deletions [VERIFIED]
- Commit `833678e`: only `dashboard/index.html` [VERIFIED]
