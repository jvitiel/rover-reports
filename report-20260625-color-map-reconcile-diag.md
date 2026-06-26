# Color Map Reconciliation — Verbatim Dump

Read-only. Queried 2026-06-26 02:42 UTC.

---

## 1. CLIENT MAP (matcher-preview/app.js)

### COLOR_WORD_MAP_ES (lines 653–665):
```js
const COLOR_WORD_MAP_ES = {
  'black': 'negro', 'white': 'blanco', 'brown': 'marrón',
  'tan': 'habano', 'grey': 'gris', 'gray': 'gris',
  'orange': 'naranja', 'cream': 'crema', 'red': 'rojo',
  'buff': 'ante', 'chocolate': 'chocolate',
  'tabby': 'atigrado', 'calico': 'calicó', 'tabico': 'tabicó',
  'tortie': 'carey', 'torbi': 'torbi', 'tuxedo': 'tuxedo',
  'tricolour': 'tricolor', 'tricolor': 'tricolor',
  'brindle': 'atigrado', 'ginger': 'pelirrojo',
  'patch': 'parche', 'dilute': 'diluido',
  'and': 'y', 'with': 'con', 'various': 'varios',
  'short': 'corto', 'long': 'largo', 'medium': 'medio',
};
```
**28 entries** (including 6 non-color tokens: and, with, various, short, long, medium).

### Client translateColorEs (lines 667–682):
```js
function translateColorEs(colorText) {
  if (!colorText) return '—';
  if (currentLang !== 'es') return colorText;
  // Split on delimiters preserving them, translate known words
  return colorText.replace(/[\w]+/g, (word) => {
    const lower = word.toLowerCase();
    const mapped = COLOR_WORD_MAP_ES[lower];
    if (!mapped) return word; // English fallback for unmapped words
    // Preserve original capitalization: if first char was upper, capitalize mapped
    if (word[0] === word[0].toUpperCase()) {
      return mapped.charAt(0).toUpperCase() + mapped.slice(1);
    }
    return mapped;
  });
}
```

---

## 2. SERVER MAP (server/src/server.ts)

### COLOR_DICT_ES (lines 12792–12799):
```ts
const COLOR_DICT_ES: Record<string, string> = {
  black: 'negro', white: 'blanco', brown: 'marrón', grey: 'gris', gray: 'gris',
  tan: 'canela', cream: 'crema', chocolate: 'chocolate', orange: 'naranja',
  ginger: 'naranja rojizo', buff: 'beige', tabby: 'atigrado', calico: 'calicó',
  tortie: 'carey', tortoiseshell: 'carey',
  tricolour: 'tricolor', tricolor: 'tricolor', brindle: 'atigrado',
};
```
**18 entries** (pure color tokens only, no connectors).

### Server translateColorEs (lines 12801–12833):
```ts
function translateColorEs(original: string): string {
  // Normalize separators: ':', '-', '/' → space
  const normalized = original.toLowerCase().replace(/[:\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = normalized.split(' ');

  // Special-case: tuxedo → entire color is "blanco y negro"
  if (tokens.includes('tuxedo')) {
    return 'blanco y negro';
  }

  // Check for 'dilute' special-case
  const hasDilute = tokens.includes('dilute');
  const nonDilute = hasDilute ? tokens.filter(t => t !== 'dilute') : tokens;

  // Map tokens, tracking connectors
  const mapped: string[] = [];
  let allMapped = true;
  for (const t of nonDilute) {
    if (t === 'and' || t === '&') { mapped.push('y'); continue; }
    if (t === 'with') { mapped.push('con'); continue; }
    if (t === '') continue;
    const es = COLOR_DICT_ES[t];
    if (es) { mapped.push(es); } else { allMapped = false; break; }
  }

  if (!allMapped || mapped.length === 0) return original; // English fallback

  let result = mapped.join(' ');
  if (hasDilute) result += ' diluido';

  return result;
}
```

---

## 3. SIDE-BY-SIDE KEYS

All distinct English keys from either map. Disagreements and one-map-only entries flagged.

| English key | Client ES value | Server ES value | Status |
|-------------|----------------|-----------------|--------|
| black | negro | negro | ✅ match |
| white | blanco | blanco | ✅ match |
| brown | marrón | marrón | ✅ match |
| tan | **habano** | **canela** | ⚠️ **DISAGREE** |
| grey | gris | gris | ✅ match |
| gray | gris | gris | ✅ match |
| orange | naranja | naranja | ✅ match |
| cream | crema | crema | ✅ match |
| chocolate | chocolate | chocolate | ✅ match |
| tabby | atigrado | atigrado | ✅ match |
| calico | calicó | calicó | ✅ match |
| tortie | carey | carey | ✅ match |
| tricolour | tricolor | tricolor | ✅ match |
| tricolor | tricolor | tricolor | ✅ match |
| brindle | atigrado | atigrado | ✅ match |
| ginger | **pelirrojo** | **naranja rojizo** | ⚠️ **DISAGREE** |
| buff | **ante** | **beige** | ⚠️ **DISAGREE** |
| tuxedo | **tuxedo** | **(special-case → "blanco y negro")** | ⚠️ **DISAGREE** |
| red | rojo | — | 🔵 client only |
| tabico | tabicó | — | 🔵 client only |
| torbi | torbi | — | 🔵 client only |
| patch | parche | — | 🔵 client only |
| dilute | diluido | **(special-case logic, not in dict)** | 🔵 client only (as dict entry) |
| various | varios | — | 🔵 client only |
| short | corto | — | 🔵 client only |
| long | largo | — | 🔵 client only |
| medium | medio | — | 🔵 client only |
| and | y | **(hardcoded in function, not dict)** | 🔵 client only (as dict entry) |
| with | con | **(hardcoded in function, not dict)** | 🔵 client only (as dict entry) |
| tortoiseshell | — | carey | 🟠 server only |

