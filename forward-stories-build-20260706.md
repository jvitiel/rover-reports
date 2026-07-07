# Forward Stories Create+Edit Build — 2026-07-07

## Part A — createWordPressStory (CREATE path)

### Translation step

Translates 3 fields EN→ES before payload assembly: `title`, `content` (story_text), `link_text`. Wrapped in try/catch — failure logs and pushes EN-only. [VERIFIED — tsc clean, dry test successful]

### Payload assembly

EN fields unchanged. 3 `_es` fields appended at top level if translation succeeded: `title_es`, `content_es`, `link_text_es`. These sit alongside the standard `title`/`content`/`status`/`meta` structure — WP hook reads them; standard WP REST ignores unknown top-level params on the EN post. [VERIFIED — dry test payload below]

### Return type

Changed from `Promise<number>` to `Promise<{ post_id: number; es_post_id?: number }>`.

### es_post_id read + store

```typescript
const postData = await response.json() as { id: number; es_post_id?: number };

if (postData.es_post_id) {
  console.log(`[Stories] ES post created and linked: ${postData.es_post_id}`);
} else {
  console.log(`[Stories] es_post_id not returned — WP story ES hook not yet live`);
}

return { post_id: postData.id, es_post_id: postData.es_post_id };
```

Caller stores via direct UPDATE:

```typescript
if (wpPostIdEs && story) {
  const db = getDatabase();
  db.prepare('UPDATE dashboard_stories SET wp_post_id_es = ? WHERE id = ?').run(wpPostIdEs, story.id);
  console.log(`[Stories] Stored wp_post_id_es=${wpPostIdEs} for story #${story.id}`);
}
```

Absent branch: logs info line, proceeds normally, no error. [VERIFIED — code structure]

### Translation-failure branch

```typescript
try {
  esFields = await translateFieldsToSpanish({ title, content, link_text });
} catch (translationError) {
  console.log(`[Stories] EN→ES translation failed, pushing EN-only: ${...}`);
}
```

If translation throws, `esFields` remains `{}`, no `_es` fields attached. EN story creates normally. [VERIFIED]

## Part B — updateWordPressStory caller (EDIT path)

### ES PUT logic (present + null branches)

```typescript
const esRow = getDatabase().prepare('SELECT wp_post_id_es FROM dashboard_stories WHERE id = ?').get(storyId) as { wp_post_id_es: number | null } | undefined;
const wpPostIdEs = esRow?.wp_post_id_es;

if (wpPostIdEs) {
  // Re-translate 3 content fields EN→ES
  let esFields = await translateFieldsToSpanish({ title, content, link_text });
  // PUT ES story with translated content
  await updateWordPressStory(wpPostIdEs, {
    title: esFields.title || enStoryFields.title,
    content: esFields.content || enStoryFields.content,
    // ... non-translatable fields pass through from EN
    link_text: esFields.link_text || enStoryFields.link_text,
  });
  console.log(`[Stories] ES post ${wpPostIdEs} updated`);
} else {
  console.log(`[Stories] no wp_post_id_es — skipping ES update; backfill will handle`);
}
```

ES PUT targets `wpPostIdEs` (the ES post ID from `dashboard_stories.wp_post_id_es`), NOT `existing.wp_post_id` (the EN post ID). EN PUT on the line above targets `existing.wp_post_id` separately. [VERIFIED]

Translation-failure on edit: `esFields` remains `{}`, `Object.keys` check is false, ES PUT skipped. EN PUT already completed. [VERIFIED]

`wp_post_id_es` is read-only in this path (SELECT only, no UPDATE). [VERIFIED]

## Dry Assembly Test — Assembled Payload

```json
{
  "title": "Lucky Finds His Forever Home",
  "content": "After spending 6 months at the shelter, Lucky finally found his forever family. The Johnsons fell in love with his gentle nature and playful spirit.",
  "status": "publish",
  "meta": {
    "story_date": "2026-06-15",
    "story_type": "adoption",
    "animal_name": "Lucky",
    "animal_species": "Dog",
    "animal_breed": "Labrador Mix",
    "link_url": "https://example.com",
    "link_text": "Read More",
    "photo_1_url": "https://example.com/photo1.jpg",
    "photo_2_url": "",
    "photo_layout": "left"
  },
  "title_es": "Lucky Encuentra Su Hogar Para Siempre",
  "content_es": "Después de pasar 6 meses en el refugio, Lucky finalmente encontró su familia para siempre. Los Johnson se enamoraron de su naturaleza gentil y su espíritu juguetón.",
  "link_text_es": "Leer Más"
}
```

All 3 `_es` fields present with plausible Spanish. [VERIFIED — dry run output]

## tsc Build

```
$ npm run build
> shelter-apps@2.0.0 build
> tsc
(exit 0, no errors)
```

[VERIFIED]

## Service Status

```
$ systemctl is-active shelter-app.service
active
```

[VERIFIED]

## Commit

`2893aa4` — `server/src/server.ts` (1 file, 106 insertions, 23 deletions).
