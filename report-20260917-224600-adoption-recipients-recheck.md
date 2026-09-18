# Adoption-Application Alert Recipient Path — Re-verification

Date: 2026-09-17 22:46 ET (2026-09-18 02:46 UTC)

## 1. CONSTANT + CONTENTS

**File:** `server/src/emailService.ts:30`
**Current contents** [VERIFIED — emailService.ts:30]:

```
const ADOPTION_TO_EMAILS = ['[addr1]', '[addr2]', '[addr3]'];
```

- 3 addresses total
- Address 1: [4lg.org domain — org inbox]
- Address 2: [aol.com domain]
- Address 3: [gmail.com domain]

Location unchanged — still `emailService.ts`, still line 30.

## 2. SEND PATH INTACT

The adoption-application-submission email (PDF-attached path) uses `ADOPTION_TO_EMAILS` as its `to:` recipient at `emailService.ts:156`:

```
to: ADOPTION_TO_EMAILS,
```

This is inside the Resend `emails.send()` call that attaches the PDF. No refactoring detected — no env var indirection, no rename, no split. Same pattern as last verified.

## 3. ALL CONSUMERS

```
emailService.ts:30  — definition (const declaration)
emailService.ts:156 — usage (to: ADOPTION_TO_EMAILS in send call)
```

Total matches: 2 (1 definition + 1 usage). Blast radius: single file, single send path.

## 4. DUPLICATE CHECK

`abyg••••@gmail.com` — **NOT present** in the array. grep returned zero matches across all server source. Safe to add without duplication.

## 5. DEPLOY PATH

- **Build:** `tsc` (package.json `scripts.build`) → outputs to `dist/`
- **Start:** `node dist/server.js` (package.json `scripts.start`)
- **systemd unit:** `ExecStart=/usr/bin/node dist/server.js`, `WorkingDirectory=/home/shelter/shelter-apps/server`, `User=shelter`

Deploy path unchanged from prior verification.
