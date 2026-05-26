# GitHub Rover Reports Setup

Generated: 2026-05-26 17:25 ET

## Summary

Cloned private repo `jvitiel/rover-reports` to `/home/rover/rover-reports-repo`. Configured credential helper that reads PAT from shelter-secrets.json at push time. PAT is NOT stored in `.git/config` or any committed file. Round-trip test passed.

---

## Clone & Credential Pattern

**Pattern chosen:** Custom git credential helper that calls `get-secret.sh` at push time.

### Steps taken:

1. Cloned with PAT in URL (one-time), then immediately rewrote remote:
   ```
   git remote set-url origin "https://github.com/jvitiel/rover-reports.git"
   ```
   PAT confirmed NOT in `.git/config` (0 matches). [VERIFIED]

2. Created `.git/git-credential-shelter.sh` — a credential helper that reads the PAT from shelter-secrets.json via `get-secret.sh` on every auth request. The script lives inside `.git/` (not in the working tree) so it cannot be committed.

3. Configured git to use the helper:
   ```
   git config credential.helper "/home/rover/rover-reports-repo/.git/git-credential-shelter.sh"
   ```

4. Git identity:
   ```
   git config user.name "OpenClaw"
   git config user.email "openclaw@4lgshelterapp.duckdns.org"
   ```

### Why this pattern:
- PAT never appears in any committed file or `.git/config` remote URL
- PAT is read fresh from shelter-secrets.json on each push
- Credential helper lives in `.git/` directory (excluded from working tree)
- No manual env var wrangling needed per push

---

## Clone Verification

```
$ ls -la /home/rover/rover-reports-repo/
total 16
drwxr-xr-x  3 rover rover 4096 .
-rw-r--r--  1 rover rover   62 README.md

$ git log --oneline
240303c Initial commit
```
[VERIFIED]

---

## Round-Trip Test

### Test file: `test-roundtrip-1779830664.md`
### Commit: `ce91402`

### Push output:
```
To https://github.com/jvitiel/rover-reports.git
   240303c..ce91402  main -> main
```
[VERIFIED]

### Raw URL fetch (with auth, since repo is private):
```
HTTP/2 200
content-type: text/plain; charset=utf-8
```
[VERIFIED]

### Note on private repo URLs:
The repo is private. `raw.githubusercontent.com` URLs return 404 without auth. Two working URL patterns:
- **For chat replies (human-clickable):** `https://github.com/jvitiel/rover-reports/blob/main/<filename>` — works for John when logged into GitHub
- **For programmatic access:** requires `Authorization: token <PAT>` header

---

## AGENTS.md Update

Report-writing convention updated:

```diff
-1. Write the full report to `/home/shelter/rover-reports/report-YYYYMMDD-HHMMSS-slug.md`
-   (timestamp ET, slug = 2-4 word descriptor). `sudo chown shelter:shelter` the file.
-2. First line of your chat reply:
-   `Full report: https://rover-reports.4lgshelterapp.duckdns.org/<filename>`
-3. Then inline summary.
+1. Write the full report to `/home/rover/rover-reports-repo/report-YYYYMMDD-HHMMSS-slug.md`
+   (timestamp ET, slug = 2-4 word descriptor).
+2. Commit and push: `cd /home/rover/rover-reports-repo && git add <filename>
+   && git commit -m "Report: <brief>" && git push origin main`
+3. First line of your chat reply:
+   `Full report: https://github.com/jvitiel/rover-reports/blob/main/<filename>`
+4. Then inline summary.
+
+Note: The repo is private. URLs require GitHub authentication.
+Legacy path `/home/shelter/rover-reports/` and its Caddy block remain active
+but are no longer the primary write target.
```

---

## Legacy Path

`/home/shelter/rover-reports/` and its Caddy block at `rover-reports.4lgshelterapp.duckdns.org` remain untouched. No deletions, no symlinks. Retirement is a separate later step.

---

## File Inventory

| Path | Purpose | PAT exposure |
|------|---------|-------------|
| `/home/rover/rover-reports-repo/` | Working tree | None |
| `.git/config` | Git config | PAT NOT present [VERIFIED] |
| `.git/git-credential-shelter.sh` | Credential helper | Reads PAT at runtime only |
| `/home/shelter/.config/shelter-secrets.json` | PAT storage | Mode 600, shelter:shelter |
