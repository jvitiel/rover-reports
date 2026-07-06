# Events vs Stories ES Diagnosis — 2026-07-06

## 1) Stories ES Pattern — Dashboard Side

The Stories push code (`createWordPressStory`, server.ts lines 3181–3227) sends a **single EN-only POST** to the WP REST API (`wp/v2/shelter-stories`). It pushes: title, content, status, and 10 meta fields (story_date, story_type, animal_name, animal_species, animal_breed, link_url, link_text, photo_1_url, photo_2_url, photo_layout).

**There is NO Spanish handling on the dashboard side for Stories.** No ES title/content in the payload, no machine translation call, no second POST for an ES version, no `lang` parameter, no translation-linking signal. The push creates a single EN post and is done. [VERIFIED — `createWordPressStory` function quoted from server.ts lines 3181–3227]

```typescript
async function createWordPressStory(story: { ... }): Promise<number> {
  const response = await fetch('https://johnv80.sg-host.com/wp-json/wp/v2/shelter-stories', {
    method: 'POST',
    headers: {
      'Authorization': getWpAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: story.title,
      content: story.content,
      status: 'publish',
      meta: {
        story_date: story.story_date || '',
        story_type: story.story_type || 'adoption',
        // ... 8 more meta fields, all EN-only
      },
    }),
  });
  // returns post ID
}
```

## 2) Stories ES Pattern — WP Side

**There is NO automatic ES translation handling on the WP side for Stories either.**

Searched the entire WordPress installation for `pll_set_post_language` and `pll_save_post_translations`:

