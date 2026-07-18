# WordPress Post Update Save-Path Verification — 2026-07-18

## Step 1 — Baseline

File: `/tmp/probe-content.html` — 467 bytes, containing `<!-- wp:html -->` block with 8 JS escape sequences across 7 lines.

```
$ wc -c /tmp/probe-content.html
467 /tmp/probe-content.html

$ tr -cd '\\' < /tmp/probe-content.html | wc -c
15

$ sha256sum /tmp/probe-content.html
8159a12cd467d2da1b91da1a1e46df49ee59810972c6b1d3b4fc30a606e7e01b  /tmp/probe-content.html
```

Baseline od -c of the probeEmail regex line:
```
$ grep 'test(email)' /tmp/probe-content.html | od -c
0000000       r   e   t   u   r   n       /   ^   [   ^   \   s   @   ]
0000020   +   @   [   ^   \   s   @   ]   +   \   .   [   ^   \   s   @
0000040   ]   +   $   /   .   t   e   s   t   (   e   m   a   i   l   )
0000060   ;  \n
0000062
```

File transferred to WordPress server via scp. Remote sha256 matches: `8159a12cd467...`. [VERIFIED]

## Step 2 — Create Throwaway Post

```
$ wp post create --post_type=page --post_status=draft --post_title='ZZ PROBE - DELETE ME' --porcelain
494
```

PROBE_ID = **494**. Post type: page, status: draft.

## Step 3 — Method Tests

### Note on readback trailing newline

`wp post get 494 --field=content` appends one trailing newline (\n) not present in the stored content. All readback files are 468 bytes. To compare stored content against baseline, `head -c 467` is used to strip this artifact before hashing. The full 468-byte sha256 is `5e9c33a88469ceaa83068f5eea10ae0440d5377ab0c6911c5159908f1df1f763` for methods that preserve content. The diff output `16a17 >` (one blank line appended) confirms the only difference.

---

### METHOD A — `wp post update PROBE_ID /tmp/probe-content.html`

Reset confirmed:
```
$ wp post update 494 --post_content='RESET'
Success: Updated post 494.
$ wp post get 494 --field=content
RESET
```

Applied:
```
$ wp post update 494 /tmp/probe-content.html
Success: Updated post 494.
```

Readback:
```
$ wc -c /tmp/readback-A.html
468 /tmp/readback-A.html

$ tr -cd '\\' < /tmp/readback-A.html | wc -c
15

$ sha256sum /tmp/readback-A.html
5e9c33a88469ceaa83068f5eea10ae0440d5377ab0c6911c5159908f1df1f763  /tmp/readback-A.html

$ head -c 467 /tmp/readback-A.html | sha256sum
8159a12cd467d2da1b91da1a1e46df49ee59810972c6b1d3b4fc30a606e7e01b  -
```

sha256 of stored content (first 467 bytes) **MATCHES** baseline. [VERIFIED]

od -c of probeEmail regex:
```
0000000       r   e   t   u   r   n       /   ^   [   ^   \   s   @   ]
0000020   +   @   [   ^   \   s   @   ]   +   \   .   [   ^   \   s   @
0000040   ]   +   $   /   .   t   e   s   t   (   e   m   a   i   l   )
0000060   ;  \n
0000062
```

diff (only the trailing newline artifact):
```
16a17
>
```

**Result: PASS — byte-identical to baseline.**

---

### METHOD B — `wp eval-file` with `wp_slash()`

Reset confirmed:
```
$ wp post update 494 --post_content='RESET'
Success: Updated post 494.
$ wp post get 494 --field=content
RESET
```

PHP script `/tmp/method-b.php`:
```php
<?php
$c = file_get_contents("/tmp/probe-content.html");
$r = wp_update_post(array("ID" => 494, "post_content" => wp_slash($c)), true);
if (is_wp_error($r)) { echo "ERROR: " . $r->get_error_message() . "\n"; } else { echo "OK: $r\n"; }
```

Applied:
```
$ wp eval-file /tmp/method-b.php
OK: 494
```

Readback:
```
$ wc -c /tmp/readback-B.html
468 /tmp/readback-B.html

$ tr -cd '\\' < /tmp/readback-B.html | wc -c
15

$ sha256sum /tmp/readback-B.html
5e9c33a88469ceaa83068f5eea10ae0440d5377ab0c6911c5159908f1df1f763  /tmp/readback-B.html

$ head -c 467 /tmp/readback-B.html | sha256sum
8159a12cd467d2da1b91da1a1e46df49ee59810972c6b1d3b4fc30a606e7e01b  -
```

sha256 of stored content (first 467 bytes) **MATCHES** baseline. [VERIFIED]

od -c of probeEmail regex:
```
0000000       r   e   t   u   r   n       /   ^   [   ^   \   s   @   ]
0000020   +   @   [   ^   \   s   @   ]   +   \   .   [   ^   \   s   @
0000040   ]   +   $   /   .   t   e   s   t   (   e   m   a   i   l   )
0000060   ;  \n
0000062
```

**Result: PASS — byte-identical to baseline.**

---

### METHOD C — `wp eval-file` WITHOUT `wp_slash()` (control)

Reset confirmed:
```
$ wp post update 494 --post_content='RESET'
Success: Updated post 494.
$ wp post get 494 --field=content
RESET
```

