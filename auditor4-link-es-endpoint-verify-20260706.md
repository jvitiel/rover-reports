# Auditor Task 4: link-es-translation Endpoint Verification — 2026-07-07

## Task 1 — link-es-translation Endpoint Source

### Search Results

```
$ grep -rn 'link-es-translation' ~/www/.../wp-content/themes/4lg-theme/
(no output)
$ grep -rn 'link-es-translation' ~/www/.../wp-content/plugins/ | grep -v polylang
(no output)
$ grep -rn 'link-es-translation' ~/www/.../wp-content/mu-plugins/
(no output)
$ grep -rn 'link-es-translation\|link_es_translation' ~/www/.../wp-content/ | grep -v polylang | grep -v '.bak'
(no output)
```

**The `4lg/v1/link-es-translation` REST route does NOT exist.** [VERIFIED — exhaustive grep across theme, plugins, and mu-plugins returned zero matches]

All registered `4lg/v1/*` routes in functions.php:

```
210:    register_rest_route('4lg/v1', '/clear-stories-cache', ...
219:    register_rest_route('4lg/v1', '/set-story-featured', ...
1023:   register_rest_route('4lg/v1', '/test-animals-api', ...
1048:   register_rest_route('4lg/v1', '/clear-animals-cache', ...
1152:   register_rest_route('4lg/v1', '/push-event', ...
1161:   register_rest_route('4lg/v1', '/clear-events-cache', ...
```

[VERIFIED — `grep -rn 'register_rest_route.*4lg' functions.php`]

No `pll_save_post_translations` or `pll_set_post_language` calls exist anywhere in the theme directory. [VERIFIED — recursive grep returned zero matches]

### Answers (a), (b), (c)

**(a)** The endpoint does not exist. There is no handler to evaluate for unconditional-create vs search-first behavior. [VERIFIED — endpoint not registered]

**(b)** N/A — no handler exists to search. [VERIFIED]

**(c)** No guard for existing-but-unlinked ES posts exists, because the endpoint itself does not exist. No code anywhere in the WP install creates ES translations programmatically or detects orphan ES posts. [VERIFIED — zero `pll_set_post_language` or `pll_save_post_translations` calls in the entire theme/plugin codebase outside Polylang's own code]

## Task 2 — Orphan Classification of Hand-Made ES Posts

Read-only method used: `wp eval` with `pll_get_post_language()`, `pll_get_post_translations()`, and `wp_get_object_terms()` on the `post_translations` taxonomy.

### Raw Output

```
361 | shelter_story | Mejores Días para B y B | lang=es | en_counterpart=291 (Better Days for B and B) | group=pll_6a134acecbac5 (term_id=18, desc=a:2:{s:2:"es";i:361;s:2:"en";i:291;}) | status=LINKED
362 | shelter_story | Amor para Louise | lang=es | en_counterpart=288 (Love for Louise) | group=pll_6a134aee25b33 (term_id=19, desc=a:2:{s:2:"es";i:362;s:2:"en";i:288;}) | status=LINKED
363 | shelter_story | El Momento de Tinka | lang=es | en_counterpart=266 (Time for Tinka) | group=pll_6a134b12f1e91 (term_id=20, desc=a:2:{s:2:"es";i:363;s:2:"en";i:266;}) | status=LINKED
364 | shelter_story | ¡Pets Alive al Rescate! | lang=es | en_counterpart=237 (Pets Alive to the Rescue!) | group=pll_6a134b334f9d6 (term_id=21, desc=a:2:{s:2:"es";i:364;s:2:"en";i:237;}) | status=LINKED
365 | shelter_story | Cheshire Encontró a Su Gente | lang=es | en_counterpart=223 (Cheshire Found His People) | group=pll_6a134b5613502 (term_id=22, desc=a:2:{s:2:"es";i:365;s:2:"en";i:223;}) | status=LINKED
366 | shelter_event | Orientación para Voluntarios | lang=es | en_counterpart=323 (Volunteer Orientaton) | group=pll_6a1350b48b0fc (term_id=23, desc=a:2:{s:2:"es";i:366;s:2:"en";i:323;}) | status=LINKED
```

[VERIFIED — `wp eval` read-only output]

### Classification Table

| ES Post | Type | Title | EN Counterpart | Translation Group | Classification |
|---------|------|-------|----------------|-------------------|---------------|
| 361 | shelter_story | Mejores Días para B y B | 291 (Better Days for B and B) | pll_6a134acecbac5 (term_id=18) | **LINKED** ✓ |
| 362 | shelter_story | Amor para Louise | 288 (Love for Louise) | pll_6a134aee25b33 (term_id=19) | **LINKED** ✓ |
| 363 | shelter_story | El Momento de Tinka | 266 (Time for Tinka) | pll_6a134b12f1e91 (term_id=20) | **LINKED** ✓ |
| 364 | shelter_story | ¡Pets Alive al Rescate! | 237 (Pets Alive to the Rescue!) | pll_6a134b334f9d6 (term_id=21) | **LINKED** ✓ |
| 365 | shelter_story | Cheshire Encontró a Su Gente | 223 (Cheshire Found His People) | pll_6a134b5613502 (term_id=22) | **LINKED** ✓ |
| 366 | shelter_event | Orientación para Voluntarios | 323 (Volunteer Orientaton) | pll_6a1350b48b0fc (term_id=23) | **LINKED** ✓ |

All 6 ES posts are properly LINKED to their EN counterparts via Polylang's `post_translations` taxonomy. Each pair shares a unique translation-group term. Zero orphans found. [VERIFIED]
