# Events ES Regression Diagnosis — 2026-07-06

## First Fork: Origin of Event 366

### WP REST data for post 366

| Field | Value |
|-------|-------|
| ID | 366 |
| post_title | Orientación para Voluntarios |
| post_author | **1** (Four Legs Good — admin account) |
| post_date | 2026-05-04 00:30:08 |
| post_modified | 2026-05-24 19:26:52 |
| post_status | publish |
| post_type | shelter_event |
| Polylang language | **es** |
| Polylang translations | `{en: 323, es: 366}` |
| EN counterpart | ID 323 — "Volunteer Orientaton" (note typo), same event_date 2026-05-31 |

[VERIFIED — `wp post get 366`, `wp post meta list 366`, `wp eval 'pll_get_post_translations(366)'`]

### WP REST data for post 323 (EN counterpart)

| Field | Value |
|-------|-------|
| ID | 323 |
| post_author | **1** (admin) |
| post_date | **2026-05-04 00:30:08** (identical to 366) |
| post_modified | 2026-05-04 00:34:00 |
| Polylang language | en |
| Polylang translations | `{en: 323, es: 366}` |

[VERIFIED — `wp post get 323`, `wp eval 'pll_get_post_translations(323)'`]

### Dashboard record of 366

The `dashboard_events` table has **no row for post 366**. [VERIFIED — `SELECT * FROM dashboard_events` shows no wp_post_id=366]

Post 323 IS in `dashboard_events` (row 19, wp_post_id=323). [VERIFIED]

The `dashboard_events` schema has **no `wp_post_id_es` column** and no language field of any kind. [VERIFIED — `.schema dashboard_events`]

### Author analysis

| Post | Author | User |
|------|--------|------|
| 323 (EN) | 1 | admin (flgnynjai@gmail.com) |
| 366 (ES) | 1 | admin (flgnynjai@gmail.com) |
| 440 (recent EN) | **4** | dashboard-push |
| 438 (recent EN) | **4** | dashboard-push |
| 437 (recent EN) | **4** | dashboard-push |
| 371 (EN) | **4** | dashboard-push |

[VERIFIED — `wp eval` per post author + `wp user list`]

Post 323 was created with admin credentials (author=1), while all later dashboard-pushed events use the `dashboard-push` service account (author=4). This indicates 323 was pushed before the service account was set up, or was created manually. Either way, 366 (ES) was created as a separate manual action — it has no dashboard_events row, shares the same author and identical `post_date` as 323 (characteristic of Polylang's "create translation" admin flow which copies the original's date), and has `_edit_lock` / `_edit_last` meta showing admin editing. [INFERRED — the identical post_date + admin author + Polylang linking + absence from dashboard_events together strongly indicate manual WP admin creation]

### CONCLUSION: **366 was hand-created in WP admin** [INFERRED — high confidence]

Event 366 was created manually in the WordPress admin panel as a Polylang translation of EN event 323. It was never dashboard-pushed. **ES event creation NEVER went through the dashboard push path.** This is a capability gap, not a regression — there is nothing that broke because there was nothing to break.

---

## Regression Section: ES/Polylang Handling in Push Code

Despite concluding the fork as "gap, not regression," the prompt asks to check the code regardless. Results below.

### Dashboard push code (server.ts)

`createWordPressEvent()` (lines 3557–3602) pushes to `https://johnv80.sg-host.com/wp-json/4lg/v1/push-event` with these fields:

```
title, content, event_date, event_time_start, event_time_end,
event_location, event_location_name, event_type, photo_url,
link_url, link_text, contact_email, contact_phone
```

**No language/ES/Polylang handling whatsoever.** No `lang` param, no `pll_set_post_language`, no second POST for ES, no translation-linking call. [VERIFIED — function quoted from server.ts lines 3557–3602]

`updateWordPressEvent()` (lines 3605–3650) uses WP REST `wp/v2/shelter-events/{id}` with same field set under `meta: {}`. **No language handling.** [VERIFIED]

### Git history

| Search | Commits found |
|--------|---------------|
| `git log -S 'pll_'` (entire repo, all time) | **0** |
| `git log -S 'pll_set_post_language'` | **0** |
| `git log -S 'pll_save_post_translations'` | **0** |
| `git log -S 'createWordPressEventES'` | **0** |
| `git log -S 'createWordPressEvent'` | **1** — commit `3a408c8` (2026-03-16, "Add events tab to dashboard") |

[VERIFIED — all searches run against all branches/tags]

**No Polylang/language/translation handling was ever committed to the event push code.** The function was introduced in commit `3a408c8` on 2026-03-16 and has never been modified. There is no commit that added then removed ES handling — it was never there. [VERIFIED]

### WordPress-side push-event handler (functions.php)

`flg_handle_event_push()` (functions.php lines ~1180–1260) does:
1. Creates/updates a `shelter_event` post via `wp_insert_post` / `wp_update_post`
2. Sets 11 meta fields via `update_post_meta()` loop
3. Clears event cache via `flg_delete_lang_transient('flg_upcoming_events')`

**No `pll_set_post_language()` or `pll_save_post_translations()` call.** [VERIFIED — `grep` for pll_set/pll_save in functions.php returned zero matches]

When Polylang is active and a post is created without explicitly calling `pll_set_post_language()`, Polylang assigns the site's default language (EN). This is why all dashboard-pushed events are EN-only. [VERIFIED — all 4 dashboard-pushed events (371, 437, 438, 440) have `lang=en` and `translations={en: <self>}` only]

### Polylang version

Polylang **3.8.4** (standard, not Pro). [VERIFIED — `wp plugin list`]

Polylang standard does NOT support setting post language via the WP REST API `meta` field. The REST API `lang` parameter is a Polylang Pro feature. With standard Polylang, language must be set via `pll_set_post_language()` in PHP (e.g., in the `flg_handle_event_push` handler after `wp_insert_post`). [INFERRED — based on Polylang documentation; standard vs Pro REST capability is well-documented]

### Polylang CPT configuration

`shelter_event` IS registered as translatable in Polylang settings (`post_types` array includes `shelter_event`). [VERIFIED — `wp option get polylang`]

---

## Summary

| Question | Answer | Confidence |
|----------|--------|------------|
| Was event 366 dashboard-pushed? | **No** — hand-created in WP admin | [INFERRED — high] |
| Did the push path ever create ES translations? | **No** — zero Polylang code in entire git history | [VERIFIED] |
| Is this a regression? | **No** — ES event creation is a never-built capability gap | [VERIFIED] |
| What would be needed to add it? | `pll_set_post_language()` + `pll_save_post_translations()` calls in the WP-side `flg_handle_event_push()`, plus a second post creation for the ES translation with translated fields | [INFERRED] |
| Can it be done via REST alone? | **No** — Polylang standard (not Pro) lacks REST language-setting | [INFERRED] |
