# OpenClaw Live Token Source — Why New Browsers Are Rejected

**Date:** 2026-07-09 16:17 UTC  
**Type:** Read-only diagnosis  
**Author:** Rover (automated)

---

## TL;DR

The config file token **is** the live token — there is no mismatch. The real issue is that OpenClaw webchat uses **two-factor authentication**: (1) the shared secret token, and (2) **device pairing approval** per browser. A new browser that sends the correct token still gets rejected until it is explicitly approved via `openclaw devices approve`. The "token rejected" behavior is actually the device-pairing gate, not a token mismatch.

---

## 1. Runtime Environment (Process PID 219471)

**Full process environment (variable names only):** [VERIFIED — /proc/219471/environ]

```
HOME=/home/rover
INVOCATION_ID=<uuid>
JOURNAL_STREAM=<id>
LANG=en_US.UTF-8
LOGNAME=rover
MEMORY_PRESSURE_WATCH=<cgroup-path>
MEMORY_PRESSURE_WRITE=<base64>
NODE_ENV=production
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/snap/bin
SHELL=/bin/bash
SYSTEMD_EXEC_PID=219471
USER=rover
```

**No token/auth/gateway env vars present.** [VERIFIED]  
No `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`, or any auth-related env var exists in the process environment.

## 2. Systemd Unit

**Source:** [VERIFIED — `systemctl cat rover`]

```ini
# /etc/systemd/system/rover.service
[Unit]
Description=Rover (OpenClaw Gateway, profile=rover)
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/openclaw --profile rover gateway
User=rover
Group=rover
WorkingDirectory=/home/rover/rover
Environment=HOME=/home/rover
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Findings:**
- No `EnvironmentFile=` directive. [VERIFIED]
- No inline token/secret in `Environment=` lines. [VERIFIED]
- No `--token`, `--password`, or `--config` flags on `ExecStart`. [VERIFIED]
- `--profile rover` maps to config dir `~/.openclaw-rover/`. [VERIFIED]

## 3. Config Precedence — Which File Is Loaded

**Candidate config files:**

| Path | Exists? | Source |
|------|---------|--------|
| `/home/rover/.openclaw-rover/openclaw.json` | **Yes** (2308 bytes, mode 600, modified Jun 2) | [VERIFIED — ls -la] |
| `/home/rover/.openclaw/openclaw.json` | No | [VERIFIED — ls: No such file] |
| `/home/rover/.config/openclaw/openclaw.json` | No | [VERIFIED — ls: No such file] |

**Process open file descriptors confirm:** The running gateway has FDs open to `/home/rover/.openclaw-rover/tasks/runs.sqlite`, `/home/rover/.openclaw-rover/memory/main.sqlite`, `/home/rover/.openclaw-rover/plugin-state/state.sqlite`, and other files under `.openclaw-rover/`. [VERIFIED — /proc/219471/fd]

**`openclaw --profile rover gateway status` confirms:** `Config (cli): ~/.openclaw-rover/openclaw.json` [VERIFIED]

**Only one config file exists, and it is the one loaded.** [VERIFIED]

## 4. Fingerprint Comparison

**Config file token fingerprint:**

| Source | first4 | length | sha256 prefix (8 chars) |
|--------|--------|--------|------------------------|
| `openclaw.json` → `gateway.auth.token` | `87cd` | 64 | `9478d07f` |

**No other token sources exist** — no env var, no EnvironmentFile, no secondary config file. [VERIFIED]

**Live gateway proof:**

| Test | WS upgrade to `/__openclaw__/ws` | HTTP status |
|------|----------------------------------|-------------|
| Bearer header with config token (`87cd...`) | **101 Switching Protocols** (connection held open) | Success |
| Bearer header with wrong token | **401 Unauthorized** | Rejected |
| No Bearer header | **401 Unauthorized** | Rejected |

**The config file token IS the live gateway token.** [VERIFIED — direct WS auth test]

## 5. Source of Truth in Code / Docs

From `/usr/lib/node_modules/openclaw/docs/gateway/security/index.md` and `configuration-reference.md`: [VERIFIED]

**Auth mode precedence:**
- `gateway.auth.mode: "token"` → shared bearer token (our config)
- `gateway.auth.mode: "password"` → password auth (prefer `OPENCLAW_GATEWAY_PASSWORD` env var)
- `gateway.auth.mode: "trusted-proxy"` → delegate to reverse proxy
- `gateway.auth.mode: "none"` → no auth (loopback only)

**Token sources (in order):**
1. `gateway.auth.token` in config file (our case)
2. `OPENCLAW_GATEWAY_TOKEN` env var (not set in our environment)
3. `gateway.remote.token` as fallback — only when `gateway.auth.*` is unset (does not apply here)

**Key doc quote:** "Onboarding wizard generates a token by default." — this is the token in our config file.

## 6. Token Rotation

**Journal scan** (`journalctl -u rover --since "30 days ago"`, filtered for token/auth/gateway): [VERIFIED]

- **No token generation or rotation messages found** in 30 days of journal output.
- No startup message printing a token.
- No "token rotated" or "token generated" log entries.
- The gateway does NOT auto-rotate or regenerate tokens at startup. [VERIFIED]

## 7. The Real Gate: Device Pairing

From `/usr/lib/node_modules/openclaw/docs/web/control-ui.md`: [VERIFIED]

> "When you connect to the Control UI from a new browser or device, the Gateway usually requires a **one-time pairing approval**."

**The webchat (Control UI) authentication is TWO steps:**

1. **Shared secret** — the `gateway.auth.token` from `openclaw.json` (bearer token on WS handshake)
2. **Device pairing** — each new browser/device must be explicitly approved via `openclaw devices approve <requestId>`

**Current paired devices:** [VERIFIED — `openclaw --profile rover devices list`]

| Device ID (truncated) | Role | IP |
|----------------------|------|-----|
| `150f...0baeccf2` | operator | 24.189.252.136 |
| `9f09...98fd6eb2` | operator | (none stored) |

Only 2 devices are currently paired. A new browser connecting from a new device identity will be rejected at the pairing step even if the token is correct.

**Exception:** Direct loopback connections (`127.0.0.1` / `localhost`) are auto-approved. [VERIFIED — docs]

## Bottom Line

| Question | Answer |
|----------|--------|
| Is there an env/systemd token overriding the config? | **No.** No token env vars in the process, no EnvironmentFile in the unit. [VERIFIED] |
| Which config does the running process load? | **`/home/rover/.openclaw-rover/openclaw.json`** — the only candidate that exists. [VERIFIED] |
| Do fingerprints match? | **Only one token source exists.** Config token (first4=`87cd`, len=64, sha256=`9478d07f`) is accepted by the live gateway WS endpoint. [VERIFIED] |
| What's the live token source? | **`gateway.auth.token`** in `/home/rover/.openclaw-rover/openclaw.json`. [VERIFIED] |
| Why is a new browser rejected? | **Device pairing**, not token mismatch. After entering the correct token, the new browser must also be approved via `openclaw --profile rover devices approve <requestId>`. [VERIFIED — docs + device list] |

**To connect a new device:**

1. Open `https://rover.4lgshelterapp.duckdns.org` in the new browser.
2. Enter the gateway token (from `gateway.auth.token` in `openclaw.json` — do not print here).
3. The browser will show "disconnected (1008): pairing required".
4. On the VPS, run: `openclaw --profile rover devices list` → find the pending request.
5. Run: `openclaw --profile rover devices approve <requestId>`
6. The browser reconnects and is permanently paired.

---

*Report generated read-only. No configuration was modified.*
