# ES Stories + Events Scoping Diagnosis — 2026-07-07

## 1) Push Payload — Text Fields Needing Translation

### Events (`createWordPressEvent`, server.ts:3557)

| Field | Type | Needs Translation? |
|-------|------|-------------------|
| `title` | string | **YES** — user-facing event name |
| `content` | string | **YES** — event description body |
| `event_location_name` | string | **YES** — e.g. "RG Cares Animal Shelter" |
| `event_location` | string | No — street address, keep verbatim |
| `link_text` | string | **YES** — e.g. "Learn More" → "Más Información" |
| `event_date` | string | No — date value |
| `event_time_start/end` | string | No — time value |
| `event_type` | string | No — enum slug |
| `photo_url` | string | No — URL, shared across translations |
| `link_url` | string | No — URL, shared |
| `contact_email` | string | No — shared |
| `contact_phone` | string | No — shared |

**4 fields need translation, 9 pass through unchanged.** [VERIFIED — field list from server.ts:3557–3602]

### Stories (`createWordPressStory`, server.ts:3181)

| Field | Type | Needs Translation? |
|-------|------|-------------------|
| `title` | string | **YES** — story headline |
| `content` | string | **YES** — story body text |
| `link_text` | string | **YES** — button/link label |
| `animal_name` | string | No — proper noun |
| `animal_species` | string | **MAYBE** — "Cat"→"Gato" (but used as meta, not rendered directly in template) |
| `animal_breed` | string | No — breed name, keep verbatim |
| `story_date` | string | No — date value |
| `story_type` | string | No — enum slug |
| `link_url` | string | No — URL, shared |
| `photo_1_url` | string | No — URL, shared |
| `photo_2_url` | string | No — URL, shared |
| `photo_layout` | string | No — enum |

**3 fields need translation (title, content, link_text), 1 borderline (animal_species).** [VERIFIED — field list from server.ts:3181–3227]

## 2) WP Endpoint + Handler

### Events

- **Dashboard endpoint:** `POST https://johnv80.sg-host.com/wp-json/4lg/v1/push-event` [VERIFIED — server.ts:3574]
- **WP handler:** `flg_handle_event_push()` at functions.php:1177 [VERIFIED — `register_rest_route` at line 1152, callback at line 1154]
- **Handler type:** Custom REST route with PHP callback — **natural insertion point** for `pll_set_post_language()` + `pll_save_post_translations()`. The handler already calls `wp_insert_post()` and returns the post ID. Adding Polylang calls after the `wp_insert_post` + meta update block is straightforward. [VERIFIED]

### Stories

- **Dashboard endpoint:** `POST https://johnv80.sg-host.com/wp-json/wp/v2/shelter-stories` [VERIFIED — server.ts:3195]
- **WP handler:** **Standard WP REST API** — no custom handler, no hooks. [VERIFIED — `grep` for `rest_after_insert_shelter_story`, `save_post_shelter_story`, `flg_handle_story`, `push-story` in functions.php returned **zero** matches]
- **Impact:** A WP-side handler/hook **must be added** for stories. Options:
  - (a) Add a `rest_after_insert_shelter_story` action hook in functions.php (fires after WP REST creates the post)
  - (b) Create a custom `4lg/v1/push-story` endpoint (like events) and route the dashboard through it
  - (c) Add a `save_post_shelter_story` hook (fires on any save, not just REST — needs guard)

  **Stories is a larger WP-side lift than events** because there's no existing custom handler to extend. [VERIFIED]

## 3) Translation Infrastructure

### Existing: `translateBioToSpanish()` (attributeParser.ts:429)

```typescript
export async function translateBioToSpanish(bioEn: string, _size: 'long' | 'short' = 'long'): Promise<string> {
  const client = getOpenAI();   // reads secrets.openai.apiKey from shelter-secrets.json
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a translator. Output only the Spanish translation, nothing else.' },
      { role: 'user', content: bioEn },
    ],
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content?.trim();
}
```

[VERIFIED — function at attributeParser.ts:429–451]

**Already callable from the push path:** Both event and story push handlers run in the same Node server process that calls `translateBioToSpanish()` hundreds of times daily for animal bios. The OpenAI client (`getOpenAI()`) is a singleton that reads from `shelter-secrets.json`. No additional auth or infra needed. [VERIFIED — same `import` at server.ts:70]

**Cost/latency estimate:**
- Model: GPT-4o (not mini)
- Typical story/event content: ~50–200 words (much smaller than animal bios)
- Estimated latency: 1–3 seconds per translation call
- Estimated cost: ~$0.005–0.02 per event/story (input+output tokens at GPT-4o rates)
- Per push: 3–4 fields → 3–4 serial calls or 1 batched call with structured output
[INFERRED — based on GPT-4o pricing and typical content length]

