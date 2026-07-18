# WordPress Alert Channel Diagnosis — 2026-07-18

## A — Does This Install Send Email?

### A1. admin_email

```
$ wp option get admin_email
[admin email redacted]
```

[VERIFIED]

### A2. new_admin_email

```
$ wp option get new_admin_email
Error: Could not get 'new_admin_email' option. Does it exist?
```

Not set. [VERIFIED]

### A3. Active plugins

```
name              title                      version
sg-ai-studio      AI Agent by SiteGround     1.2.6
polylang          Polylang                   3.8.5
seo-by-rank-math  Rank Math SEO              1.0.274.1
sg-security       Security Optimizer         1.6.5
wordpress-starter SiteGround Central         3.4.5
sg-cachepress     Speed Optimizer            7.8.0
```

**No dedicated SMTP/mail plugin** (no WP Mail SMTP, Post SMTP, Easy WP SMTP, FluentSMTP, or equivalent). [VERIFIED]

### A4. Grep for mail-related functions

**Theme (`4lg-theme/*.php`):** Zero hits for `wp_mail`, `phpmailer_init`, `PHPMailer`, or `mail(`. [VERIFIED — `grep -rn` returned empty]

**mu-plugins:** Zero hits. [VERIFIED]

**wp-config.php:** Zero hits for `SMTP`, `wp_mail`, `phpmailer_init`, `PHPMailer`, or `mail(`. [VERIFIED]

OBSERVATION: The theme, mu-plugins, and wp-config contain no custom mail configuration. Mail delivery relies entirely on WordPress core's default `wp_mail()` → PHP `mail()` path, which uses `sendmail_path => /usr/sbin/sendmail -t -i` (see A7).

### A5. Contact form trace

The contact form at `footer.php:87` (`<form id="contact-form" class="contact-form" novalidate>`) submits via JavaScript in `js/scripts.js`.

