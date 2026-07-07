# Old Wix URLs — Store + Remaining Surface Diagnosis

## Q1 — Known /store/ URL pattern

```
curl -sSIL 'https://www.fourlegsgoodnynj.org/store/p12/4LG_One_Kitty_at_a_Time_Mug.html'
HTTP/2 404
content-type: text/html; charset=UTF-8
Body: "Page Not Found" × 5 — hits the new 404.php
```

Pattern confirmed: old Wix store product URLs use `/store/p<N>/<Product_Name>.html`, all return 404 via WordPress fallthrough to 404.php. [VERIFIED]

## Q2 — Full /store/ product surface

### Sources

Wayback Machine CDX API + archived store page (Jan 2026 snapshot) + DuckDuckGo search index. Combined and deduplicated.

### Store product URLs (16 unique products)

| URL | Product | HTTP now | Source |
|-----|---------|----------|--------|
| `store/p2/4LG_Kitty_Caretaker_Mug.html` | Mug | 404 | Wayback |
| `store/p4/Covered_in_Cat_Hair_and_Filled_with_Dreams_Mug.html` | Mug | 404 | Wayback |
| `store/p12/4LG_One_Kitty_at_a_Time_Mug.html` | Mug | 404 | Wayback + DDG |
| `store/p13/4LG_Tote_bag.html` | Tote bag | 404 | DDG |
| `store/p17/Covered_in_Cat_Hair_and_Filled_with_Dreams_Throw_Blanket.html` | Blanket | 404 | Wayback |
| `store/p19/Covered_in_Cat_Hair_and_Filled_with_Dreams_-_Black_with_White_Design_Pillow.html` | Pillow | 404 | DDG |
| `store/p28/Unisex_4LG_T-Shirt.html` | T-shirt | 404 | DDG |
| `store/p32/Covered_in_Cat_Hair_and_Filled_with_Dreams_Tote_bag.html` | Tote bag | 404 | Wayback |
| `store/p36/Women's_relaxed_v-neck_t-shirt.html` | T-shirt | 404 | Wayback |
| `store/p37/Unisex_t-shirt.html` | T-shirt | 404 | Wayback |
| `store/p39/Drawstring_bag.html` | Bag | 404 | Wayback |
| `store/p40/All-Over_Print_Large_Tote_Bag.html` | Tote bag | 404 | Wayback |
| `store/p42/Oversized_weekender_bag.html` | Bag | 404 | Wayback + DDG |
| `store/p43/Utility_crossbody_bag.html` | Bag | 404 | Wayback |
| `store/p44/Utility_crossbody_bag.html` | Bag (variant) | 404 | DDG |
| `store/p45/Tapered_stainless_steel_tumbler.html` | Tumbler | 404 | Wayback + DDG |
| `store/p46/Sublimation_Cut_&_Sew_Tank_Top.html` | Tank top | 404 | Wayback |
| `store/p47/Basic_Pillow.html` | Pillow | 404 | Wayback |
| `store/p48/Basic_Pillow.html` | Pillow (variant) | 404 | Wayback |

[VERIFIED — all curled from VPS, all 404]

### Store index/category URLs

| URL | HTTP now |
|-----|----------|
| `/store` | 404 |
| `/store/` | 404 |
| `/shop` | 404 |
| `/4lg-merch-store.html` | 404 |

[VERIFIED]

## Q3 — Complete old Wix .html surface (Wayback Machine CDX enumeration)

The Wayback Machine CDX API returned the complete historical URL inventory. After removing WordPress core paths, CDN artifacts, and deduplicating, **93 unique old .html pages** existed on the Wix site.

### Already redirected (10 URLs in current map)

```
rg-cares-animal-shelter.html  → /
contact.html                  → /
copy---home---original.html   → /
rg-cares.html                 → /rg-cares/
events.html                   → /events/
adoption-info.html            → /adopt/
adoption-application.html     → /adopt/
adoption-application---copy-as-of-22024.html → /adopt/
copy---adopt---original.html  → /adopt/
mission.html                  → /about-us/
```

### NOT yet redirected — categorized by type

**A. Main content pages (high-value, likely to receive search traffic)**