**Current state:** No content is currently translated at push time for stories or events. The translation infra exists for bios only. It would need a wrapper (translate multiple named fields in one call) rather than the single-text-in/single-text-out `translateBioToSpanish()`. [VERIFIED]

Also available: `translateApplicationFields()` (attributeParser.ts:462) — translates a `Record<string, string>` of named fields in one GPT-4o call with JSON response format. This is closer to what's needed for multi-field event/story translation. [VERIFIED — function at attributeParser.ts:459–520]

## 4) Storage Schemas

### dashboard_stories

```sql
CREATE TABLE dashboard_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wp_post_id INTEGER,
  title TEXT NOT NULL,
  story_date TEXT,
  story_type TEXT DEFAULT 'adoption',
  animal_name TEXT, animal_species TEXT, animal_breed TEXT,
  story_text TEXT,
  link_url TEXT, link_text TEXT,
  photo_1_url TEXT, photo_2_url TEXT, photo_layout TEXT DEFAULT 'left',
  featured_on_homepage INTEGER DEFAULT 0, featured_at TEXT,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'published'
);
```

**No ES fields.** No `title_es`, `story_text_es`, or any `_es` column. [VERIFIED]

### dashboard_events

```sql
CREATE TABLE dashboard_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wp_post_id INTEGER,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time_start TEXT, event_time_end TEXT,
  event_location TEXT, event_location_name TEXT,
  event_type TEXT DEFAULT 'other',
  description TEXT,
  photo_url TEXT,
  link_url TEXT, link_text TEXT,
  contact_email TEXT, contact_phone TEXT,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'published'
);
```

**No ES fields.** No `wp_post_id_es` or any `_es` column. [VERIFIED]

**Schema change assessment:** If ES translation is done at push time (translate → push EN + ES posts → store both WP post IDs), the only schema addition would be `wp_post_id_es INTEGER` on both tables to track the ES WP post. The translated text itself lives only in the WP ES post, not in the local DB. Zero schema change needed for the translated content. [INFERRED]

## 5) Target Polylang Linkage Structure

Inspected via `wp_get_object_terms()` on the existing correctly-linked ES posts:

### Event 366 (ES) ↔ Event 323 (EN)

| Layer | Taxonomy | Term Slug | Term ID | Description |
|-------|----------|-----------|---------|-------------|
| Language | `language` | `es` | 6 | — |
| Translation group | `post_translations` | `pll_6a1350b48b0fc` | 23 | `a:2:{s:2:"es";i:366;s:2:"en";i:323;}` |

EN counterpart (323) has the **same** `post_translations` term (term_id=23), with `language` term `en` (term_id=3). [VERIFIED]

### Story 361 (ES) ↔ Story 291 (EN)

| Layer | Taxonomy | Term Slug | Term ID | Description |
|-------|----------|-----------|---------|-------------|
| Language | `language` | `es` | 6 | — |
| Translation group | `post_translations` | `pll_6a134acecbac5` | 18 | `a:2:{s:2:"es";i:361;s:2:"en";i:291;}` |

[VERIFIED — `wp_get_object_terms` for both taxonomies on all 4 posts]

### What the automated path must reproduce

1. Create the ES WP post (`wp_insert_post` with translated title/content/meta)
2. Call `pll_set_post_language($en_post_id, 'en')` — assign EN language to the original post (may already be set by Polylang's default-language behavior, but explicit is safer)
3. Call `pll_set_post_language($es_post_id, 'es')` — assign ES language to the new post
4. Call `pll_save_post_translations(['en' => $en_post_id, 'es' => $es_post_id])` — creates a `post_translations` taxonomy term linking the pair

Steps 2–4 are PHP-side only (cannot be done via REST with Polylang standard). [VERIFIED]

### Available language terms

| Slug | Term ID | Name |
|------|---------|------|
| `en` | 3 | English |
| `es` | 6 | Español |

[VERIFIED — `get_terms(taxonomy=language)`]

## 6) Polylang Edition

**Polylang 3.8.4, standard edition (not Pro).** [VERIFIED — `wp plugin list` + `class_exists('PLL_Pro')` returns `false`]

Polylang standard does NOT support setting post language via the WP REST API. The REST `lang` parameter is Pro-only. Language assignment and translation linking MUST use PHP-side functions:

- `pll_set_post_language(int $post_id, string $lang_slug)` — sets the `language` taxonomy term
- `pll_save_post_translations(array $translations)` — creates/updates the `post_translations` taxonomy term linking EN↔ES posts

Both functions require: post IDs (ints) and language slugs (`'en'`, `'es'`). Both posts must exist before `pll_save_post_translations` is called. [VERIFIED]
