# Secrets Permission Check — 2026-06-29

## Key Finding

**The file is ALREADY mode 600. No fix needed.**

The premise that shelter-secrets.json is mode 644 is stale. It was tightened to 600 on 2026-05-14/15 (per memory/2026-05-15.md and memory/2026-05-14.md). The AGENTS.md "[VERIFIED]" annotation referencing 644 is outdated and should be updated.

---

## 1. The File

```
-rw------- 1 shelter shelter 1525 May 27 18:55 /home/shelter/.config/shelter-secrets.json
```

| Property | Value |
|----------|-------|
| Path | /home/shelter/.config/shelter-secrets.json |
| Mode | **600** (owner read/write only) |
| Owner | shelter |
| Group | shelter |
| Size | 1525 bytes |
| Last modified | 2026-05-27 18:55 UTC |

**Mode is 600, not 644.** The health-check script's latest report confirms: `shelter-secrets.json mode | 600 | 600` — no flag fired.

## 2. What User shelter-app Runs As

From `systemctl cat shelter-app`:
```
User=shelter
ExecStart=/usr/bin/node dist/server.js
```

Process confirmed running as `shelter` (PID 113835).

## 3. Ownership Match

| Property | Value |
|----------|-------|
| File owner | shelter |
| shelter-app runs as | shelter |
| **Result** | **MATCH** ✅ |

The app reads the file as its owner. Mode 600 is correct and sufficient. No chown needed.

## 4. Who Else Reads It

| Consumer | How | Runs as | Can read at 600? |
|----------|-----|---------|-------------------|
| shelter-app (server.ts L369) | `fs.readFileSync(SECRETS_PATH)` | shelter | ✅ Yes (owner) |
| get-secret.sh | `jq -r ... shelter-secrets.json` | shelter (mode 750, owner shelter) | ✅ Yes (owner) |
| send-alert.sh | Calls get-secret.sh | shelter (via `sudo -u shelter`) | ✅ Yes (via get-secret.sh) |
| backup-weekly.sh | `cp shelter-secrets.json "$STAGE/secrets/"` | root (via cron) | ✅ Yes (root can read anything) |
| rover/OC process | No direct reference found in openclaw.json | rover | ❌ Cannot read — but doesn't need to |

**Conclusion:** Only shelter-owned processes and root (backups) read the file. Mode 600 is correct. Group-read (640) is NOT needed — rover has no legitimate need to read secrets.

**Historical note:** On 2026-04-26, there was a request to chmod 640 so rover could read the OpenAI key (memory/2026-04-26-cat-selection.md). This was superseded by the May 14 hardening back to 600. Rover's OC config uses its own API keys.

## 5. Regression Mechanism Search

**No active regression mechanism found.** Specifically checked:

| Potential source | Finding |
|------------------|---------|
| backup-weekly.sh restore instructions | ✅ Safe — Step 8 includes `chmod 600 /home/shelter/.config/*.json` |
| backup-weekly.sh backup step | ✅ Safe — just `cp`, no chmod |
| Deploy/build scripts | None found that touch secrets |
| Cron jobs | None modify secrets permissions |
| Previous chmod 644 | The original 644 was simply the default from file creation. The May 14 hardening (chmod 600) has held since then. |

The restore procedure in backup-weekly.sh correctly re-applies 600 after restore. No script sets 644 on this file.

## 6. AGENTS.md Stale Annotation

AGENTS.md contains:
```
shelter-secrets.json is mode 644 [VERIFIED via ls -la, output below], owned by shelter:shelter [VERIFIED]
```

This annotation is **stale** — it was accurate before the May 14 hardening. The `[VERIFIED]` tag is misleading since it reflects a prior verification, not current state. Recommendation: update the annotation to `mode 600` on next AGENTS.md edit.

---

## Summary

| Question | Answer |
|----------|--------|
| Current mode | 600 ✅ (already correct) |
| Owner match | shelter:shelter matches shelter-app User=shelter ✅ |
| Fix needed | **None** — file is already properly secured |
| Who reads it | shelter-app, get-secret.sh, backup (root) — all work at 600 |
| Regression risk | None found — restore script preserves 600 |
| Action item | Update stale AGENTS.md annotation from 644 to 600 |

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 14:01 UTC.*
