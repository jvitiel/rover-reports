# Sniff Fail-Direction Check — Residual C

## 1. Shared vs Copy-Paste

**Two separate copies.** The sniff logic is inlined in each handler, not a shared helper function.

| Endpoint | Location | Allow-list const | Temp prefix |
|----------|----------|-----------------|-------------|
| `POST /api/volunteers/upload` (create) | server.ts:9657–9679 | `SNIFF_ALLOWED` | `vol-sniff-` |
| `POST /api/volunteers/:id/upload-scan` (new) | server.ts:10703–10725 | `ALLOWED_SNIFFED` | `scan-sniff-` |

The two copies are structurally identical but can drift (different const names, different temp prefixes, separate maintenance). [VERIFIED]

## 2. Fail-Direction — Per-Branch Analysis

Both copies use the same structure:

```ts
let sniffed: string;
try {
  sniffed = execSync(`file --mime-type -b "${tmpPath}"`, { timeout: 5000 }).toString().trim();
} finally {
  try { unlinkSync(tmpPath); } catch (_) { /* best effort */ }
}
if (!SNIFF_ALLOWED[sniffed]) {  // or ALLOWED_SNIFFED[sniffed]
  res.status(400).json({ ... });
  return;
}
```

### Branch: `execSync` throws (non-zero exit, timeout, command not found)

`execSync` throws on non-zero exit code or timeout. The `try` block has NO `catch` — only a `finally` (which just cleans up the temp file). The thrown exception **propagates up** to the outer `try/catch` of the handler:

- Create path: `catch (error: any) { res.status(500).json({ error: 'Upload processing failed' }); }` (server.ts:9840–9842)
- New endpoint: `catch (error: any) { res.status(500).json({ error: error.message || 'Upload processing failed' }); }` (server.ts:10829–10830)

**Result: FAIL-CLOSED.** The exception aborts the handler before any disk write or storage. The file is rejected with a 500. [VERIFIED]

### Branch: `execSync` returns empty string

`sniffed` would be `""` (empty string after `.trim()`). Then `SNIFF_ALLOWED[""]` → `undefined` (not in the allow-list) → the `if (!SNIFF_ALLOWED[sniffed])` check triggers → **400 reject**.

**Result: FAIL-CLOSED.** Empty output is treated as an unrecognized type. [VERIFIED]

### Branch: `execSync` returns garbage / unparseable output

Same path as empty — any string not in `{'image/jpeg', 'image/png', 'application/pdf'}` is rejected by the allow-list lookup. For example, `file` returning `"application/octet-stream"` or `"text/plain"` or any garbage string → `SNIFF_ALLOWED[garbage]` → `undefined` → reject.

**Result: FAIL-CLOSED.** [VERIFIED]

### Branch: `file` returns "application/octet-stream" (undetermined)

This is `file`'s fallback when it can't determine the type (e.g. random binary data, truncated file). `SNIFF_ALLOWED["application/octet-stream"]` → `undefined` → reject.

**Result: FAIL-CLOSED.** [VERIFIED]

### Branch: `sniffed` is assigned but `let sniffed: string` was uninitialized before the try

In TypeScript strict mode, if `execSync` throws, `sniffed` is never assigned. The exception propagates (no catch), so `sniffed` is never read in the uninitialized state. There is no code path where `sniffed` could be read while uninitialized. [VERIFIED]

### Branch: `writeFileSync` fails (disk full, permission denied)

The temp file write (`writeFileSync(tmpPath, f.buffer)`) is OUTSIDE the inner `try` — it's before the `try` that runs `execSync`. If `writeFileSync` throws, the exception propagates directly to the outer handler `catch` → 500 reject.

**Result: FAIL-CLOSED.** [VERIFIED]

## 3. Bottom Line

### Create path (`POST /api/volunteers/upload`): **FAILS CLOSED**

Every error/edge branch rejects:
- `execSync` error/timeout → exception → outer catch → 500 ✅
- Empty output → not in allow-list → 400 ✅
- Garbage/undetermined output → not in allow-list → 400 ✅
- Temp file write failure → exception → outer catch → 500 ✅

No file is stored, no OCR runs, no UUID dir is created on any error path. [VERIFIED]

### New endpoint (`POST /api/volunteers/:id/upload-scan`): **FAILS CLOSED**

Identical structure, identical fail-direction:
- `execSync` error/timeout → exception → outer catch → 500 ✅
- Empty output → not in allow-list → 400 ✅
- Garbage/undetermined output → not in allow-list → 400 ✅
- Temp file write failure → exception → outer catch → 500 ✅

The transaction (`db.transaction()`) is never entered on any error path — no DB update, no disk write. [VERIFIED]

### Live fail-open branches: **NONE**

Both paths fail closed on every testable error condition. There is no branch where a detection error/empty/undetermined result allows the file to proceed to storage. [VERIFIED]

### Note: two-copy drift risk

The sniff logic should ideally be extracted into a shared helper to prevent drift. Currently both copies are structurally identical and both fail closed, but separate maintenance could introduce divergence. This is a code-quality note, not a security finding.
