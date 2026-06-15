# Sonnet 4 retirement fix — volunteer OCR model bump

**Date:** 2026-06-15 23:20 UTC  
**Commit:** `86c7de5`  
**Scope:** One-line model string change in server.ts:8092.

---

## Change

```
server/src/server.ts:8092
- model: 'claude-sonnet-4-20250514',
+ model: 'claude-sonnet-4-6',
```

[VERIFIED — `sed -n '8092p'` confirms new value]

## Retired string fully eliminated

```
$ grep -rn 'claude-sonnet-4-20250514' . --include='*.ts' --include='*.js' | grep -v node_modules | grep -v dist/
(no matches)
```

[VERIFIED — zero occurrences of the retired model string anywhere in the codebase]

## All Anthropic model pins now consistent

```
server/src/server.ts:4612:      model: 'claude-sonnet-4-6',    # Matcher
server/src/server.ts:5135:        model: 'claude-sonnet-4-6',  # Followup eval
server/src/server.ts:8092:      model: 'claude-sonnet-4-6',    # Volunteer OCR (FIXED)
```

[VERIFIED — all three pins are `claude-sonnet-4-6`]

## Infrastructure

- **Build:** tsc exit 0, clean [VERIFIED]
- **Service:** active (running) since 23:19:50 UTC [VERIFIED]
- **Commit:** `86c7de5` — `fix: bump retired claude-sonnet-4-20250514 to claude-sonnet-4-6 in volunteer OCR (Sonnet 4 retired by Anthropic, restores POST /api/volunteers/upload)` [VERIFIED]
- **git diff --stat:** only `server/src/server.ts` — 1 insertion, 1 deletion [VERIFIED]

## No deviations
