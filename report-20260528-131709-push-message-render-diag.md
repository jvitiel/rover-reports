# Push Message Render Diagnostic

**Date:** 2026-05-28 09:17 ET  
**Type:** Read-only code inspection  
**Question:** Would a URL pushed through the staff notification feature render as a clickable hotlink?

---

## 1. Dashboard Send Path

**Location:** `dashboard/index.html`

**UI (lines 5606–5625):** The "Staff App Notifications" section in the Wellbeing tab contains:
- `#staffNotifButtonLabel` — text input for the button label (what staff see on the home screen button)
- `#staffNotifLongMessage` — textarea for the long message (shown in the overlay when staff tap the button)
- Three action buttons: Publish, Clear, Re-push Existing Message

**Publish handler (lines 9378–9405):**
```javascript
async function publishStaffNotification() {
  const buttonLabel = document.getElementById('staffNotifButtonLabel').value.trim();
  const longMessage = document.getElementById('staffNotifLongMessage').value.trim();
  
  if (!buttonLabel && !longMessage) {
    alert('Please enter a button label or message');
    return;
  }
  
  const response = await fetch(`${API_BASE}/notifications/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buttonLabel, longMessage, publishedBy: 'Dashboard' })
  });
  // ...
}
```

**Processing:** None. Raw string values from the form inputs are JSON-stringified and POSTed. No sanitization, no link detection, no markdown processing. [VERIFIED — code inspection of lines 9378–9405]

---

## 2. Server Endpoint

**Location:** `server/src/server.ts`

**GET handler (lines 795–815):** `GET /api/notifications/staff`
```typescript
const row = db.prepare(
  'SELECT message, button_label, long_message, published_by, published_at, push_version FROM staff_notifications ORDER BY id DESC LIMIT 1'
).get();
// Returns: { message, buttonLabel, longMessage, publishedBy, publishedAt, pushVersion }
```

**POST handler (lines 818–852):** `POST /api/notifications/staff`
```typescript
const { message, buttonLabel, longMessage, publishedBy } = req.body;
if (hasContent) {
  db.prepare('INSERT INTO staff_notifications (message, button_label, long_message, published_by) VALUES (?, ?, ?, ?)').run(
    message?.trim() || '',
    buttonLabel?.trim() || null,
    longMessage?.trim() || null,
    publishedBy || 'Dashboard'
  );
}
```

**Storage:** SQLite table `staff_notifications`:
```sql
CREATE TABLE staff_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  button_label TEXT,
  long_message TEXT,
  push_version INTEGER DEFAULT 1
);
```

**Processing:** None. Server does `.trim()` only. No sanitization, no escaping, no link detection. Values stored as-is. [VERIFIED — code inspection of lines 818–852]

**Retrieval:** Staff app polls `GET /api/notifications/staff` (on load + every 60 seconds). The most recent row is returned.

---

## 3. Staff App Render Path (THE ANSWER)

**Location:** `staff-pwa/app.js` (identical in `staging-staff/app.js`)

**Load handler (lines 185–215):** `loadStaffNotification()`
```javascript
window._notifData = {
  label: result.data.buttonLabel || 'Info',
  message: result.data.longMessage || '',
  pushVersion: result.data.pushVersion || 1
};
```

**Render function (lines 236–245):** `showLongMessage()`
```javascript
function showLongMessage() {
  if (!window._notifData || !window._notifData.message) return;
  document.getElementById('longMessageOverlay').scrollTop = 0;
  document.getElementById('longMessageTitle').textContent = window._notifData.label;   // LINE 238
  document.getElementById('longMessageContent').textContent = window._notifData.message; // LINE 239
  document.getElementById('longMessageOverlay').style.display = 'block';
  // ...
}
```

**Overlay HTML (`staff-pwa/index.html`, lines 414–421):**
```html
<div id="longMessageOverlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; padding: 20px;">
  <div style="background: white; border-radius: 12px; max-width: 500px; margin: 40px auto; padding: 24px; position: relative;">
    <h3 id="longMessageTitle" style="margin: 0 0 16px; font-family: 'DM Sans', sans-serif; color: #C4753B;"></h3>
    <div id="longMessageContent" style="font-family: 'DM Sans', sans-serif; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap;"></div>
    <button onclick="closeLongMessage()" style="...">OK</button>
  </div>
