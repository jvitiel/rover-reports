# Caddy /rg-portal Cleanup

## Before State

Two occurrences of `/rg-portal` in `/etc/caddy/Caddyfile`:

### Line 122 — `@standalone` matcher
```
@standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```
**Classification: (b) SHARED matcher.** `/rg-portal` is one token among 8 live paths. Action: remove only the `/rg-portal` token. [VERIFIED]

### Line 124 — `@dashboard` matcher
```
@dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```
**Classification: (b) SHARED matcher.** `/rg-portal` is one token in a `not path` exclusion list with 8 live paths. Action: remove only the `/rg-portal` token. [VERIFIED]

Neither occurrence is a standalone block — both are shared matchers where only the `/rg-portal` token was removed.

## Edit

### After (lines 122, 124):
```
@standalone path /intake /vclock /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
@dashboard not path /api/* /intake /vclock /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```

All other directives byte-identical (diff confirms exactly 2 lines changed, each removing only ` /rg-portal`). [VERIFIED]

## Validation

```
caddy validate --config /etc/caddy/Caddyfile
→ Valid configuration
```
[VERIFIED — validated BEFORE reload]

## Reload

```
systemctl reload caddy → exit 0
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force (code=exited, status=0/SUCCESS)
caddy.service: active (running)
```
[VERIFIED]

Backup saved to `/tmp/Caddyfile.bak-20260707-rg`.

## Post-Reload Verification

### Live paths — all UP

| Path | HTTP Status |
|------|-------------|
| dashboard.4lgshelterapp.duckdns.org/ | 200 ✅ |
| staff.4lgshelterapp.duckdns.org/ | 200 ✅ |
| matcher.4lgshelterapp.duckdns.org/ | 200 ✅ |
| /intake (standalone) | 200 ✅ |
| /api/animals (API) | 200 ✅ |

[VERIFIED]

### /rg-portal → 200 (dashboard SPA catch-all)

With `/rg-portal` removed from `@standalone`, the path now falls through to the `@dashboard` rewrite which serves `dashboard/index.html` (the SPA shell). This is correct — there's no RG portal content to display; the Express route was removed in Pass C (commit e35edca). The SPA router doesn't have an `#rg-portal` route, so it loads the default dashboard view. No security concern. [VERIFIED]

### Zero remaining /rg-portal references

```
grep -c 'rg-portal' /etc/caddy/Caddyfile → 0
```
[VERIFIED]

## Status

Applied and reloaded. The last cosmetic RG remnant is now gone. RG Cares removal is complete across all layers:

| Layer | Pass | Commit |
|-------|------|--------|
| Staff routes | A | 5de3702 |
| Dashboard UI | B-1 | b233bf0 |
| PIN code + modal | B-2 | e5645d5 |
| Portal routes + HTML | C | e35edca |
| Tables + schema-init + dead exports | D | 1aac222 |
| Caddy stale reference | E (this) | config-only, no git |
