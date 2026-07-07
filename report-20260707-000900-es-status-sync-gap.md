# ES Status-Sync Gap Diagnosis

## 1. Status-Change Path (Stories)

`DELETE /api/stories/:id` (server.ts:3610-3638) is the unpublish handler. It is a **SEPARATE** path from `updateWordPressStory` — it calls `setWordPressStoryToDraft()` directly.

```typescript
// DELETE /api/stories/:id - Unpublish/delete a story
app.delete('/api/stories/:id', async (req, res) => {
  const story = getStoryById(storyId);
  if (story.wp_post_id) {
    await setWordPressStoryToDraft(story.wp_post_id);  // ← EN only
  }
  const success = deleteStory(storyId);                // ← local DB
  res.json({ success });
});
```

`setWordPressStoryToDraft()` (server.ts:3304-3318) sends a single PUT to the EN post:

```typescript
async function setWordPressStoryToDraft(wpPostId: number): Promise<void> {
  await fetch(`https://johnv80.sg-host.com/wp-json/wp/v2/shelter-stories/${wpPostId}`, {
    method: 'PUT',
    headers: { 'Authorization': getWpAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'draft' }),
  });
}
```

## 2. What It Sends to WP (and the Gap)

- **To EN post:** `{ status: 'draft' }` via WP REST PUT [VERIFIED]
- **To ES post:** Nothing. The function takes a single `wpPostId` parameter. The handler passes only `story.wp_post_id`. There is no lookup of `wp_post_id_es` anywhere in the DELETE handler or in `setWordPressStoryToDraft`. [VERIFIED — grep of all `wp_post_id_es` references confirms it never appears in the status-change path]

**Root cause:** The unpublish path was written before ES posts existed. It sets the EN WP post to draft and updates the local DB, but has zero awareness of `wp_post_id_es`.

## 3. Content-Edit Path Contrast (PUT /api/stories/:id)

`updateWordPressStory()` (server.ts:3257-3301) **does** accept and send `status`:

```typescript
body: JSON.stringify({
  title: story.title,
  content: story.content,
  status: story.status || 'publish',   // ← defaults to 'publish'
  meta: { ... },
})
```

However, the PUT handler (server.ts:3433-3540) **never passes `status`** in the `enStoryFields` object it builds — it only passes content fields (title, content, story_date, story_type, animal_name, etc.). Since `status` is omitted, `updateWordPressStory` defaults it to `'publish'`.

So even if a status change *did* somehow route through the content-edit path, the ES `updateWordPressStory` call would also default to `status: 'publish'` — it wouldn't propagate a draft status.

The content-edit path (PUT) handles ES updates for **content** fields only. It was never designed to handle status changes.

## 4. The Stray Post

Dashboard row for "Test story" (id=16):
- `wp_post_id` = 448, `wp_post_id_es` = 480, local `status` = draft [VERIFIED via sqlite3]

WordPress post statuses:
- **EN post 448:** `status: "draft"` [VERIFIED — authenticated WP REST GET returns `{"id":448,"status":"draft","title":{"rendered":"Test story"}}`]
- **ES post 480:** `status: "publish"` [VERIFIED — unauthenticated WP REST GET returns `{"id":480,"status":"publish","title":{"rendered":"Historia de prueba"}}`]

The ES post is live and publicly visible. The EN post is hidden (returns 401 to unauthenticated requests, "draft" to authenticated). Confirmed gap.

## 5. Events Scope — Same Gap

Events have **two** status-change paths, both with the identical gap:

### Cancel (POST /api/events/:id/cancel, server.ts:4055-4085)
```typescript
if (event.wp_post_id) {
  await setWordPressEventToDraft(event.wp_post_id);  // ← EN only
}
const success = cancelEvent(eventId);
```

### Delete (DELETE /api/events/:id, server.ts:4087-4115)
```typescript
if (event.wp_post_id) {
  await deleteWordPressEvent(event.wp_post_id);  // ← EN only, trashes the post
}
const success = permanentlyDeleteEvent(eventId);
```

`setWordPressEventToDraft()` (server.ts:3768-3782) sends `{ status: 'draft' }` to only `wp_post_id`.
`deleteWordPressEvent()` (server.ts:3788-3800) sends DELETE to only `wp_post_id`.

Neither function looks up or touches `wp_post_id_es`. [VERIFIED — grep confirms `wp_post_id_es` never appears in cancel, delete, setToDraft, or deleteWordPress paths]

**The event status-sync gap is structurally identical to stories.** Cancelling or deleting an event would strand its ES post as published.

## Summary

| Path | EN post | ES post | Gap? |
|------|---------|---------|------|
| Story unpublish (DELETE) | → draft | untouched | **YES** |
| Story content edit (PUT) | → content update (status defaults to 'publish') | → content update (status defaults to 'publish') | N/A (no status change) |
| Event cancel (POST cancel) | → draft | untouched | **YES** |
| Event delete (DELETE) | → trash | untouched | **YES** |
| Event content edit (PUT) | → content update | → content update | N/A |

Three status-change handlers need ES-post awareness added. The content-edit paths already handle ES correctly for content but were not designed for status changes.
