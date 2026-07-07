# Story + Event Edit Behavior — 2026-07-07

## Stories: UPDATE in place ✓

### Edit path (PUT /api/stories/:id, server.ts:3397)

```typescript
if (existing.wp_post_id) {
  await updateWordPressStory(existing.wp_post_id, {
    title: req.body.title || existing.title,
    content: req.body.story_text || existing.story_text,
    // ... all fields
  });
}
```

The handler looks up the existing story by local DB id, checks `existing.wp_post_id`, and calls `updateWordPressStory(existing.wp_post_id, ...)` which sends a `PUT` to `wp/v2/shelter-stories/{wpPostId}`. **Updates in place, does not create duplicates.** [VERIFIED — server.ts:3438–3449]

### WP post ID storage

Column: `dashboard_stories.wp_post_id INTEGER` [VERIFIED — `.schema dashboard_stories`]

- 11 rows have `wp_post_id` set (all published stories) [VERIFIED]
- 0 rows have NULL `wp_post_id` [VERIFIED]

---

## Events: UPDATE in place ✓

### Edit path (PUT /api/events/:id, server.ts:3799)

```typescript
if (existing.wp_post_id) {
  try {
    await updateWordPressEvent(existing.wp_post_id, {
      title: req.body.title || existing.title,
      content: req.body.description || existing.description,
      // ... all fields
    });
  } catch (wpError) {
    console.log(`[Events] WordPress update failed: ${(wpError as Error).message}`);
    wpSyncFailed = true;
  }
}
```

Same pattern: looks up `existing.wp_post_id`, calls `updateWordPressEvent(existing.wp_post_id, ...)` which sends a `PUT` to `wp/v2/shelter-events/{wpPostId}`. **Updates in place, does not create duplicates.** The event update path also has error tolerance — WP sync failure doesn't block the local DB update (sets `wpSyncFailed` flag, returns `wp_synced: false` in response). [VERIFIED — server.ts:3829–3849]

### WP post ID storage

Column: `dashboard_events.wp_post_id INTEGER` [VERIFIED — `.schema dashboard_events`]

- 12 rows have `wp_post_id` set [VERIFIED]
- 8 rows have NULL `wp_post_id` (draft events never pushed to WP) [VERIFIED]

---

## Summary

| Type | Edit behavior | WP ID column | Populated | Duplicate-on-edit issue? |
|------|--------------|--------------|-----------|------------------------|
| Stories | **Update in place** via `PUT wp/v2/shelter-stories/{id}` | `wp_post_id` | 11/11 (100%) | **No** |
| Events | **Update in place** via `PUT wp/v2/shelter-events/{id}` | `wp_post_id` | 12/20 (60%, rest are drafts) | **No** |

Both pipelines use the same pattern: local DB stores `wp_post_id`, edit handler checks it, sends UPDATE to existing WP post. No duplicate-on-edit issue for either type. Safe to build ES translation on top of this. [VERIFIED]

### ES implication for edits

When ES translation is added, edits will need to also update the ES WP post. This means the local DB will need a `wp_post_id_es` column (or equivalent) to track the ES post ID, and the edit handler will need to: (a) re-translate the changed text fields, and (b) call `updateWordPressStory/Event(wp_post_id_es, ...)` with the translated content. The update-in-place pattern already works — it just needs to run twice (once EN, once ES). [INFERRED]
