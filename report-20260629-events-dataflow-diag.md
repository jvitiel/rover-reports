# Events Data Flow Diagnosis — 2026-06-29

## Data Flow Architecture

```
Dashboard UI → PUT /api/events/:id → shelter-app server.ts
  ├─ 1. updateWordPressEvent() → WP REST API /wp/v2/shelter-events/{wpPostId}  ← FAILS (403)
  ├─ 2. updateEvent() → local SQLite (always succeeds)
  └─ 3. clearWordPressEventsCache() → /wp-json/4lg/v1/clear-events-cache

Website reads directly from WP database:
  /events/ page → page-events.php → get_posts(shelter_event) → post_content + post_meta
  Homepage → render_upcoming_events() → transient cache (1hr) → same get_posts query
```

Both the homepage and /events/ page read from the same WP source (shelter_event CPT). The homepage caches via transient (`flg_upcoming_events_{lang}`, 1 hour TTL). [VERIFIED via code]

## Source of Truth (SQLite — dashboard side)

| Field | Event 21 (7/12) | Event 22 (7/25) |
|-------|-----------------|-----------------|
| id | 21 | 22 |
| wp_post_id | 437 | 438 |
| title | Volunteer Orientation | Volunteer Orientation |
| event_date | 2026-07-12 | 2026-07-25 |
| event_type | **volunteer_day** | **volunteer_day** |
| description | "Ready to volunteer..." (682 chars) | "Ready to volunteer..." (682 chars) |
| published_at | 2026-06-29T19:13:33Z | 2026-06-29T19:16:58Z |
| updated_at | **2026-06-29T20:50:10Z** (edited) | 2026-06-29T19:17:11Z (edited) |
| status | published | published |

Both records are correct in the dashboard DB. [VERIFIED via sqlite3 query]

## WordPress Side (what the website renders from)

| Field | WP Post 437 (7/12) | WP Post 438 (7/25) |
|-------|--------------------|--------------------|
| post_content | **"Are you ready"** ❌ (stale fragment) | "Ready to volunteer..." ✅ (full, correct) |
| post_modified | **2026-06-29 19:13:30** (never updated) | 2026-06-29 19:16:57 (never updated) |
| meta: event_type | **volunteer_day** ✅ | **adoption_event** ❌ |

Both WP posts have stale data from their initial creation. Neither received the dashboard updates. [VERIFIED via `wp post get` + `wp post meta list`]

## Root Cause: Missing WordPress Capability

**Both update attempts returned 403:**

```
[Events] WordPress update failed: WordPress event update failed: 403 -
  {"code":"rest_cannot_edit","message":"Sorry, you are not allowed to edit this post.","data":{"status":403}}
```
[VERIFIED from shelter-app journal logs, timestamps 19:17:11 and 20:50:10]

**The `dashboard_service` role is missing `edit_published_posts`:**

| Capability | Has it? |
|-----------|---------|
| edit_posts | ✅ |
| edit_others_posts | ✅ |
| publish_posts | ✅ |
| **edit_published_posts** | **❌ MISSING** |
| delete_posts | ✅ |
| delete_published_posts | ✅ |
| delete_others_posts | ✅ |

[VERIFIED via `wp cap list dashboard_service`]

The `shelter_event` CPT uses `capability_type => 'post'`, so WP maps edit permission to `edit_published_posts`. The custom `/push-event` endpoint only checks `current_user_can('edit_posts')` — so **creates work, updates don't**. [VERIFIED via functions.php lines 1109, 1155]

**This means ALL event updates from dashboard → WordPress have been silently failing.** Creates succeed (via `/push-event`), but any subsequent edit (description change, event_type correction, time change) never reaches WordPress. The dashboard DB is correct; WordPress is frozen at creation-time values.

## Event A — "Are you ready" (Post 437)

1. Event 21 was created at 19:13:33 UTC with initial description
2. `/push-event` created WP post 437 with `post_content = "Are you ready"` (the description at creation time) [VERIFIED]
3. John edited the description in the dashboard at 20:50:10 UTC to the full paragraph
4. `updateWordPressEvent(437, ...)` attempted PUT to `/wp/v2/shelter-events/437` → **403** [VERIFIED from journal]
5. Dashboard DB updated successfully; WP post 437 still has "Are you ready"

Source of "Are you ready": the original description at event creation time, frozen in WordPress because the update was rejected. [VERIFIED]

## Event B — "ADOPTION_EVENT" badge (Post 438)

1. Event 22 was created at 19:16:57 UTC with `event_type` value at creation time
2. `/push-event` created WP post 438 with `meta: event_type = adoption_event` [VERIFIED]
3. John corrected event_type to `volunteer_day` at 19:17:11 UTC (14 seconds later)
4. `updateWordPressEvent(438, ...)` attempted PUT → **403** [VERIFIED from journal]
5. Dashboard DB has `volunteer_day`; WP meta has `adoption_event`

The badge renders via `ucwords(str_replace('-', ' ', $event_type))` + `text-transform: uppercase` CSS → `adoption_event` → `Adoption_event` → "ADOPTION_EVENT" on screen. [VERIFIED via page-events.php line 137]

Note: the `str_replace` targets hyphens (`-`) but the value uses underscores (`_`). This is a cosmetic bug in the badge formatter — but it's secondary to the sync failure.

## Fix Assessment

| Layer | Issue | Fix |
|-------|-------|-----|
| **WordPress (primary)** | `dashboard_service` role missing `edit_published_posts` | `wp role add_cap dashboard_service edit_published_posts` |
| Website badge formatter | `str_replace('-', ' ', ...)` doesn't handle underscores | Change to `str_replace(array('-', '_'), ' ', ...)` |
| Shelter-app (no bug) | Update handler works correctly; logs failure and saves locally | No change needed |
| Stale data in WP | Posts 437, 438 have creation-time values | Re-save events from dashboard after cap fix (will re-sync) |

**The primary fix is one WP-CLI command.** After adding the capability, re-saving events from the dashboard will push the correct values to WordPress.

---

*Read-only diagnosis. No files modified. No database writes. No cache purges. Generated 2026-06-29 21:35 UTC.*
