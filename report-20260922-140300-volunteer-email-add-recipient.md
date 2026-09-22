# Volunteer Email — Add Recipient Implementation

## 1. Edit (emailService.ts:31)

```
const VOLUNTEER_TO_EMAILS = ['v•••@4lg.org', 'f•••@gmail.com', 'g•••@aol.com'];
```

Line 30 (`ADOPTION_TO_EMAILS`) unchanged. Line 32 (`FEATURED_TO_EMAILS`) unchanged.

## 2. Build

```
cd /home/shelter/shelter-apps/server && npm run build
```

Exit code: **0** (success)

## 3. Compiled Output Verification

`grep -n "VOLUNTEER_TO_EMAILS" dist/emailService.js`:
```
25:const VOLUNTEER_TO_EMAILS = ['v•••@4lg.org', 'f•••@gmail.com', 'g•••@aol.com'];
785:            to: VOLUNTEER_TO_EMAILS,
```
[VERIFIED via `grep -n "VOLUNTEER_TO_EMAILS" /home/shelter/shelter-apps/server/dist/emailService.js`]

`grep -c "g•••@aol.com" dist/emailService.js`: **2** (adoption array + volunteer array)
[VERIFIED via `grep -c "g•••@aol.com" /home/shelter/shelter-apps/server/dist/emailService.js`]

Volunteer array now holds 3 addresses. Existing two (`v•••@4lg.org`, `f•••@gmail.com`) byte-for-byte intact in original order.

## 4. Commit

```
git add src/emailService.ts
git commit -m "Add g•••  to volunteer application alert recipients"
```

Commit hash: **2d255bf**. No remote configured (expected — local commit stands).

## 5. Restart

`sudo systemctl restart shelter-app` → **permission failure** (sudo requires password/terminal). Edit, build, and commit are landed. Manual restart required.
