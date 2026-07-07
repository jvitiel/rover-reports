# ES Status-Sync Fix — Story Unpublish + Event Cancel + Event Delete

## Per-Handler Changes

### 1. Story Unpublish (DELETE /api/stories/:id)

**EN action:** `setWordPressStoryToDraft(story.wp_post_id)` → PUT `{ status: 'draft' }` to `/wp-json/wp/v2/shelter-stories/{id}` [VERIFIED — unchanged]

**Added ES branch (server.ts ~line 3627):**
```typescript
const esRow = getDatabase().prepare('SELECT wp_post_id_es FROM dashboard_stories WHERE id = ?').get(storyId);
const wpPostIdEs = esRow?.wp_post_id_es;
if (wpPostIdEs) {
  try {
    await setWordPressStoryToDraft(wpPostIdEs);  // same function, same REST call
    console.log(`[Stories] ES post ${wpPostIdEs} set to draft (mirroring EN unpublish)`);
  } catch (esError) {
    console.error(`[Stories] Failed to draft ES post ${wpPostIdEs}: ${(esError as Error).message}`);
  }
} else {
  console.log(`[Stories] no wp_post_id_es — no ES post to sync`);
}
```
[VERIFIED — code added, tsc clean]

### 2. Event Cancel (POST /api/events/:id/cancel)

**EN action:** `setWordPressEventToDraft(event.wp_post_id)` → POST `{ status: 'draft' }` to `/wp-json/wp/v2/shelter-events/{id}` [VERIFIED — unchanged]

**Added ES branch (server.ts ~line 4088):** Identical pattern — reads `wp_post_id_es` from `dashboard_events`, calls `setWordPressEventToDraft(wpPostIdEs)` if present, logs skip if null. [VERIFIED-code — NOT runtime-proven]

### 3. Event Delete (DELETE /api/events/:id)

**EN action:** `deleteWordPressEvent(event.wp_post_id)` → DELETE `/wp-json/wp/v2/shelter-events/{id}` (trash, not force-delete) [VERIFIED — unchanged]

**Added ES branch (server.ts ~line 4136):** Identical pattern — reads `wp_post_id_es` from `dashboard_events`, calls `deleteWordPressEvent(wpPostIdEs)` if present, logs skip if null. [VERIFIED-code — NOT runtime-proven]

## Live Smoke Test — Story Unpublish

### Created disposable story
- Title: `ZZSTATUS-TEST 1783398061`
- Dashboard ID: 18
- EN WP post: 481, ES WP post: 482
- Both confirmed `status: "publish"` via authenticated GET [VERIFIED]

### Unpublished via DELETE /api/stories/18
- Response: `{"success":true}`
- EN post 481 status after: `draft` [VERIFIED — authenticated GET]
- ES post 482 status after: `draft` [VERIFIED — authenticated GET]

**The fix works: unpublishing a story now drafts both the EN and ES WP posts.**

### Cleanup
- EN 481: trashed via WP REST DELETE [VERIFIED — `{"id":481,"status":"trash"}`]
- ES 482: trashed via WP REST DELETE [VERIFIED — `{"id":482,"status":"trash"}`]
- Dashboard row 18: deleted from `dashboard_stories` [VERIFIED]
- Zero `ZZSTATUS-TEST` rows remaining in dashboard [VERIFIED]
- Zero `ZZSTATUS-TEST` publish/draft posts remaining in WP [VERIFIED — search returns `[]`]

## Structural Verification

- **tsc build:** clean, zero errors [VERIFIED]
- **No schema change:** zero ALTER statements in diff [VERIFIED]
- **Content-edit paths untouched:** zero references to `updateWordPressStory`, `updateWordPressEvent`, or `translateFieldsToSpanish` in diff [VERIFIED]
- **Create/backfill untouched:** diff touches only the three status handlers [VERIFIED]
- **EN behavior unchanged:** existing EN actions are left in place; ES branch runs after, best-effort [VERIFIED]

## Commit

```
6a0e059 Propagate EN->ES post status: story unpublish + event cancel + event delete
        now mirror the status action to the linked ES post (wp_post_id_es);
        graceful when null, best-effort, EN behavior unchanged
```
File: `server/src/server.ts` — 45 insertions, 3 deletions (whitespace normalization).
