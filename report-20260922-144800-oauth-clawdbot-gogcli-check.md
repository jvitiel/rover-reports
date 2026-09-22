# OAuth Client "Clawdbot gogcli" Usage Check

Target: Google Cloud project "clawdbot-integration" (project number `•••4246`), Desktop-type OAuth client.

## 1. Client ID / Project References

**Text search across /home, /etc, /opt, /usr/local** (filtered to config/source file types, excluding node_modules):

| File | Line | Reference | Type |
|------|------|-----------|------|
| memory/2026-02-15.md | 121 | `clawdbot-integration-486815` | Historical log — OAuth "Testing" mode issue |
| memory/2026-02-08.md | 108–135 | `gogcli`, `clawdbot-integration-486815` | Historical log — initial gogcli setup notes |
| OC session JSONL (7e1a65e8…) | n/a | `•••4246` (10 occurrences) | Conversation transcript, not config |

**All hits are memory logs and conversation transcripts** — records of past discussions, not active configuration. No config file, env file, service file, or application source references the project number or project name.

[VERIFIED via `grep -rn -i --include='*.json' --include='*.ts' --include='*.js' --include='*.sh' --include='*.env' --include='*.cfg' --include='*.conf' --include='*.yml' --include='*.yaml' --include='*.toml' --include='*.md' --include='*.txt' -e "477345504246" -e "clawdbot-integration" -e "gogcli" /home/shelter /home/rover /etc` and `/opt /usr/local`]

Note: Project name in memory logs is `clawdbot-integration-486815` (with numeric suffix). The project number `•••4246` appears only in conversation transcripts.

## 2. Credential Files

**Google OAuth credential/token files found:**

| Path | Owner | Notes |
|------|-------|-------|
| /home/shelter/.config/google-sheets-credentials.json | shelter:shelter | **Different project** — `shelter-apps-488916`, client ID ending `•••2975`. NOT the Clawdbot gogcli client. |

**No credential files found for the Clawdbot gogcli client.** No `client_secret*.json`, `credentials.json`, `token.json`, or `*.token` files reference the target project.

`gog` CLI is installed at `/usr/local/bin/gog` (v0.9.0) but has **no stored OAuth tokens or config** under `/home/rover/.openclaw-rover/` — no `integrations/`, `google/`, or `gog.json` directories/files exist. The OC config (`openclaw.json`) contains no Google/OAuth references.

`/root` was unreadable as the rover user (permission denied). Cannot confirm or deny credential files under `/root/`.

## 3. Runtime Use

**Running services:** No services matching google/gog/drive/gmail found in `systemctl list-units --type=service --state=running`.

**Cron jobs (rover user):** No google/gog/gogcli references in rover's crontab.

**Root crontab:** Unreadable (sudo requires password). Cannot confirm or deny.

## Conclusion

**No active usage of the "Clawdbot gogcli" OAuth client found on this box.** [VERIFIED via grep across /home, /etc, /opt, /usr/local; credential file search; systemd and cron inspection]

- The `gog` CLI binary exists but has no stored credentials or active configuration.
- The only Google credential file (`google-sheets-credentials.json`) belongs to a different project (`shelter-apps-488916`).
- All references to the project name/number are in historical memory logs and conversation transcripts only.
- Caveat: `/root` and root's crontab were unreadable. If clawdbot's old config was archived there, it could not be inspected.

Deleting this OAuth client in the Google console should not break anything on this VPS.
