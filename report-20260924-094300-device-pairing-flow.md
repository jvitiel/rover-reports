# OC Gateway Device Pairing — New Browser/Device Flow

**Date:** 2026-09-24  
**Type:** Read-only diagnosis  
**Subject:** How a new device (iPad) completes pairing after hitting "device pairing required"

---

## 1. What "device pairing required" means

When a new browser or device connects to the Control UI / WebChat, the Gateway requires a **one-time device pairing approval** before granting operator access. The browser generates a unique device identity (via WebCrypto); the Gateway creates a **pending pairing request** and closes the WebSocket with code `1008` and reason `pairing required`. The new device cannot proceed until an operator approves that request.

[VERIFIED] — mechanism documented at:
- `/usr/lib/node_modules/openclaw/docs/web/control-ui.md` § "Device pairing (first connection)" (lines ~105-125)
- `/usr/lib/node_modules/openclaw/docs/gateway/troubleshooting.md:631` — `gateway closed (1008): pairing required`
- `/usr/lib/node_modules/openclaw/docs/channels/pairing.md` § "Node device pairing" (same `openclaw devices approve` flow applies to browser operator sessions)

The mechanism is **(b) — an approval flow**: the new device creates a pending request automatically on connect; an already-authorized operator approves it via CLI. It is NOT an allowlist of device IDs in config, nor a pairing code the user enters manually.

### Exceptions that skip pairing

- Direct loopback connections (`127.0.0.1` / `localhost`) are auto-approved.
- Tailscale Serve with `gateway.auth.allowTailscale: true` and verified Tailscale identity can skip pairing for operator sessions with browser device identity.
- LAN, direct Tailnet binds, and device-less browser profiles still require explicit approval.

Source: `/usr/lib/node_modules/openclaw/docs/web/control-ui.md` lines ~127-134

### Per-browser uniqueness

Each browser profile generates a unique device ID. Switching browsers, switching browser profiles, or clearing browser data (site data) will require re-pairing.

Source: `/usr/lib/node_modules/openclaw/docs/web/control-ui.md` line ~134

---

## 2. How to approve the iPad (exact steps)

From any machine with the `openclaw` CLI and access to the Rover profile (e.g., John's working PC via SSH to the VPS, or directly on the VPS):

### Step 1 — List pending requests

```bash
openclaw --profile rover devices list
```

This shows all pending and paired devices. The pending entry for the iPad will appear with a request ID, status `new pairing`, and the requesting IP.

### Step 2 — Approve by request ID

```bash
openclaw --profile rover devices approve <requestId>
```

Replace `<requestId>` with the UUID shown in the pending list.

### Step 3 — Reload the iPad browser

After approval, refresh the page on the iPad. The WebSocket will reconnect and the device will now have operator access.

Source: `/usr/lib/node_modules/openclaw/docs/web/control-ui.md` § "Device pairing (first connection)" lines ~107-120

### Where the approval happens

- The approval runs from the **CLI on the gateway host** (or via SSH to the VPS).
- There is no in-browser approval prompt on existing sessions — it's a CLI-only operation.
- The pending request does NOT appear in the Control UI of an existing paired browser session — it's visible only via `openclaw devices list`.

### Revoking later

To revoke a paired device later:

```bash
openclaw --profile rover devices revoke --device <deviceId> --role <role>
```

Source: `/usr/lib/node_modules/openclaw/docs/web/control-ui.md` line ~124

---

## 3. Current pending state

**Yes** — there is exactly **1 pending pairing request** currently waiting for approval.

Verified via `openclaw --profile rover devices list` which shows `Pending (1)` with status `new pairing`, age ~3 minutes at time of check. There are also 3 already-paired devices.

The pending request data is stored at `~/.openclaw-rover/devices/pending.json`.

---

## 4. Docs references on the VPS

| Topic | Path |
|-------|------|
| Control UI device pairing (primary) | `/usr/lib/node_modules/openclaw/docs/web/control-ui.md` |
| Channel pairing overview (DM + node) | `/usr/lib/node_modules/openclaw/docs/channels/pairing.md` |
| Gateway-owned node pairing (detailed) | `/usr/lib/node_modules/openclaw/docs/gateway/pairing.md` |
| Troubleshooting (1008 pairing required) | `/usr/lib/node_modules/openclaw/docs/gateway/troubleshooting.md` |
| Devices CLI reference | `/usr/lib/node_modules/openclaw/docs/cli/devices.md` |
| Gateway security (auth modes) | `/usr/lib/node_modules/openclaw/docs/gateway/security/index.md` |

---

## Summary

A new browser/device hitting the OC gateway WebChat or Control UI triggers an automatic pending pairing request. The gateway closes the connection with `1008: pairing required`. An operator approves it from the CLI with `openclaw devices list` → `openclaw devices approve <requestId>`. After approval, the iPad refreshes and connects normally. One pending request currently exists from the iPad.