**JS submit handler** (`js/scripts.js:170-210`):
```javascript
fetch(CONTACT_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

**CONTACT_ENDPOINT** (`js/scripts.js:66`):
```javascript
var CONTACT_ENDPOINT = 'https://dashboard.4lgshelterapp.duckdns.org/api/contact';
```

[VERIFIED — `js/scripts.js:66` and `js/scripts.js:184`]

**The contact form does NOT use `wp_mail()`.** It POSTs to the VPS shelter app server at `dashboard.4lgshelterapp.duckdns.org/api/contact`. The VPS handler (`server.ts:14151`) validates the input, then calls `sendContactFormEmail()` from `emailService.ts`, which uses **Resend** (a third-party email API, credentials in `/home/shelter/.config/shelter-secrets.json` on the VPS).

CONCLUSION: The contact form cannot prove that WordPress's own `wp_mail()` works. It bypasses WordPress mail entirely.

### A6. Evidence of past successful sends

**SG Security weekly email cron (`sgs_email_cron`):**

SG Security's `Activity_Log_Weekly_Emails` module sends weekly security digest emails to the admin email address (configured in option `sg_security_notification_emails`). It uses `wp_mail()`:

```
wp-content/plugins/sg-security/vendor/siteground/siteground-emails/src/Email_Service.php:168:
    $result = wp_mail(
```

[VERIFIED — `grep -rn 'wp_mail' wp-content/plugins/sg-security/` at `Email_Service.php:168`]

Last successful run timestamp:

```
$ wp option get sg_security_weekly_email_timestamp
1783919192
```

Which is: **Mon Jul 13 05:06:32 UTC 2026** — 5 days ago.

[VERIFIED — `date -d @1783919192` output]

OBSERVATION: The `sg_security_weekly_email_timestamp` is updated by `update_last_cron_run_timestamp()` which fires at priority 1 on `sgs_email_cron`, BEFORE the email send at default priority. So the timestamp proves the cron fired, not that the email was delivered. However, SG Security has been running this cron weekly since install, and the absence of a `debug.log` or any error indicates it has not been failing loudly.

CONCLUSION: `wp_mail()` is very likely functional on this install. The SG Security weekly email cron last fired July 13, uses `wp_mail()`, and shows no error artifacts. This is the strongest available evidence, though it is [INFERRED] not [VERIFIED] — we did not send a test email and cannot confirm delivery.

### A7. PHP mail configuration

```
$ php -i | grep -i 'sendmail_path\|SMTP\|smtp_port\|mail.log'
mail.log => no value
sendmail_path => /usr/sbin/sendmail -t -i
SMTP => localhost
smtp_port => 25
```

[VERIFIED]

SiteGround provides a local MTA at `/usr/sbin/sendmail`. WordPress's default `wp_mail()` uses PHP's `mail()` function, which delegates to this sendmail binary. No external SMTP plugin is needed on SiteGround's managed hosting.

---

## B — Is Telegram Reachable from WordPress?

### B1. Telegram references in WordPress

```
$ grep -rn 'telegram\|TELEGRAM\|bot_token\|api.telegram.org' wp-content/themes/4lg-theme/ wp-content/mu-plugins/ wp-config.php
(no output)
```

**Zero hits.** No Telegram credentials, bot tokens, or API references exist anywhere in the WordPress install. [VERIFIED]

### B2. Outbound HTTPS from WordPress

```
$ wp eval 'var_dump(is_wp_error(wp_remote_get("http://66.228.37.38/api/featured-slots", array("timeout" => 5))));'
bool(false)
```

[VERIFIED] — `wp_remote_get()` to the VPS succeeded (returned a valid response, not a `WP_Error`).

OBSERVATION: Outbound HTTP from WordPress PHP works. The `render_featured_animals()` function at `functions.php:464` calls `wp_remote_get('http://66.228.37.38/api/featured-slots')` and this endpoint serves live data on the homepage. Outbound HTTPS would also work (SiteGround's PHP has `https` in its supported protocols).

CONCLUSION: WordPress CAN make outbound HTTP/HTTPS requests. A webhook-style alert (POST to a URL) is technically possible from an mu-plugin. However, no Telegram bot token exists on this WordPress server, so a direct Telegram alert would require introducing new credentials.

### B3. External notification credentials

```
$ grep -n 'PUSHOVER\|SLACK\|WEBHOOK\|DISCORD\|NTFY\|PUSHBULLET\|RESEND\|SENDGRID\|MAILGUN' wp-config.php
(no output)

$ wp option list --search='*telegram*'
(empty)

$ wp option list --search='*webhook*'
(empty)
```

[VERIFIED] — no external notification service credentials stored in wp-config or options.

### B4. Summary

WordPress has NO path to Telegram today. The VPS has a Telegram bot token (at `/home/rover/.openclaw-rover/telegram-bot-token.txt`) but that credential does not exist on the WordPress server. Per instructions, no credential was copied or read.

---

## C — What Fires on Save

### C1. `wp_insert_post_data` filter vs `wp_unslash` ordering

From `wp-includes/post.php`:

```php
// Line 4885:
$data = apply_filters( 'wp_insert_post_data', $data, $postarr, $unsanitized_postarr, $update );

// Line 4888:
$data  = wp_unslash( $data );
```

[VERIFIED — `wp-includes/post.php:4885-4888`]

**The `wp_insert_post_data` filter fires BEFORE `wp_unslash()`.** A filter callback receives the still-slashed `$data`. It CANNOT compare pre- vs post-unslash content because unslashing has not happened yet. It CAN see the slashed content and detect whether `wp_slash()` was applied (backslashes present = slashed, absent = not slashed and about to be damaged).

### C2. `pre_post_update` hook

```php
// Line 4900:
do_action( 'pre_post_update', $post_id, $data );
```

[VERIFIED — `wp-includes/post.php:4900`]

Fires AFTER `wp_unslash()` (line 4888) and BEFORE the `$wpdb->update()` call (line 4903). The `$data` argument contains the unslashed post data. This is after damage has occurred — if backslashes were stripped, they are already gone in `$data`.

Arguments: `$post_id` (int), `$data` (array of unslashed post data).

### C3. `save_post` hook

```php
// Line 5193:
do_action( 'save_post', $post_id, $post, $update );
```

[VERIFIED — `wp-includes/post.php:5193`]

Fires AFTER the database write. The `$post` argument is a `WP_Post` object freshly loaded from the database. Arguments: `$post_id` (int), `$post` (WP_Post), `$update` (bool).

### C4. Does `save_post` fire for revisions?

Yes. The revision insert path in `wp-includes/revision.php:372` calls `wp_insert_post()`, which fires `save_post`. However, the `save_post_{$post_type}` variant fires as `save_post_revision` for revisions, so a callback on `save_post_page` would NOT fire for a revision of a page — it would fire on `save_post_revision`. The generic `save_post` hook fires for everything.

WordPress also provides `_wp_put_post_revision` (`revision.php:387`) which fires specifically when a revision is stored.

[VERIFIED — `wp-includes/revision.php:372` calls `wp_insert_post()`; `wp-includes/post.php:5182` fires `save_post_{$post->post_type}`]

### C5. Does an mu-plugin's `save_post` callback run from WP-CLI?

Yes. The bootstrap order:

1. WP-CLI loads `wp-settings.php` (same as a web request).
2. `wp-settings.php:498`: `foreach ( wp_get_mu_plugins() as $mu_plugin )` — loads all mu-plugins.
3. `wp-settings.php:540`: `do_action( 'muplugins_loaded' )`.
4. `wp-settings.php:622`: `do_action( 'plugins_loaded' )`.

[VERIFIED — `wp-settings.php:498`, `wp-settings.php:540`, `wp-settings.php:622`]

An mu-plugin that hooks `save_post` runs its callback whether the save originates from the WordPress admin, the REST API, or WP-CLI. WP-CLI uses the same WordPress bootstrap, so all hooks fire. This was implicitly confirmed by the probe post 494 test — the `wp post update` CLI command created revisions, which means the full `wp_insert_post()` pipeline (including all hooks) executed.

---

## D — Existing Monitoring Surface

### D1. Scheduled writes

No custom scheduled writes in the theme or mu-plugins. The theme's `functions.php` contains `error_log()` calls for SG cache purge failures (lines 264, 269, 1057, 1061, 1291, 1296) but these are error paths, not scheduled writes. [VERIFIED]

### D2. WP-Cron status

`DISABLE_WP_CRON` is **NOT set** in `wp-config.php`. WP-Cron is active. [VERIFIED — `grep -n 'DISABLE_WP_CRON' wp-config.php` returned empty]

Active scheduled events (abridged):

| Hook | Recurrence | Next run |
|------|-----------|----------|
| action_scheduler_run_queue | 1 minute | 9 seconds |
| wp_update_plugins | 12 hours | 26 min |
| wp_update_themes | 12 hours | 56 min |
| sgs_email_cron | 1 week | 2 days 3 hours |
| wp_scheduled_delete | 1 day | ~23 hours |
| siteground_security_clear_logs_cron | 1 day | ~23 hours |

[VERIFIED — `wp cron event list` output]

### D3. mu-plugins directory

```
$ ls -la wp-content/mu-plugins/
total 20
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 17 00:57 .
drwxr-xr-x 9 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 18 01:12 ..
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4184 Jul 17 00:57 4lg-disable-user-enumeration.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

Two mu-plugins as expected. Directory is **writable**. [VERIFIED]

---

## E — The Honest Question

### E1. Alert channels usable today without new credentials

**1. `wp_mail()` to the admin email**

Evidence it works: SG Security's weekly email cron (`sgs_email_cron`) uses `wp_mail()` via `Email_Service.php:168` and last fired July 13 (`sg_security_weekly_email_timestamp = 1783919192`). PHP's `sendmail_path` is configured (`/usr/sbin/sendmail -t -i`). SiteGround provides a local MTA. No SMTP plugin needed. [VERIFIED that the mechanism exists and the cron fires; INFERRED that delivery succeeds]

Silent failure modes:
- SiteGround rate-limits outbound email (shared hosting). If the limit is hit, `wp_mail()` returns false but the mu-plugin would need to check the return value and handle it.
- Gmail could classify the alert as spam. SiteGround's shared IP may not have strong deliverability.
- If `sendmail` silently fails (binary present but MTA down), `wp_mail()` may return true while no email is sent. There is no mail log (`mail.log => no value`).
- WP-Cron-based delivery depends on site traffic to trigger cron runs. A save that fires `save_post` is not cron-dependent (it fires synchronously), but any follow-up retry mechanism would be.

**2. Outbound HTTP POST to VPS (webhook to shelter app)**

Evidence it works: `wp_remote_get('http://66.228.37.38/api/featured-slots')` succeeds from WordPress PHP. The homepage renders featured animals from this endpoint, proving the outbound path works in production. [VERIFIED]

An mu-plugin could POST to a VPS endpoint (e.g., `/api/content-alert`) which could then send a Telegram alert via the existing bot token on the VPS. This requires NO new credentials on the WordPress side — only a new endpoint on the VPS.

Silent failure modes:
- VPS is down or unreachable from SiteGround.
- The VPS endpoint doesn't exist yet (it would need to be built).
- Network timeout if the VPS is slow to respond; `wp_remote_post()` defaults to 5-second timeout, which could block the save if synchronous.

### E2. Summary

Two channels exist TODAY without new credentials:
1. **`wp_mail()` to the admin email** — likely works based on SG Security's weekly use, but no confirmed delivery test was performed in this session.
2. **Outbound HTTP to VPS** — proven functional, and the VPS already has Telegram credentials for the final mile.

Neither channel has been end-to-end tested for this specific alert use case. The strongest path is likely (2): mu-plugin fires on `save_post`, POSTs to a VPS webhook, VPS sends the Telegram alert. This avoids email deliverability uncertainty and reuses the proven Telegram path.

---

A5: contact form sends mail via: VPS Resend API (not wp_mail); wp_mail proven working: no (SG Security uses it weekly — INFERRED working, not VERIFIED)
B1: Telegram credentials present in WordPress: no
E1: alert channels usable today without new credentials: wp_mail (inferred working), outbound HTTP to VPS (verified working)
