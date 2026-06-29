# Clawdbot Legacy Install Verification — 2026-06-29

## 1. The Directory

```
/usr/lib/node_modules/clawdbot/    1.2 GB
package.json: name=clawdbot, version=2026.1.24-3
Last modified: 2026-02-04 04:09 UTC (~5 months stale)
```

Package.json is present — this is a standard npm global package, fully regenerable via `npm install -g clawdbot@2026.1.24-3` (though there's no reason to).

## 2. Service State

**Three systemd units exist, ALL stopped AND disabled:**

| Unit | Loaded | Active | Enabled |
|------|--------|--------|---------|
| clawdbot.service | yes | **inactive (dead)** | **disabled** |
| clawdbot-home.service | yes | **inactive (dead)** | **disabled** |
| clawdbot-media.service | yes | **inactive (dead)** | **disabled** |

The main unit's ExecStart points at `/usr/bin/clawdbot gateway`, which symlinks to `/usr/lib/node_modules/clawdbot/dist/entry.js`.

No clawdbot process is running.

## 3. Live OC — Completely Separate

The live running agent:
```
PID 105776 | user: rover | command: openclaw
Binary: /usr/bin/openclaw → /usr/lib/node_modules/openclaw/openclaw.mjs
Package: openclaw@2026.5.28
```

| Property | Live OC (openclaw) | Legacy (clawdbot) |
|----------|-------------------|-------------------|
| Binary | /usr/bin/openclaw | /usr/bin/clawdbot |
| Package dir | /usr/lib/node_modules/openclaw/ | /usr/lib/node_modules/clawdbot/ |
| Version | 2026.5.28 | 2026.1.24-3 |
| Running | ✅ active (PID 105776) | ❌ dead |

**The live OC does NOT run from, depend on, or reference the clawdbot directory.** They are completely independent npm global packages.

## 4. Symlinks

One symlink found pointing into the clawdbot package:
```
/usr/bin/clawdbot → ../lib/node_modules/clawdbot/dist/entry.js
```

This is the standard npm global bin symlink. It will be removed by `npm rm -g clawdbot`. No other symlinks found anywhere on the filesystem.

## 5. References

| Location | Type | Action needed? |
|----------|------|----------------|
| /etc/systemd/system/clawdbot.service | Unit file (disabled) | Remove after package removal |
| /etc/systemd/system/clawdbot-home.service | Unit file (disabled) | Remove after package removal |
| /etc/systemd/system/clawdbot-media.service | Unit file (disabled) | Remove after package removal |
| /home/shelter/scripts/backup-data.sh:5 | Comment: "Alerts on failure via clawdbot Telegram" | Benign — old comment, no invocation |
| /home/shelter/scripts/backup-weekly.sh:251 | Comment in restore docs | Benign — historical reference |
| /home/rover/.openclaw-rover/openclaw.json | No reference | ✅ Clean |
| Cron entries | No reference | ✅ Clean |

**No active invocation or dependency exists.** The only references are two benign comments in backup scripts and the three disabled systemd unit files.

## 6. Global npm

Both packages are globally installed:
```
├── clawdbot@2026.1.24-3
├── openclaw@2026.5.28
```

Removal should use `npm rm -g clawdbot` (not plain `rm -rf`) to cleanly remove:
- The package directory (`/usr/lib/node_modules/clawdbot/`)
- The bin symlink (`/usr/bin/clawdbot`)

The systemd unit files are NOT managed by npm — they must be removed separately.

## 7. Verdict

**✅ Safe to remove.** All conditions met:

| Check | Result |
|-------|--------|
| clawdbot service stopped + disabled | ✅ All 3 units inactive/disabled |
| Live OC runs from different path | ✅ /usr/lib/node_modules/openclaw/ (completely separate) |
| Nothing in cron/scripts invokes it | ✅ Only benign comments |
| Regenerable | ✅ Standard npm package with package.json |

### Recommended removal commands (do NOT execute — for John):

```bash
# 1. Remove the npm package (cleans dir + bin symlink)
sudo npm rm -g clawdbot

# 2. Remove the orphaned systemd units
sudo rm /etc/systemd/system/clawdbot.service
sudo rm /etc/systemd/system/clawdbot-home.service
sudo rm /etc/systemd/system/clawdbot-media.service
sudo systemctl daemon-reload

# Reclaims: ~1.2 GB
```

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 14:30 UTC.*