| Old URL | Proposed target | Notes |
|---------|----------------|-------|
| `index.html` | `/` | Old homepage |
| `about.html` | `/about-us/` | |
| `about1.html` | `/about-us/` | Wix variant |
| `about-old.html` | `/about-us/` | |
| `about-us.html` | `/about-us/` | |
| `adopt.html` | `/adopt/` | |
| `donate.html` | `/how-to-help/` | |
| `dogs.html` | `/adopt/` | Old separate species page |
| `cats.html` | `/adopt/` | Old separate species page |
| `our-team.html` | `/about-us/` | Team info on About page now |
| `board.html` | `/about-us/` | Board info |
| `founders.html` | `/about-us/` | |
| `current-board-of-directors.html` | `/about-us/` | |

**B. Store/merch/wishlist pages (⚠️ John's decision on target)**

| Old URL | Notes |
|---------|-------|
| `4lg-merch-store.html` | Main merch store landing page |
| `4lg-chewy-wishlist.html` | Chewy wish list |
| `4lg-wishlists.html` | Wish lists hub |
| `other-ways-to-donate.html` | Alternative donation page |
| `old-donate---with-sponsorship-info.html` | Sponsorship info |

**C. Adoption-related variants**

| Old URL | Proposed target |
|---------|----------------|
| `adoption-application1.html` | `/adopt/` |
| `adoption-contract.html` | `/adopt/` |
| `adoption-info---cats.html` | `/adopt/` |
| `adoption-info---cats---copy-as-of-102023.html` | `/adopt/` |
| `adoption-info---copy-as-of-32024.html` | `/adopt/` |

**D. TNVR/volunteer pages**

| Old URL | Proposed target |
|---------|----------------|
| `copy---what-is-tnr.html` | `/tnvr/` |
| `copy---what-is-tnr---original.html` | `/tnvr/` |
| `old---volunteer-form.html` | `/how-to-help/` |

**E. Past event pages (low value — historical, unlikely to drive useful traffic)**

| Old URL | Proposed target |
|---------|----------------|
| `comedy-show-2023.html` | `/events/` |
| `comedy-show---august-2023.html` | `/events/` |
| `fall-festival-fundraiser-2022.html` | `/events/` |
| `jail--bail.html` | `/events/` |
| `jail--bail---prisoners.html` | `/events/` |
| `pet-supplies-plus.html` | `/events/` |
| `psychic-soiree.html` | `/events/` |
| `psychic-soiree-2021.html` | `/events/` |
| `psychic-soiree-photo-gallery.html` | `/events/` |
| `psychic-soiree-2021-photo-gallery.html` | `/events/` |
| `events-art-t-shirt-design.html` | `/events/` |
| `adoptableartistsexhibit.html` | `/events/` |
| `past-events.html` | `/events/` |
| `atlantis.html` | `/events/` |

**F. Wix editor copies (very low value — internal drafts, unlikely indexed)**

| Old URL | Proposed target |
|---------|----------------|
| `copy---about.html` | `/about-us/` |
| `copy---about---original.html` | `/about-us/` |
| `copy---adopt.html` | `/adopt/` |
| `copy---adoption-application.html` | `/adopt/` |
| `copy---adoption-contract.html` | `/adopt/` |
| `copy---contact.html` | `/` |
| `copy---donate.html` | `/how-to-help/` |
| `copy---donate---original.html` | `/how-to-help/` |
| `copy---events.html` | `/events/` |
| `copy---events---original.html` | `/events/` |
| `copy---home.html` | `/` |
| `copy---our-team.html` | `/about-us/` |
| `copy---our-team---original.html` | `/about-us/` |
| `copy---testimonials.html` | `/stories/` |
| `copy---testimonials---original.html` | `/stories/` |
| `copy---volunteer.html` | `/how-to-help/` |
| `copy---volunteer---original.html` | `/how-to-help/` |
| `home---copy---as-of-22024.html` | `/` |
| `contact---copy-as-of-22024.html` | `/` |
| `donate---copy-as-of-22024.html` | `/how-to-help/` |
| `mission---copy-as-of-22024.html` | `/about-us/` |
| `other-ways-to-donate---copy-as-of-22024.html` | `/how-to-help/` |
| `rg-cares-animal-shelter---copy-as-of-22024.html` | `/` |
| `copy-old-kitten-gallery.html` | `/adopt/` |

**G. Miscellaneous / unclassifiable**

| Old URL | Proposed target | Notes |
|---------|----------------|-------|
| `kitten-gallery.html` | `/adopt/` | Old kitten photos |
| `kitten-live-feed.html` | `/adopt/` | Old live stream page |
| `coming-soon.html` | `/` | Pre-launch placeholder |

**H. Events with Wix hash IDs (20+ URLs like `events-759229-355584-889380...html`)**

These are Wix-generated event detail URLs with long numeric hash chains. There are 20+ variants with progressively longer chains. All are clearly auto-generated. Proposed: catch-all redirect for anything matching `events-759229*` → `/events/`. [INFERRED — Wix event system artifact]

## Q4 — Current store/shop/merch page status

**No store/shop/merch page exists in WordPress.** `wp post list --post_type=page --post_status=any` has no match for store, shop, or merch. [VERIFIED]

The current `/how-to-help/` page links to an external merch store: `https://thefamilypet.store/products/help-support-four-legs-good-rockland-countys-no-kill-animal-shelter`. [VERIFIED — found in rendered HTML]

### Proposed store redirect targets (⚠️ John's decision)

**Option A:** All `/store/*` + `4lg-merch-store.html` → `/how-to-help/` (the How to Help page, which has the merch link)

**Option B:** All `/store/*` + `4lg-merch-store.html` → external `https://thefamilypet.store/...` (direct to current merch provider)

**Option C:** All `/store/*` + `4lg-merch-store.html` → `/` (home — neutral)

**Recommendation:** Option A — `/how-to-help/` is the support/give page and contains the merch link. Sending store-intent traffic to the How to Help page keeps them in the give-support mindset. External redirect (Option B) would be unusual for a 301 and could break if the external URL changes.

For wishlist pages: `4lg-chewy-wishlist.html`, `4lg-wishlists.html` → `/how-to-help/` (the Wish Lists section is on this page). [VERIFIED — footer links to `/how-to-help/#wishlists`]

## Q5 — Redirect scope and implementation recommendation

### Traffic assessment

- `rg-cares-animal-shelter.html`: **397 clicks** (Search Console, already redirected) [VERIFIED per user report]
- Store product pages: **indexed in DuckDuckGo** (7 product pages confirmed in live search results with snippets). Real traffic likely — merch pages have product descriptions that rank for long-tail queries. [VERIFIED]
- `4lg-merch-store.html`: **indexed in DuckDuckGo** with title "4lg Merch Store". [VERIFIED]
- `home---copy---as-of-22024.html`: **indexed in DuckDuckGo**. [VERIFIED]
- Wix `copy---` pages: **unlikely indexed** — most are internal Wix editor copies. One (`copy---home---original.html`) was indexed and already redirected. Others may have trace impressions. [INFERRED]
- Wix `events-759229-...` hash pages: **unlikely indexed** — auto-generated, no meaningful content for search engines. [INFERRED]

### Implementation recommendation

Rather than adding 80+ individual entries to the `$map` array, extend `flg_section_slug_redirects` with **prefix-based catch-all rules** after the exact-match lookup:

1. **Exact matches for high-value pages** (categories A-E above): ~25 new entries in `$map`
2. **Prefix rule:** Any path starting with `store/` → `/how-to-help/` (covers all 16+ product pages + future stragglers)
3. **Suffix rule:** Any path ending in `.html` not already matched → `/` (catches all Wix copy pages, hash-event pages, and any future old-URL discovery — safe because NO current WordPress URL ends in `.html`)

The suffix catch-all is safe because:
- WordPress uses extensionless URLs (`/%postname%/` permalink structure) [VERIFIED]
- The only `.html` files in the doc root are `Default.html` (noindex placeholder) and `readme.html` (WP default) — neither is a content page [VERIFIED]
- No theme, plugin, or page generates `.html` URLs [VERIFIED]

This approach reduces the map to ~25 high-value exact matches + 2 rules (prefix + suffix catch-all), covering the entire 93-URL surface plus any undiscovered old URLs.

### Current handler structure (for extension reference)

```php
function flg_section_slug_redirects() {
    if (is_admin()) { return; }
    $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
    $map = array(
        // 6 fabricated-slug entries
        // 10 old .html entries
    );
    if (isset($map[$path])) {
        wp_redirect(home_url($map[$path]), 301);
        exit;
    }
}
```

Extension points after the `isset($map[$path])` block:
- `if (strpos($path, 'store/') === 0)` → redirect to `/how-to-help/`
- `if (substr($path, -5) === '.html')` → redirect to `/`

[VERIFIED — handler structure confirmed from production functions.php]