- `functions.php`: **zero** matches [VERIFIED — `grep -n 'pll_set_post_language\|pll_save_post_translations' functions.php` returned empty]
- All theme PHP files: **zero** matches [VERIFIED — recursive grep on entire `4lg-theme/` directory]
- All plugins (excluding Polylang's own code): **zero** matches [VERIFIED — recursive grep on `wp-content/plugins/`]
- `mu-plugins/`: **zero** matches [VERIFIED — recursive grep]

There is no `save_post` hook, `rest_after_insert` hook, or any other mechanism that auto-creates ES translations when a shelter_story or shelter_event post is created. [VERIFIED]

### How ES Stories Actually Exist

The 5 ES story translations (IDs 361–365) were **manually created in WP admin** using Polylang's "Add translation" UI. Evidence:

| Fact | Data | Source |
|------|------|--------|
| ES stories NOT in dashboard_stories | IDs 361–365 absent from table | [VERIFIED — `SELECT * FROM dashboard_stories`] |
| All author=1 (admin) | Not author=4 (dashboard-push service account) | [VERIFIED — `get_post` per ID] |
| Identical post_date as EN counterparts | EN 223 + ES 365 both `2026-03-16 03:47:39`, etc. | [VERIFIED — all 5 pairs checked] |
| Consecutive IDs 361–366 | Created in one batch session (5 stories + 1 event) | [VERIFIED] |
| All modified on 2026-05-24 19:XX | Batch re-edit session | [VERIFIED] |

The EN stories were dashboard-pushed (they ARE in dashboard_stories with wp_post_ids). Then someone (using the admin account, user 1) created ES translations manually in WP admin's Polylang interface for all 5 stories and 1 event in a separate session. [INFERRED — high confidence from the consecutive IDs and identical dates]

## 3) Events vs Stories — THE DIFF

### Dashboard push code comparison

| Aspect | Stories (`createWordPressStory`) | Events (`createWordPressEvent`) |
|--------|--------------------------------|-------------------------------|
| Endpoint | `wp/v2/shelter-stories` (WP REST) | `4lg/v1/push-event` (custom) |
| ES title/content | None | None |
| `lang` parameter | None | None |
| Translation linking | None | None |
| Machine translation | None | None |
| Second ES POST | None | None |

**Dashboard side: Stories and Events are identical in their lack of ES handling.** Both push a single EN-only post. [VERIFIED]

### WP-side handler comparison

| Aspect | Stories | Events (`flg_handle_event_push`) |
|--------|---------|-------------------------------|
| `pll_set_post_language()` | **Not called** | **Not called** |
| `pll_save_post_translations()` | **Not called** | **Not called** |
| Auto-translation hook | **None** | **None** |
| `save_post` / `rest_after_insert` hook for ES | **None** | **None** |

**WP side: Stories and Events are also identical in their lack of ES handling.** [VERIFIED]

### The actual difference

The difference is **not in the code** — it's in the **data**. Stories have ES translations because someone manually created them in WP admin (5 ES posts, IDs 361–365). Events have only 1 ES translation (ID 366, also manually created in the same session). No new ES translations have been created for any content since that batch session (the ES posts were created between 2026-03-16 and 2026-05-04, then batch-edited on 2026-05-24).

Neither pipeline — Stories nor Events — has any automated ES translation capability. The "working" ES stories are artifacts of a one-time manual translation effort, not evidence of a working pipeline. [VERIFIED — zero Polylang automation code exists anywhere in the codebase]

## 4) Push Identity

The push authenticates as `secrets.wordpress.username` via HTTP Basic auth (server.ts line 369):

```typescript
wpAuthHeader = 'Basic ' + Buffer.from(`${secrets.wordpress.username}:${secrets.wordpress.appPassword}`).toString('base64');
```

**Recent pushed posts (events 437, 438, 440, event 371) have author=4** (`dashboard-push`, user_registered `2026-05-23 21:39:54`). [VERIFIED]

**Older pushed posts (stories 223–291, event 323) have author=1** (admin, `flgnynjai@gmail.com`). [VERIFIED]

The push credentials were changed from admin (user 1) to the `dashboard-push` service account (user 4) on or around **2026-05-23**. Before that date, all pushes authenticated as admin. [INFERRED — the switchover date matches user 4's registration date]

**Conclusion:** `author=1` on posts 323 and 361–366 does NOT distinguish "dashboard-pushed" from "hand-made in WP admin" — both used the same admin account before 2026-05-23. However, the dashboard_events/dashboard_stories tables DO distinguish: post 323 IS in dashboard_events (dashboard-pushed), while posts 361–366 are NOT in either table (manually created in WP admin). [VERIFIED]

## 5) Full ES Event Census

| ID | Title | Author | Created | Modified | event_date | Status | EN Counterpart |
|----|-------|--------|---------|----------|------------|--------|----------------|
| 366 | Orientación para Voluntarios | 1 (admin) | 2026-05-04 00:30:08 | 2026-05-24 19:26:52 | 2026-05-31 | publish | 323 |

**Total ES events: 1** [VERIFIED — `get_posts` with `lang=es`, `post_type=shelter_event`, `posts_per_page=-1`]

Dashboard record: **None** — ID 366 is NOT in `dashboard_events`. [VERIFIED]

EN counterpart 323 IS in dashboard_events (row 19, wp_post_id=323, title "Volunteer Orientaton"). [VERIFIED]

Newest ES event created: **2026-05-04**. No ES events since. This is not a "cluster-then-nothing regression" — it's one manual creation that was never repeated. [VERIFIED]

## 6) Polylang Edition

**Polylang 3.8.4 (standard, not Pro)** [VERIFIED — `wp plugin list` shows `polylang 3.8.4 active`]

Polylang standard does NOT support setting post language via the WP REST API's query parameters. The `lang` parameter in REST is a **Polylang Pro** feature. With standard Polylang, language must be set programmatically via `pll_set_post_language()` in PHP after post creation. [INFERRED — based on Polylang documentation; the absence of REST language-setting in standard is well-documented]

This means:
- The dashboard-side push (Node/REST) **cannot** set language directly via REST parameters (would need Pro).
- The WP-side handler (`flg_handle_event_push` in functions.php) **could** call `pll_set_post_language()` + `pll_save_post_translations()` after `wp_insert_post` — this is the correct place to add ES handling with Polylang standard. But it currently doesn't. [VERIFIED]

## Summary

| Question | Answer |
|----------|--------|
| How do Stories get ES translations? | **Manually created in WP admin** — not automated |
| Does Stories code do anything Events doesn't? | **No** — both push EN-only, neither has Polylang automation |
| Is there a regression? | **No** — ES translation was NEVER automated for either pipeline |
| Why do ES stories render and ES events don't? | **Data difference only** — 5 ES story posts exist (manual), only 1 ES event exists (manual, past-dated) |
| What's needed to automate ES events? | Add `pll_set_post_language('en')` on the new EN post + create a second ES post + `pll_save_post_translations()` in the WP-side `flg_handle_event_push()` handler. Dashboard would also need to supply ES title/content (manual entry or machine translation). Same gap exists for Stories. |
| Can it be done via REST alone? | **No** — Polylang standard (not Pro) requires PHP-side `pll_` calls |
