# Subscribe Endpoint Followups

**Date:** 2026-05-28 16:29 ET  
**Type:** Implementation + diagnostic

---

## Thing 1: Language Label Fix

**File:** `server/src/emailService.ts`, line 1412  
**Commit:** `843b34f`

### Diff
```diff
-Submitted from: ${lang === 'es' ? 'es' : 'en'} version of the site
+Submitted from: ${lang === 'es' ? 'Spanish' : 'English'} version of the site
```

Single-line change. Build clean, service restarted. Curl verification skipped (rate-limited from earlier test burst — 3/hr window still active). Code review is the verification for this mechanical change.

---

## Thing 2: "jvititel" URL Typo

### Investigation
```
grep -rn "jvititel" /home/rover/rover/ /home/shelter/shelter-apps/ /home/shelter/scripts/
```
**Zero hits.** The typo is not in any file.

### Source of truth
```
$ cd /home/rover/rover-reports-repo && git remote -v
origin  https://github.com/jvitiel/rover-reports.git (fetch)
origin  https://github.com/jvitiel/rover-reports.git (push)
```

AGENTS.md line 49: `https://raw.githubusercontent.com/jvitiel/rover-reports/main/<filename>` — correct spelling.  
TOOLS.md line 110: same URL, correct spelling.

### Root cause
The typo is a generation-time error in the assistant's reply text. When composing the URL, the model transposes letters producing "jvititel" (8 chars) instead of "jvitiel" (7 chars). No file contains the wrong spelling — it's produced fresh each time the URL is written in the chat response.

### Correct pattern
`https://raw.githubusercontent.com/jvitiel/rover-reports/main/<filename>`

Username: **jvitiel** (j-v-i-t-i-e-l, 7 characters).
