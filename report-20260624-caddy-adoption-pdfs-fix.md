# Caddy Adoption PDFs Fix

**Date:** 2026-06-24  
**Backup:** `/home/rover/rover/caddy-backup-20260624-1330.txt`

---

## Before / After

### @standalone (Caddyfile:137)

**Before:**
```caddyfile
@standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/*
```

**After:**
```caddyfile
@standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```

### @dashboard (Caddyfile:146)

**Before:**
```caddyfile
@dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/*
```

**After:**
```caddyfile
@dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```

**Change:** `/adoption-pdfs/*` appended to both matchers, matching the existing `/data/*` pattern. Only the `dashboard.4lgshelterapp.duckdns.org` block modified — no other site blocks touched.

---

## Validate

```
$ sudo caddy validate --config /etc/caddy/Caddyfile
Valid configuration
```

## Reload

```
$ sudo systemctl reload caddy
ExecReload: status=0/SUCCESS
Active: active (running)
```

---

## Verification

### PDF now serves application/pdf ✅

```
$ curl -sI https://dashboard.4lgshelterapp.duckdns.org/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf
HTTP/2 200
content-type: application/pdf
```

Previously returned `text/html` (dashboard SPA). Now returns `application/pdf` — the actual PDF file.

### Dashboard still loads ✅

```
$ curl -sI https://dashboard.4lgshelterapp.duckdns.org/
HTTP/2 200
content-type: text/html; charset=UTF-8
```

SPA rewrite still works for dashboard paths.

### API still works ✅

```
$ curl https://dashboard.4lgshelterapp.duckdns.org/api/adoption-applications
9 rows, success=True
```

### Caddy active ✅

```
● caddy.service - Caddy
  Active: active (running)
  ExecReload: status=0/SUCCESS
```

---

## Diff Applied

```diff
137c137
< @standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/*
---
> @standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
146c146
< @dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/*
---
> @dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```

No git commit (system file, not in repo).