### Summary counts:
- **Keys that DISAGREE (both present, different values): 4** — tan, ginger, buff, tuxedo
- **Keys in client only: 12** — red, tabico, torbi, patch, dilute, various, short, long, medium, and, with (+ dilute as dict vs logic)
- **Keys in server only: 1** — tortoiseshell
- **Keys that match: 14** — black, white, brown, grey, gray, orange, cream, chocolate, tabby, calico, tortie, tricolour, tricolor, brindle

---

## 4. SPECIAL CASES (non-dictionary behavior)

### Server special cases:

**Tuxedo early-return** (server.ts:12807-12809):
```ts
if (tokens.includes('tuxedo')) {
  return 'blanco y negro';
}
```
Replaces the ENTIRE color string with "blanco y negro" regardless of other tokens. Client map instead translates "tuxedo" → "tuxedo" (keeps English word).

**Dilute handling** (server.ts:12811-12813 + 12829):
```ts
const hasDilute = tokens.includes('dilute');
const nonDilute = hasDilute ? tokens.filter(t => t !== 'dilute') : tokens;
// ... after mapping ...
if (hasDilute) result += ' diluido';
```
Strips "dilute" from tokens, translates remaining colors, appends " diluido" at end. Client map instead treats "dilute" as a regular dict entry → "diluido" (translated in-place wherever it appears in the string).

**Connector handling** (server.ts:12819-12820):
```ts
if (t === 'and' || t === '&') { mapped.push('y'); continue; }
if (t === 'with') { mapped.push('con'); continue; }
```
Hardcoded in function body. Client map includes these as dict entries instead.

**Separator normalization** (server.ts:12803):
```ts
const normalized = original.toLowerCase().replace(/[:\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
```
Server normalizes `:`, `-`, `/` to spaces before tokenizing. Client uses `colorText.replace(/[\w]+/g, ...)` regex which matches word characters only, effectively skipping delimiters (they pass through unchanged).

**All-or-nothing** (server.ts:12826):
```ts
if (!allMapped || mapped.length === 0) return original;
```
Server requires ALL tokens to be mapped or returns the entire original string in English. Client translates per-word independently — mapped words translate, unmapped words stay English (mixed output possible).

**Casing** (client app.js:676-678):
```js
if (word[0] === word[0].toUpperCase()) {
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
}
```
Client preserves original capitalization (uppercase first letter → capitalize translation). Server always returns lowercase (normalizes to lowercase on entry, never re-capitalizes).

---

## 5. LIVE COLOR VALUES

Reusing data from report-20260625-matcher-color-i18n-diag.md (same session, no SM sync since). **46 distinct values across 188 adoptable animals.** Ordered by frequency:

| Count | BASECOLOURNAME |
|-------|---------------|
| 29 | Black |
| 10 | White |
| 10 | Brown |
| 10 | Tuxedo: Black and White |
| 9 | Tabby Grey & White |
| 9 | tabby brown |
| 8 | Black with white |
| 8 | Brown and White |
| 8 | Black and White |
| 8 | tabby - brown and white |
| 6 | Grey |
| 6 | Tabby |
| 6 | Calico |
| 4 | Tabico |
| 4 | Tricolour |
| 4 | Tan and White |
| 3 | Tabby - grey |
| 3 | Patch Tabby |
| 3 | Grey and White |
| 3 | Tan |
| 2 | Tabby and White |
| 2 | White and Brown |
| 2 | White and Black |
| 2 | Orange / Red & White |
| 2 | Buff and White |
| 2 | Tabby - black and white |
| 2 | Brown and Black |
| 2 | White and orange |
| 2 | Tabby: Orange and White |
| 2 | Ginger |
| 2 | Orange tabby |
| 1 | Black and Brown |
| 1 | Cream |
| 1 | Torbi |
| 1 | Chocolate |
| 1 | White with black |
| 1 | Various |
| 1 | Black and Grey |
| 1 | Brown and Tan |
| 1 | tabby - ginger |
| 1 | Dilute Tabico |
| 1 | Tabby black & grey |
| 1 | White and Grey |
| 1 | Brindle |
| 1 | Buff |
| 1 | Dilute Tortie |
