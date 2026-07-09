# OpenClaw Web Chat Authentication — rover.4lgshelterapp.duckdns.org

**Date:** 2026-07-09 16:07 UTC  
**Type:** Read-only diagnosis  
**Author:** Rover (automated)

---

## 1. Caddy Block (rover.4lgshelterapp.duckdns.org)

```
rover.4lgshelterapp.duckdns.org {
    import security_headers
    reverse_proxy localhost:18790
}
```

**Findings:** [VERIFIED — /etc/caddy/Caddyfile lines 137-140]

- No `basic_auth` directive.
- No `forward_auth` directive.
- No IP allowlist / `@allowed` matcher.
- `security_headers` snippet adds HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, strips x-powered-by. **No authentication.**
- Caddy passes all HTTPS traffic through to the OpenClaw gateway on localhost:18790.

## 2. OpenClaw Gateway Auth (openclaw.json)

**Findings:** [VERIFIED — /home/rover/.openclaw-rover/openclaw.json, values redacted]

The gateway is configured with **token-based authentication**:

```
gateway.auth.mode  = "token"
gateway.auth.token = [REDACTED]
```

Additional relevant keys:

```
gateway.bind             = "loopback"          # only listens on 127.0.0.1
gateway.port             = 18790
gateway.controlUi.allowedOrigins = ["https://rover.4lgshelterapp.duckdns.org"]
gateway.trustedProxies   = ["127.0.0.1", "::1"]
```

**Mechanism:** OpenClaw's built-in token auth. The web chat UI prompts for a token (or accepts it as a URL query parameter `?token=...`). The token value lives in `gateway.auth.token` inside `/home/rover/.openclaw-rover/openclaw.json`. No IP-based restriction exists at the OpenClaw layer.

## 3. IP Restrictions

| Layer | IP restriction? | Notes |
|-------|----------------|-------|
| Caddy | **No** [VERIFIED] | No matchers, no allowlist in the rover block |
| UFW | **UNCERTAIN** | Could not read UFW rules (rover user lacks sudo). Standard Linode config likely allows 443 inbound. |
| OpenClaw | **No** [VERIFIED] | `gateway.bind = "loopback"` means only Caddy (on localhost) can reach the port. No client IP filtering. |

## 4. Bottom Line — New Device Access

**Authentication type: (c) — a token, either entered in the web UI login prompt or appended to the URL.**

To access the OpenClaw web chat from a new laptop:

1. Open `https://rover.4lgshelterapp.duckdns.org` in any browser.
2. The web chat UI will prompt for a gateway token.
3. Enter the token value stored in `gateway.auth.token` inside `/home/rover/.openclaw-rover/openclaw.json`.
4. No IP allowlisting, no basic-auth username/password, no certificate — just the token.

**Where the credential lives:** `gateway.auth.token` key in `/home/rover/.openclaw-rover/openclaw.json` (file owned by rover user, on the VPS).

**No per-device enrollment is needed.** Any device with the URL and the token can connect. The token is the sole gate.

---

*Report generated read-only. No configuration was modified.*
