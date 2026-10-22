# Recipient Add Applied — 2026-10-22

## Edited Lines (src/emailService.ts)

**Line 30 — ADOPTION_TO_EMAILS (now 5 addresses):**
```
const ADOPTION_TO_EMAILS = ['a•••@4lg.org', 'g•••@aol.com', 'f•••@gmail.com', 'a•••@gmail.com', 'b•••@4lg.org'];
```

**Line 31 — VOLUNTEER_TO_EMAILS (now 4 addresses):**
```
const VOLUNTEER_TO_EMAILS = ['v•••@4lg.org', 'f•••@gmail.com', 'g•••@aol.com', 'b•••@4lg.org'];
```

## Build

- Command: `cd /home/shelter/shelter-apps/server && npm run build`
- Exit code: **0**

## Dist Verification

**`grep -c "businessdirector@4lg.org" dist/emailService.js` → 2** [VERIFIED via grep -c]

**`grep -n "ADOPTION_TO_EMAILS\|VOLUNTEER_TO_EMAILS" dist/emailService.js`:** [VERIFIED via grep -n]
```
24:const ADOPTION_TO_EMAILS = ['a•••@4lg.org', 'g•••@aol.com', 'f•••@gmail.com', 'a•••@gmail.com', 'b•••@4lg.org'];
25:const VOLUNTEER_TO_EMAILS = ['v•••@4lg.org', 'f•••@gmail.com', 'g•••@aol.com', 'b•••@4lg.org'];
140:            to: ADOPTION_TO_EMAILS,
785:            to: VOLUNTEER_TO_EMAILS,
```

- Adoption array: 5 addresses, existing 4 intact, new address appended at end.
- Volunteer array: 4 addresses, existing 3 intact, new address appended at end.
- `to:` send sites (lines 140, 785) untouched.

## Commit

- Hash: **2bdc180**
- Message: "Add businessdirector@4lg.org to adoption and volunteer application alert recipients"
- Scope: `src/emailService.ts` only (explicit git add, not -A)
- Push: no remote configured (expected)

## Restart

- `sudo systemctl restart shelter-app` — exit code **0**
- `systemctl is-active shelter-app` — **active**
