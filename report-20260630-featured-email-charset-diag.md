# Featured Six Email — "??" Charset Diagnosis

**Date:** 2026-06-30 22:17 UTC

---

## 1. The Template Character

In `featuredRotation.ts` line 448, the "Currently Featured" header reads:

```
'�\uDCCC Currently Featured'
```

Hex dump of that line:
```
27 ef bf bd 5c 75 44 43 43 43 20 43 75 72 72 65 6e 74 6c 79 ...
```

- `ef bf bd` = **U+FFFD** (Unicode REPLACEMENT CHARACTER) — the high surrogate was already destroyed and replaced
- `\uDCCC` = a **lone low surrogate** (0xDCCC) left as a literal escape — invalid Unicode on its own

This is a **broken surrogate pair**. The original emoji was a two-code-unit character (above U+FFFF in UTF-16). At some point during file creation or editing, the high surrogate was corrupted and replaced with U+FFFD, while the low surrogate `\uDCCC` survived as a literal escape sequence.

### What was the intended character?

The low surrogate 0xDCCC uniquely identifies the emoji given common high surrogates:

| High surrogate | Codepoint | Character | Likely? |
|---|---|---|---|
| 0xD83C | U+1F0CC | 🃌 (playing card) | No |
| **0xD83D** | **U+1F4CC** | **📌 (pushpin)** | **Yes — perfect for "Currently Featured"** |
| 0xD83E | U+1F8CC | (unassigned) | No |

The intended character was almost certainly **📌** (U+1F4CC, pushpin emoji).

---

## 2. Why "??"

The cause is **a broken literal in the source file**, not an encoding/charset problem.

- The file is properly UTF-8 encoded (`file` reports `Unicode text, UTF-8 text`)
- But the emoji on line 448 is already corrupted in the source: U+FFFD + bare `\uDCCC`
- When Node.js evaluates this string, U+FFFD renders as one "?" and the lone surrogate renders as another "?" → **"??"**

The Resend API sends email as UTF-8 by default. The HTML template has no `<meta charset>` tag, but that is irrelevant here because the problem is upstream — the bytes in the source are already wrong before any email is composed.

---

## 3. The Decisive Test — Do Other Emoji Headers Work?

The other two section headers in the same function (lines 452–453):

```typescript
html += renderSection('⬆️ Swap In Now', edition.newSix);
html += renderSection('⏭️ Coming Next Week', edition.nextSix);
```

- **⬆️** (U+2B06 + U+FE0F) — BMP character, no surrogate pair needed → **renders correctly** ✓
- **⏭️** (U+23ED + U+FE0F) — BMP character, no surrogate pair needed → **renders correctly** ✓

Per the inbox screenshot, both of these emoji rendered fine in the received email. **Only the "Currently Featured" header shows "??".**

This proves the email charset pipeline is working correctly. UTF-8 encoding, Resend transport, and email client rendering all handle Unicode properly. The issue is isolated to one corrupted literal in the source.

---

## 4. Verdict

### **(A) Isolated broken decorative literal — NOT a charset risk.**

The "??" is caused by a single corrupted emoji literal on line 448 of `featuredRotation.ts`. The charset/encoding pipeline is fine — other emoji in the same email render correctly. Animal names with accents or special characters (é, ñ, etc.) will render correctly in future editions because:
- The source file is valid UTF-8
- Node.js handles UTF-8 natively
- Resend sends as UTF-8
- The two working emoji prove the end-to-end chain is intact

### Exact one-line fix (DO NOT APPLY — diagnosis only):

**Line 448 of `/home/shelter/shelter-apps/server/src/featuredRotation.ts`:**

Replace:
```
'�\uDCCC Currently Featured',
```

With:
```
'📌 Currently Featured',
```

That's it — replace the corrupted bytes with the actual 📌 emoji (U+1F4CC). One character, one line, cosmetic only.
