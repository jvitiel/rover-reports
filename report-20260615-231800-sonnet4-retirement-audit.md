# ⚠️ RETIRED MODEL FOUND: claude-sonnet-4-20250514 at server.ts:8092

# Sonnet 4 retirement audit — shelter system model pins

**Date:** 2026-06-15 23:18 UTC  
**Scope:** Read-only diagnosis. No changes.
**Priority:** One broken endpoint found.

---

## AFFECTED: Volunteer application OCR

**File:** `server/src/server.ts` line 8092  
**Endpoint:** `POST /api/volunteers/upload`  
**Feature:** Volunteer application form OCR — extracts structured data from uploaded multi-page form images using Claude vision  
**Model string:** `claude-sonnet-4-20250514` ← **RETIRED, NOW BROKEN**  
**Provider:** Anthropic (direct API call to `https://api.anthropic.com/v1/messages`)

This endpoint is called when staff upload scanned/photographed volunteer application forms. It sends page images to Claude with a structured extraction prompt (`VOLUNTEER_OCR_SYSTEM_PROMPT`). With the retired model string, all calls will now return an API error.

---

## Complete Anthropic model pin inventory

| Feature | File:line | Provider | Exact model string | Retired? |
|---------|-----------|----------|--------------------|----------|
| **Volunteer OCR** | server.ts:8092 | Anthropic | `claude-sonnet-4-20250514` | **⚠️ YES — BROKEN** |
| Cat matcher (custom-search + main) | server.ts:4612 | Anthropic | `claude-sonnet-4-6` | No |
| Followup evaluator | server.ts:5135 | Anthropic | `claude-sonnet-4-6` | No |
| Custom-search handler | server.ts:4612 (same) | Anthropic | `claude-sonnet-4-6` | No |
| localDatabase defaults | localDatabase.ts:1081, 1188 | N/A (filter param) | `claude-sonnet-4-6` (default arg) | No — not an API call |

[VERIFIED — grep of entire codebase, all matches listed]

---

## Non-Anthropic model pins (unaffected)

| Feature | File:line | Provider | Exact model string |
|---------|-----------|----------|--------------------|
| Bio generation (long+short) | attributeParser.ts:284 | OpenAI | `gpt-4o` |
| Bio regeneration | attributeParser.ts:373 | OpenAI | `gpt-4o` |
| Bio translation (ES) | attributeParser.ts:406, 458, 508 | OpenAI | `gpt-4o` |
| Behavior notes parsing | attributeParser.ts:137 | OpenAI | `gpt-4o` |
| Adopter preferences parsing | attributeParser.ts:181 | OpenAI | `gpt-4o` |

All bio pipeline calls use OpenAI `gpt-4o` — completely unaffected by the Sonnet retirement. [VERIFIED]

---

## Custom-search detail

The custom-search PWA (`custom-search/app.js`) makes a client-side `fetch('/api/matcher/custom-search')` call. This hits `server.ts:4249` (`POST /api/matcher/custom-search`), which uses **the main matcher handler** with model `claude-sonnet-4-6` at line 4612. **Not affected** — this is the current (non-retired) Sonnet. [VERIFIED]

---

## Model string location type

All three Anthropic model strings are **hardcoded** in `server/src/server.ts`. They are NOT read from env vars, config files, or `shelter-secrets.json`. The secrets file provides only `anthropic.apiKey`, not the model name. [VERIFIED — `grep -n 'model' server/src/types.ts` shows no model field in the secrets type]

---

## Conclusion

**One feature broken:** Volunteer application OCR (`POST /api/volunteers/upload`, server.ts:8092) — pins `claude-sonnet-4-20250514` (retired).

**Fix:** Change `claude-sonnet-4-20250514` → `claude-sonnet-4-6` at server.ts:8092. One-line change, rebuild, restart.

**Everything else is fine:** Matcher and followup-eval already use `claude-sonnet-4-6`. Bio pipeline uses OpenAI `gpt-4o`. No other Anthropic model pins exist in the codebase.
