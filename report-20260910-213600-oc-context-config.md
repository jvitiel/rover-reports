# OpenClaw Context Window Configuration Diagnosis

**Date:** 2026-09-10  
**Agent:** agent:main:main (Rover, OpenClaw 2026.5.28 e932160)  
**Current:** Context: 20k/1.0m — Runtime: "OpenClaw Default" — Model: anthropic/claude-opus-4-6

---

## 1. Config Location

Config dir: `/home/rover/.openclaw-rover/`  
Config file: `/home/rover/.openclaw-rover/openclaw.json` (last modified 2026-06-02 21:36 UTC)  
Gateway last started: 2026-09-06 02:45 UTC (config was loaded)

No agents list or named runtime profiles are defined — `agents.list` is absent, `runtime`/`runtimes` keys absent. The "OpenClaw Default" runtime shown in /status is the built-in unnamed default. [VERIFIED — openclaw.json parsed, no `agents.list`, `runtime`, or `runtimes` keys]

Other config locations checked:
- `~/.config/openclaw/` — does not exist
- `/etc/openclaw/` — does not exist
- `~/.openclaw/` — exists but contains only `exec-approvals.json` (no config)

[VERIFIED — ls/stat on all paths]

---

## 2. Context Setting Source — Why It Shows 1M

**The 1M is NOT an explicit config value.** It is a hardcoded default in OpenClaw 2026.5.28 for all Anthropic GA Claude 4.x models.

The existing config DOES have a 200k override attempt, but it's ineffective due to the resolution order in the runtime code:

**Existing config** (`openclaw.json`):
```json
"models": {
  "providers": {
    "anthropic": {
      "models": [{
        "id": "claude-opus-4-6",
        "contextWindow": 200000,
        "reasoning": true
      }]
    }
  }
}
```

**Why this doesn't work:** `resolveContextTokensForModel` in `context-CjLHH2E3.js:219` has a hardcoded early return:

```js
if (explicitProvider && isAnthropic1MModel(ref.provider, ref.model))
    return ANTHROPIC_CONTEXT_1M_TOKENS;  // 1048576
```

This fires BEFORE the config cache lookup at line 221-223. The config's `contextWindow: 200000` is loaded into the cache correctly (`applyConfiguredContextWindows` at line 130), but `resolveContextTokensForModel` never reaches the cache lookup for Anthropic GA models — it returns 1M at line 219 first.

**Confirmation:** `openclaw models list` shows `195k` for opus-4-6 (the model catalog respects the config override via `resolveContextWindowInfo` in `context-window-guard`), but `/status` shows 1M (the status builder uses `resolveContextTokensForModel` which hits the early return). Two different code paths, two different answers. [VERIFIED — `openclaw --profile rover models list` output vs session_status output]

Also in `register.runtime-CKL4CjrU.js:190`, the Anthropic provider base catalog already sets `contextWindow: 1e6` for GA models:
```js
contextWindow: isAnthropicGa1MModel(trimmedModelId) ? ANTHROPIC_GA_1M_CONTEXT_TOKENS : 2e5,
```
[VERIFIED — register.runtime-CKL4CjrU.js:190]

The existing `agents.defaults.models["anthropic/claude-opus-4-6"].params.context1m: false` is also ineffective — per the docs: "OpenClaw no longer sends Anthropic's retired context-1m beta header for this setting" and does not use it to control the context window size. [VERIFIED — docs/reference/token-use.md:220]

---

## 3. Persistent Override — How to Pin 200k

**Key:** `agents.defaults.contextTokens`  
**File:** `/home/rover/.openclaw-rover/openclaw.json`  
**Value:** `200000` (integer)

This works because `contextTokensOverride` (fed by `agents.defaults.contextTokens`) is checked at `resolveContextTokensForModel` line 212 — BEFORE the Anthropic 1M early return at line 219:

```js
if (typeof params.contextTokensOverride === "number" && params.contextTokensOverride > 0)
    return params.contextTokensOverride;  // line 212 — checked FIRST
// ...
if (explicitProvider && isAnthropic1MModel(...))
    return ANTHROPIC_CONTEXT_1M_TOKENS;   // line 219 — never reached
```

The status builder at `status-message-Vvr3WT08.js:348` reads:
```js
const agentContextTokens = typeof args.agent?.contextTokens === "number" ...
```
...and passes it through as `contextTokensOverride`. [VERIFIED — status-message-Vvr3WT08.js:348,366]

The compaction engine at `cli-compaction-qWhfrUhf.js:240` reads `sessionEntry.contextTokens`, which is populated from `agents.defaults.contextTokens` at session creation. [VERIFIED — sessions-DygStlin.js:174,269]

**Documented:** `docs/gateway/config-agents.md:412` shows `contextTokens: 200000` in the example config. [VERIFIED]

**Edit location in openclaw.json:** Add `"contextTokens": 200000` inside the existing `agents.defaults` object (sibling of `workspace`, `model`, `models`, `thinkingDefault`).

**Optional cleanup:** The existing `models.providers.anthropic.models[].contextWindow: 200000` and `agents.defaults.models["anthropic/claude-opus-4-6"].params.context1m: false` are both ineffective and can be removed, but are harmless to leave.

---

## 4. Apply Mechanism

Gateway restart is required. Config changes are loaded at gateway startup.

Command: `openclaw --profile rover gateway restart`  
Or: `sudo systemctl restart rover`

New sessions after restart will use the updated value. The existing session's persisted `contextTokens` may retain the old value until a new session is started or the session is compacted. [INFERRED — based on session store persistence at sessions-DygStlin.js:269]

---

## 5. Version Default

**OpenClaw version:** 2026.5.28 (e932160)

**1M is the 2026.5.28 hardcoded default for all GA Claude 4.x models** (Opus 4.8, 4.7, 4.6 and Sonnet 4.6). This is by design per docs: "OpenClaw sizes GA-capable Claude 4.x models such as Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6 with Anthropic's 1M context window." [VERIFIED — docs/reference/token-use.md:207-210, context-CjLHH2E3.js:41-50 ANTHROPIC_GA_1M_MODEL_PREFIXES]

The config was last modified 2026-06-02. The gateway was last restarted 2026-09-06. No evidence of a version update resetting the config — the 1M was always the runtime default; the config's `contextWindow: 200000` was always ineffective due to the code path ordering. [INFERRED — based on code analysis; no git history available for OpenClaw package itself]