PHP script `/tmp/method-c.php`:
```php
<?php
$c = file_get_contents("/tmp/probe-content.html");
$r = wp_update_post(array("ID" => 494, "post_content" => $c), true);
if (is_wp_error($r)) { echo "ERROR: " . $r->get_error_message() . "\n"; } else { echo "OK: $r\n"; }
```

Applied:
```
$ wp eval-file /tmp/method-c.php
OK: 494
```

Readback:
```
$ wc -c /tmp/readback-C.html
455 /tmp/readback-C.html

$ tr -cd '\\' < /tmp/readback-C.html | wc -c
2

$ sha256sum /tmp/readback-C.html
9d14de657366e3c592cdf71d983f97c2575cc3277acf74bb8d43b4c69e8b1ac8  /tmp/readback-C.html

$ head -c 467 /tmp/readback-C.html | sha256sum
9d14de657366e3c592cdf71d983f97c2575cc3277acf74bb8d43b4c69e8b1ac8  -
```

sha256 **DOES NOT MATCH** baseline. [VERIFIED]

od -c of probeEmail regex:
```
0000000       r   e   t   u   r   n       /   ^   [   ^   s   @   ]   +
0000020   @   [   ^   s   @   ]   +   .   [   ^   s   @   ]   +   $   /
0000040   .   t   e   s   t   (   e   m   a   i   l   )   ;  \n
0000056
```

Backslashes stripped. Regex is now `/^[^s@]+@[^s@]+.[^s@]+$/` — identical to the corruption observed in posts 7 and 339.

Full diff:
```
$ diff /tmp/probe-content.html /tmp/readback-C.html
6c6
<  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
---
>  return /^[^s@]+@[^s@]+.[^s@]+$/.test(email);
8,13c8,13
< function probeDigits(v) { return /^\d{5}$/.test(v); }
< function probeWord(v) { return /\w+/.test(v); }
< const probeNewline = "line1\nline2";
< const probeTab = "col1\tcol2";
< const probeDoubleBackslash = "C:\\Users\\test";
< const probeUnicode = "\u00e9\ud83d\udc36";
---
> function probeDigits(v) { return /^d{5}$/.test(v); }
> function probeWord(v) { return /w+/.test(v); }
> const probeNewline = "line1nline2";
> const probeTab = "col1tcol2";
> const probeDoubleBackslash = "C:\Users\test";
> const probeUnicode = "u00e9ud83dudc36";
16a17
>
```

**Result: FAIL — 13 of 15 backslashes stripped.**

Damage inventory:
- `\s` (×3 in email regex) → `s` — stripped
- `\.` (×1 in email regex) → `.` — stripped
- `\d` (×1 in probeDigits) → `d` — stripped
- `\w` (×1 in probeWord) → `w` — stripped
- `\n` (×1 in probeNewline) → `n` — stripped
- `\t` (×1 in probeTab) → `t` — stripped
- `\\` (×2 in probeDoubleBackslash) → `\` (×2) — one layer stripped, one survived (15→2 = 13 stripped, 2 survived)
- `\u` (×2 in probeUnicode) → `u` — stripped

The 2 surviving backslashes are the inner `\` in the `C:\\Users\\test` double-backslash sequences. `wp_unslash()` treats `\\` as an escaped backslash and converts it to a single `\`. This matches WordPress's slash-handling convention: `wp_unslash()` removes one layer of backslash escaping, treating `\\` → `\`, `\n` → `n`, `\t` → `t`, etc.

**This is the exact mechanism that corrupted posts 7 and 339.**

---

## Step 4 — Summary

### 4a. Results table

| Method | Readback bytes | Backslash count | sha256 match to baseline | Content duplicated |
|--------|---------------|----------------|--------------------------|-------------------|
| A — `wp post update` with file path | 467 (+ 1 trailing \n) | 15 | **YES** | No |
| B — `wp eval-file` with `wp_slash()` | 467 (+ 1 trailing \n) | 15 | **YES** | No |
| C — `wp eval-file` without `wp_slash()` | 454 (+ 1 trailing \n) | 2 | **NO** | No |

### 4b. Methods matching baseline exactly

**Method A** (`wp post update PROBE_ID /tmp/probe-content.html`) and **Method B** (`wp_update_post()` with `wp_slash()`) both return byte-identical content.

### 4c. All methods pass?

No. Method C failed. Two methods match.

### 4d. Method C failure detail

Method C (`wp_update_post()` without `wp_slash()`) stripped 13 of 15 backslashes. Every single-backslash escape sequence was consumed by `wp_unslash()`, which WordPress calls internally inside `wp_update_post()` before storing the content. Only double-backslash sequences survived (as single backslashes).

This confirms:
- The corruption mechanism is WordPress's internal `wp_unslash()` call inside `wp_update_post()`
- Any programmatic save that passes content to `wp_update_post()` without first applying `wp_slash()` will strip all backslash escapes
- The `wp post update <ID> <file>` CLI path (Method A) handles this correctly — it applies `wp_slash()` internally before calling `wp_update_post()`

## Step 5 — Probe Status

```
$ wp post get 494 --fields=ID,post_title,post_status,post_type --format=table
Field        Value
ID           494
post_title   ZZ PROBE - DELETE ME
post_status  draft
post_type    page
```

Post 494 is **draft**, type **page**, not published, not in any menu. Left in place for John to clear.

---

Baseline: 467 bytes, 15 backslashes, sha256 8159a12cd467
Methods matching baseline exactly: A (wp post update with file path), B (wp eval-file with wp_slash)
Method C (no wp_slash) stripped backslashes: yes
PROBE_ID: 494