</div>
```

### The definitive line is `app.js:239`:

```javascript
document.getElementById('longMessageContent').textContent = window._notifData.message;
```

**This uses `.textContent`, not `.innerHTML`.** [VERIFIED — identical in both staff-pwa/app.js:239 and staging-staff/app.js:239]

---

## 4. Answers

### 4a. Would a plain URL render as a clickable hotlink?

**No.** `.textContent` treats all input as literal text. A URL like `https://example.com` would display as the raw string `https://example.com` — visible but not clickable, not wrapped in an anchor tag, not linkified.

### 4b. Smallest change to make URLs clickable

Two options, in order of simplicity:

**Option 1 — Linkify function (recommended).** Add a small function that regex-detects URLs and wraps them in `<a>` tags, then switch the render to `.innerHTML` with the linkified output. Shape:

```javascript
function linkify(text) {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  // Escape HTML entities first to prevent XSS, then wrap URLs
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

// In showLongMessage():
document.getElementById('longMessageContent').innerHTML = linkify(window._notifData.message);
```

Key: the HTML-escape MUST happen before the URL wrapping to prevent XSS. The `white-space: pre-wrap` on the container already handles line breaks, so no further processing needed.

**Option 2 — Full innerHTML with anchor-only allowlist.** Use a sanitizer (DOMPurify or manual) that strips everything except `<a>` tags. This would let the dashboard compose HTML links directly. Heavier, and the dashboard textarea doesn't invite HTML authoring, so Option 1 is more natural.

### 4c. XSS consideration

The current code is **XSS-safe** because `.textContent` never parses HTML. If changed to `.innerHTML` (per Option 1), the linkify function MUST HTML-escape the message text before injecting URL anchors. Without that escape step, a dashboard user could inject arbitrary HTML/JS via the message field. Since the dashboard is admin-only and not publicly accessible, the practical risk is low, but the escape step costs one line and eliminates the vector entirely.

### Dashboard archive note

The dashboard notification archive (`loadNotifArchive()`, dashboard/index.html ~line 9470) uses `.innerHTML` with unsanitized `row.long_message` and `row.button_label` to build table cells. This is a separate XSS surface — an admin composing a message with HTML could affect their own dashboard view. Low practical risk (self-attack by admin), but worth noting for completeness.

---

## 5. Message Lifecycle

| Aspect | Behavior |
|--------|----------|
| **Persistence** | SQLite row lives until "Clear" is clicked (deletes ALL rows) or a new notification is published (old one remains as archive) |
| **Display trigger** | On app open + every 60s poll (`setInterval(loadStaffNotification, 60000)`) |
| **Show-once logic** | Hash of `message + '_v' + pushVersion` stored in `localStorage` as `notif_seen_hash`. If the hash matches, the overlay does NOT auto-show. |
| **Re-display** | Tapping the home-screen button always shows the overlay (regardless of seen-hash). The auto-popup is what's gated. |
| **Re-push** | Dashboard "Re-push" increments `push_version` → changes the hash → triggers auto-show again for all staff |
| **Clearing** | Dashboard "Clear" deletes all rows → next staff poll gets `message: null` → button hidden |

**For John's launch-intro use case:** The overlay auto-shows once per staff member per message version. After closing, the button remains visible on the home screen (staff can re-read by tapping it). Re-push forces it to auto-show again for everyone. This is well-suited for a one-time announcement — it won't nag.

---

## Summary

The push message renders via `.textContent` (staff-pwa/app.js:239). URLs display as plain text — visible but not clickable. A ~5-line linkify function switching to `.innerHTML` (with HTML-escaping before URL wrapping) would make URLs clickable. Current implementation is XSS-safe; any innerHTML switch must preserve that by escaping first.
