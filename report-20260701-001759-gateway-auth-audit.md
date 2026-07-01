# Auditor 3 — Report 1:1: Gateway Auth & Token Strength

**Generated:** 2026-07-01 04:17 UTC (read-only audit, no changes made)

---

## 1. Running Version vs Config

| Item | Value |
|------|-------|
| Running binary | OpenClaw **2026.5.28** (commit e932160) |
| PID | 105776, listening on 127.0.0.1:18790 + [::1]:18790 |
| Binary path | /usr/bin/node (Node.js wrapper) |
| `openclaw --version` | 2026.5.28 |
| `meta.lastTouchedVersion` | **2026.4.15** |
| `wizard.lastRunVersion` | **2026.4.15** |

**Version gap:** The running binary (2026.5.28) is **newer** than the config that last configured it (2026.4.15). This means the config was written by the setup wizard at 2026.4.15 and the binary has been upgraded since without re-running the wizard.

**Auth schema stability:** The `gateway.auth` config shape is `{ mode: "token", token: "<value>" }`. Source inspection of the running binary's `auth-token-resolution` module confirms it reads `gateway.auth.token` (or `gateway.auth.password`) from `openclaw.json`, with env-var fallback (`OPENCLAW_GATEWAY_TOKEN`). The resolution code path is straightforward and has not changed structurally — the token configured at 2026.4.15 is the token the 2026.5.28 binary actually reads. **No stale/unread risk from the version gap on auth keys.**

The `meta.lastTouchedVersion` / `wizard.lastRunVersion` fields are cosmetic breadcrumbs — they do not gate auth behavior. Running `openclaw doctor` or the setup wizard would update them but is not required for auth to function.

---

## 2. Gateway Auth Enforcement — Mechanism

### Network path (external client → gateway)

```
External client
  → HTTPS (TLS terminated by Caddy)
  → rover.4lgshelterapp.duckdns.org
  → Caddy reverse_proxy localhost:18790
  → Gateway WebSocket on 127.0.0.1:18790
```

Caddy config for the rover domain:

```
rover.4lgshelterapp.duckdns.org {
    import security_headers
    reverse_proxy localhost:18790
}
```

No Caddy-level auth — all auth is delegated to the gateway process.

### Control channel endpoint

The Control UI (and all WebSocket clients) connect to **`wss://rover.4lgshelterapp.duckdns.org/`** (root path `/`). The gateway multiplexes WebSocket + HTTP on a single port. The WebSocket upgrade happens at `/` with standard `Upgrade: websocket` headers.

### Auth handshake

- **Auth mode:** `token` (configured in `gateway.auth.mode`)
- **Mechanism:** The gateway accepts the HTTP→WebSocket upgrade at the TCP/HTTP level (returns 101 Switching Protocols), then performs **application-layer token authentication inside the WebSocket protocol**. The first WebSocket message(s) from the client must carry the gateway token. If the token is missing or wrong, the gateway closes the WebSocket connection (code 1008 unauthorized per the docs).
- **This is standard for WebSocket auth** — browsers cannot set custom HTTP headers on WebSocket upgrade requests, so token auth must happen inside the WebSocket frame exchange rather than at HTTP upgrade time.

### What rejects an unauthenticated client

The **gateway process itself** (OpenClaw runtime) rejects clients that fail to present a valid token after the WebSocket upgrade. The rejection is a WebSocket close frame, not an HTTP error code. Caddy does not participate in auth — it is a transparent reverse proxy.

### Additional access controls

| Control | Value |
|---------|-------|
| `gateway.mode` | `local` |
| `gateway.bind` | `loopback` (127.0.0.1 only) |
| `gateway.trustedProxies` | `["127.0.0.1", "::1"]` |
| `gateway.controlUi.allowedOrigins` | `["https://rover.4lgshelterapp.duckdns.org"]` |

The `allowedOrigins` restriction means browser-based Control UI connections must originate from `https://rover.4lgshelterapp.duckdns.org`. Other origins are rejected. This is a browser-only control (Origin header); non-browser clients (curl, scripts) can set arbitrary Origin headers.

The `trustedProxies` setting means the gateway trusts `X-Forwarded-For` from Caddy (127.0.0.1) to determine the real client IP. External clients going through Caddy are seen by their real IP, not as loopback — so they do NOT get loopback auto-approval treatment for device pairing.

---

## 3. Token Strength

| Property | Value |
|----------|-------|
| Token length | **64 characters** |
| Character class | **lowercase hexadecimal** (0-9, a-f) |
| Entropy | ~256 bits (64 hex chars × 4 bits/char) |
| Value | **REDACTED** |

**Assessment:** This is a **strong, randomly-generated token**. 256 bits of entropy is well above brute-force thresholds. Not a default or weak value.

**Telegram bot token:** PRESENT (47 bytes on disk at expected path). Value redacted; presence confirmed.

**Verdict:** Strongly token-gated.

---

## 4. Loopback Rejection Probe

**Probe:** One unauthenticated WebSocket upgrade request from localhost to `127.0.0.1:18790/`.

```
curl -v -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: ..." \
  http://127.0.0.1:18790/
```

**Result:** HTTP **101 Switching Protocols** — WebSocket upgrade accepted.

**Interpretation:** The gateway accepted the WebSocket upgrade at the HTTP level and returned 101. This is **expected behavior** — OpenClaw performs token auth inside the WebSocket protocol, not at HTTP upgrade time. The 101 response means TCP transport was established; it does NOT mean the client was authenticated or can issue commands. Without sending a valid token in the first WebSocket message, the gateway will close the connection with code 1008 (unauthorized).

**Caveat:** This loopback probe is not representative of external client behavior for two reasons:
1. Loopback connections get auto-approved device pairing (per docs: "Device pairing is auto-approved for direct local loopback connects"). External clients through Caddy are seen by their real IP via `X-Forwarded-For`.
2. The probe only tested the HTTP upgrade, not whether a tokenless WebSocket session can actually issue commands. The auth gate is inside the WebSocket, not at HTTP level.

**Bottom line:** The HTTP 101 is not an auth bypass — it's the normal WebSocket handshake before application-layer auth. An external confirmation (from outside the box, through Caddy) would verify that the full auth flow rejects tokenless sessions end-to-end.

---

## File Permissions Summary

| Path | Perms | Owner | Expected |
|------|-------|-------|----------|
| `~/.openclaw-rover/openclaw.json` | 600 | rover:rover | 600 ✅ |
| `~/.openclaw-rover/` (state dir) | 755 | rover:rover | 700 preferred ⚠️ |
| `~/.openclaw-rover/agents/` | 700 | rover:rover | 700 ✅ |
| `~/.openclaw-rover/telegram-bot-token.txt` | 600 | rover:rover | 600 ✅ |

**Note:** The state directory itself is 755 (world-readable directory listing, though sensitive subdirs are 700). Tightening to 700 would prevent other users from listing the directory contents. This is a hardening note, not a critical finding — sensitive files inside are already 600/700.

---

## Summary

| Check | Result |
|-------|--------|
| Running version vs config | Binary 2026.5.28 > config 2026.4.15. Auth schema stable across gap. |
| Auth mechanism | Token auth inside WebSocket protocol. Gateway process enforces. |
| Token strength | 64-char hex, ~256-bit entropy. Strong random token. |
| Loopback probe | HTTP 101 (expected — auth is inside WS, not at HTTP level). |
| External confirmation needed | Yes — loopback is not representative of external path. |

*Read-only audit. No changes made. No services restarted.*
