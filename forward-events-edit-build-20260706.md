# Forward Events Edit Build — 2026-07-07

## ES PUT Logic (present + null branches)

```typescript
// Conditional ES PUT — only if wp_post_id_es exists for this event
const esRow = getDatabase().prepare('SELECT wp_post_id_es FROM dashboard_events WHERE id = ?').get(eventId) as { wp_post_id_es: number | null } | undefined;
const wpPostIdEs = esRow?.wp_post_id_es;

if (wpPostIdEs) {
  // Re-translate 4 content fields EN→ES
  let esFields: Record<string, string> = {};
  try {
    esFields = await translateFieldsToSpanish({
      title: enFields.title,
      content: enFields.content,
      event_location_name: enFields.event_location_name,
      link_text: enFields.link_text,
    });
    console.log(`[Events] Re-translated ${Object.keys(esFields).length} fields EN→ES for edit`);
  } catch (translationError) {
    console.log(`[Events] EN→ES translation failed on edit, skipping ES update: ${(translationError as Error).message}`);
  }

  // PUT ES post with translated content (content-only, no pll_ calls)
  if (Object.keys(esFields).length > 0) {
    try {
      await updateWordPressEvent(wpPostIdEs, {
        title: esFields.title || enFields.title,
        content: esFields.content || enFields.content,
        event_date: enFields.event_date,
        event_time_start: enFields.event_time_start,
        event_time_end: enFields.event_time_end,
        event_location: enFields.event_location,
        event_location_name: esFields.event_location_name || enFields.event_location_name,
        event_type: enFields.event_type,
        photo_url: enFields.photo_url,
        link_url: enFields.link_url,
        link_text: esFields.link_text || enFields.link_text,
        contact_email: enFields.contact_email,
        contact_phone: enFields.contact_phone,
      });
      console.log(`[Events] ES post ${wpPostIdEs} updated`);
    } catch (esError) {
      console.log(`[Events] ES post update failed (EN update succeeded): ${(esError as Error).message}`);
    }
  }
} else {
  console.log(`[Events] no wp_post_id_es — skipping ES update; will be handled by backfill`);
}
```

### Branch analysis

| Branch | Condition | Behavior |
|--------|-----------|----------|
| ES PUT | `wpPostIdEs` is truthy (non-null, non-zero) | Translate 4 fields, PUT to `wp/v2/shelter-events/{wpPostIdEs}` | 
| Skip+log | `wpPostIdEs` is null/undefined | Logs `"no wp_post_id_es — skipping ES update; will be handled by backfill"`, no error |

Both branches present. [VERIFIED — code above]

### ES PUT target confirmation

The ES PUT calls `updateWordPressEvent(wpPostIdEs, ...)` — targets `wp_post_id_es` (the ES post ID), NOT `existing.wp_post_id` (the EN post ID). The EN PUT on line 3883 targets `existing.wp_post_id`. Two separate calls, two separate post IDs. [VERIFIED — code reads `wpPostIdEs` from `dashboard_events.wp_post_id_es`]

### ES PUT uses translated fields

The ES PUT body uses `esFields.title`, `esFields.content`, `esFields.event_location_name`, `esFields.link_text` — with EN fallback (`|| enFields.title` etc.) for any field the translator didn't return. Non-translatable meta fields (dates, location address, contact info, photo) pass through from EN unchanged. [VERIFIED]

## Translation-Failure Branch

```typescript
try {
  esFields = await translateFieldsToSpanish({ ... });
} catch (translationError) {
  console.log(`[Events] EN→ES translation failed on edit, skipping ES update: ${(translationError as Error).message}`);
}

// Only PUTs ES if translation produced results
if (Object.keys(esFields).length > 0) { ... }
```

If `translateFieldsToSpanish` throws, `esFields` remains `{}`, the `Object.keys` check is false, the ES PUT is skipped entirely. The EN PUT already completed above (line 3883). Result: EN-only update, no error. [VERIFIED — code structure]

## wp_post_id_es NOT modified

This path only reads `wp_post_id_es` (SELECT). No UPDATE/INSERT to `wp_post_id_es` anywhere in the edit handler. [VERIFIED — grep confirms no wp_post_id_es write in the PUT block]

## tsc Build

```
$ npm run build
> shelter-apps@2.0.0 build
> tsc
(exit 0, no errors)
```

[VERIFIED — clean build, zero errors]

## Service Status

```
$ systemctl is-active shelter-app.service
active
```

[VERIFIED]

## Commit

`9ca113c` — `server/src/server.ts` (1 file, 64 insertions, 15 deletions).
