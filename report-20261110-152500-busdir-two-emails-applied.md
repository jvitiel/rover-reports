# Business-Director Recipient — Implementation Applied

**Date:** 2026-11-10

---

## Edits

### FEATURED_TO_EMAILS — emailService.ts:32

```
export const FEATURED_TO_EMAILS = ['M•••@gmail.com', 'f•••@gmail.com', 'b•••@4lg.org'];
```

Appended `b•••@4lg.org` as 3rd element. Existing 2 entries unchanged.

### ADOPTABLE_ALERT_RECIPIENTS — server.ts:677

```
const ADOPTABLE_ALERT_RECIPIENTS = ['f•••@gmail.com', 'M•••@gmail.com', 'b•••@4lg.org'];
```

Appended `b•••@4lg.org` as 3rd element. Existing 2 entries unchanged.

---

## Build

**Command:** `cd /home/shelter/shelter-apps/server && npm run build`
**Exit code:** 0

---

## Dist Verification

**Command:** `grep -rn "busdir@4lg.org" dist/`

| File | Line | Array |
|------|------|-------|
| dist/emailService.js | 26 | FEATURED_TO_EMAILS — 3 addresses |
| dist/server.js | 444 | ADOPTABLE_ALERT_RECIPIENTS — 3 addresses |

**Match count:** 2 [VERIFIED — `grep -rn "busdir@4lg.org" dist/`]

**FEATURED_TO_EMAILS (dist/emailService.js:26):** 3 addresses — M•••@gmail.com, f•••@gmail.com, b•••@4lg.org [VERIFIED — `grep -n "FEATURED_TO_EMAILS" dist/emailService.js`]

**ADOPTABLE_ALERT_RECIPIENTS (dist/server.js:444):** 3 addresses — f•••@gmail.com, M•••@gmail.com, b•••@4lg.org [VERIFIED — `grep -n "ADOPTABLE_ALERT_RECIPIENTS" dist/server.js`]

Both compiled arrays contain all 3 addresses with existing entries intact and in original order.

---

## Commit

**Hash:** `0e5d39f`
**Message:** "Add busdir@4lg.org to weekly-featured-email and adoptable-alert recipients"
**Files:** `src/emailService.ts`, `src/server.ts` (explicit add, not git add -A)
**Push:** No remote configured — push skipped (expected).

---

## Restart

**Status:** NOT RESTARTED — elevated permissions unavailable from webchat session. Edit, build, and commit are landed. John can restart:

```
sudo systemctl restart shelter-app && sudo systemctl is-active shelter-app
```

---

*ADOPTION_TO_EMAILS (emailService.ts:30) and VOLUNTEER_TO_EMAILS (emailService.ts:31) were not touched.*
