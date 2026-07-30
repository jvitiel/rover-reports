# Adoption Email Deploy Path — Read-Only Diagnosis

## 1. All consumers of ADOPTION_TO_EMAILS

```
$ grep -rn "ADOPTION_TO_EMAILS" /home/shelter/shelter-apps/server/src/
/home/shelter/shelter-apps/server/src/emailService.ts:30:const ADOPTION_TO_EMAILS = ['a•••@4lg.org', 'g•••@aol.com', 'f•••@gmail.com', 'i•••@4lg.org'];
/home/shelter/shelter-apps/server/src/emailService.ts:156:      to: ADOPTION_TO_EMAILS,
```

Two matches total. Line 30 is the definition; line 156 is the sole consumer (the `to:` field in `sendAdoptionNotificationEmail()`). No other file references this constant.

## 2. Build / deploy mechanism

From `/home/shelter/shelter-apps/server/package.json` lines 8–11:

```json
"build": "tsc",
"start": "node dist/server.js",
"dev": "tsx watch src/server.ts"
```

Production runs compiled JavaScript from `dist/`. The `build` script runs `tsc` to compile TypeScript into `dist/`, and `start` runs `node dist/server.js`. Dev mode uses `tsx` against source directly but is not the production path. [VERIFIED — package.json:8-11]

## 3. Systemd service unit

Unit name: `shelter-app`

```
$ systemctl cat shelter-app | grep -E "ExecStart|WorkingDirectory"
WorkingDirectory=/home/shelter/shelter-apps/server
ExecStart=/usr/bin/node dist/server.js
```

ExecStart confirms the running process executes compiled JS from `dist/server.js`, not TypeScript source. [VERIFIED — systemctl cat shelter-app output]

## Summary

- ADOPTION_TO_EMAILS has exactly 2 references in source, both in `emailService.ts` (definition line 30, usage line 156).
- Build is `tsc` → `dist/`; production runs `node dist/server.js`. Any source edit requires `npm run build` before the change takes effect at runtime.
- The systemd unit is `shelter-app`.
