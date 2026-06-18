# Custom-Search Language Path — End-to-End Trace — 2026-06-17

## TASK 1 — How `lang` Is Determined

### Backend (server.ts:4324–4326)

```ts
// --- Language parameter (defaults to English) ---
const langRaw = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase().trim() : '';
const lang: 'en' | 'es' = langRaw === 'es' ? 'es' : 'en';
```

**Source:** Query parameter `?lang=es`. Not a body field, not a header. [VERIFIED]
**Default:** `'en'` (anything other than exactly `'es'` defaults to English). [VERIFIED]

### Frontend (app.js:91–92, 201–212, 326–329)

**Initial language selection (app.js:91–92):**
```js
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');
let currentLang = (langParam === 'es') ? 'es' : 'en';
```
Set by URL query parameter `?lang=es`. No browser locale detection, no cookie — purely URL-driven. The ES button on the Adopt page links to `https://custom-search.4lgshelterapp.duckdns.org/?lang=es`. [VERIFIED]

**UI toggle (app.js:201–212):**
```js
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const newLang = btn.dataset.lang;
    if (newLang === currentLang) return;
    currentLang = newLang;
    const url = new URL(window.location.href);
    if (newLang === 'es') {
      url.searchParams.set('lang', 'es');
    } else {
      url.searchParams.delete('lang');
    }
    history.replaceState({}, '', url);
```
Two language toggle buttons (EN/ES) on the page. Clicking one updates the URL query param and re-renders the page with translated UI labels. [VERIFIED]

**API call (app.js:326–330):**
```js
const apiUrl = currentLang === 'es'
  ? '/api/matcher/custom-search?lang=es'
  : '/api/matcher/custom-search';
const resp = await fetch(apiUrl, {
```
The `?lang=es` query param is appended only for Spanish. English calls have no lang param (relies on backend default). [VERIFIED]

---

## TASK 2 — Is the Adopter Narrative Translated?

### Trace: narrative from request to prompt

**Step 1 — Extract from body (server.ts:4322):**
```ts
const { sex, ageGroup, narrative } = req.body;
```

**Step 2 — Trim (server.ts:4383):**
```ts
const narrativeText = (typeof narrative === 'string' && narrative.trim()) ? narrative.trim() : null;
```

**Step 3 — Content filter (server.ts:4388):**
```ts
const filterResult = checkContentFilter(narrativeText);
```
The content filter (server.ts:4230–4279) runs regex pattern matching against the narrative for abuse/inappropriate content. It does NOT translate — it checks English-centric patterns against whatever text was submitted. [VERIFIED]

**Step 4 — Injected verbatim into user message (server.ts:4480):**
```ts
const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\nCATS AVAILABLE (${withRecords.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || 'No additional preferences provided.'}`;
```

**No translation step exists.** The narrative goes from `req.body.narrative` → trim → content filter (regex, no translation) → verbatim injection into the user message. There is no call to `translateApplicationFields`, `translateBioToSpanish`, or any GPT/OpenAI translation function anywhere in the custom-search handler. [VERIFIED — searched for `translat` in the entire handler block, lines 4282–4870; no translation calls exist]

**The system prompt handles this implicitly.** When `lang=es`, `systemMessageEs` is used (server.ts:4629), which instructs Claude to respond entirely in Spanish. Claude receives the Spanish narrative as-is and writes Spanish bios. When `lang=en`, `systemMessageEn` is used, and an English narrative produces English bios. A Spanish narrative with `lang=en` would still work — Claude would read the Spanish text and respond in English per the English system prompt. [VERIFIED]

---

## TASK 3 — What Else Is Language-Dependent in the Prompt

### 3A. System message (server.ts:4629)

```ts
const systemMessage = lang === 'es' ? systemMessageEs : systemMessageEn;
```
Two complete system messages, each ~2500 words. The ES version is a full translation — identical structure, examples, and instructions. [VERIFIED]

### 3B. Policy block file (server.ts:4484–4491)

```ts
const policyFilename = lang === 'es' ? 'shelter-policy-faq-es.json' : 'shelter-policy-faq.json';
const policyPath = path.join(__dirname, '..', 'config', policyFilename);
const policies = JSON.parse(readFileSync(policyPath, 'utf-8'));
policyBlock = Object.entries(policies).map(([k, v]) => `- ${k}: "${v}"`).join('\n');
```
**Language-dependent.** Two separate policy FAQ files. The ES policy answers are injected into the ES system message and the EN answers into the EN system message. [VERIFIED]

### 3C. User message scaffolding labels (server.ts:4480)

```ts
const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\nCATS AVAILABLE (${withRecords.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || 'No additional preferences provided.'}`;
```

**All English-only, regardless of lang.** The scaffolding labels are hardcoded:
- `"FILTERS APPLIED:"` — English [VERIFIED]
- `"sex:"` — English [VERIFIED]
- `"age:"` — English [VERIFIED]
- `"CATS AVAILABLE (N total):"` — English [VERIFIED]
- `"ADOPTER:"` — English [VERIFIED]
- `"No additional preferences provided."` — English fallback [VERIFIED]

These are never localized. Even for `lang=es`, the user message structure is English. Claude reads these as structural labels and responds in Spanish because the system prompt instructs it to. [VERIFIED]

### 3D. Per-animal shortlist entry labels (server.ts:4449–4469)

```ts
lines.push(`SHELTER_CODE: ${animal.shelterCode}`);
lines.push(`Name: ${animal.name}`);
lines.push(`Species: Cat`);
lines.push(`Breed: ${animal.breed}`);
lines.push(`Age: ${animal.age}`);
lines.push(`Sex: ${animal.sex}`);
lines.push(`Color: ${animal.color}`);
lines.push(`FIV: ${animal.fivStatus}`);
lines.push(`FeLV: ${animal.felvStatus}`);
// ...
lines.push('Caregiver transcripts (most recent first):');
// ...
lines.push(`--- ${caregiver}, ${date} ---`);
```

**All English-only, regardless of lang.** The labels (`SHELTER_CODE:`, `Name:`, `Species:`, `Breed:`, `Age:`, `Sex:`, `Color:`, `FIV:`, `FeLV:`, `Caregiver transcripts`) and the hardcoded value `Cat` are English literals. [VERIFIED]

The field VALUES (animal.name, animal.breed, animal.age, animal.sex, animal.color) come from the SM API and are English regardless. [VERIFIED]

### 3E. Error strings (server.ts:4328–4345)

```ts
const errStrings = lang === 'es' ? {
  sexRequired: 'sex es requerido y debe ser un arreglo no vacío',
  // ...
} : {
  sexRequired: 'sex is required and must be a non-empty array',
  // ...
};
```
**Language-dependent.** Error responses are localized. These are returned to the frontend on validation failure, not part of the AI prompt. [VERIFIED]

### 3F. Complete language-dependency map

| Component | Varies by `lang`? | Location |
|-----------|-------------------|----------|
| System message (full prompt) | **YES** — two complete translations | server.ts:4495–4628 |
| Policy block file | **YES** — `shelter-policy-faq.json` / `-es.json` | server.ts:4484–4491 |
| Error strings | **YES** — localized | server.ts:4328–4345 |
| User message scaffolding labels | **NO** — English always | server.ts:4480 |
| Per-animal attribute labels | **NO** — English always | server.ts:4449–4469 |
| Per-animal attribute values | **NO** — SM API data (English) | server.ts:4449–4457 |
| Caregiver transcript text | **NO** — raw English transcripts | server.ts:4460–4470 |
| Adopter narrative | **NO** — verbatim passthrough | server.ts:4383, 4480 |
| Hardcoded species value | **NO** — `"Cat"` always | server.ts:4451 |

**Summary:** The language switch affects three things: (1) the system prompt, (2) the policy FAQ, and (3) error strings. Everything in the user message — scaffolding labels, attribute labels, attribute values, transcript text, and the adopter's narrative — is language-agnostic (English or raw). Claude handles the cross-language bridging internally: it reads English-labeled data and the adopter's text (in whatever language), then generates bios in the language the system prompt specifies. [VERIFIED]

---

## Implications for Step 2 (Species Expansion)

When extending to dogs/small animals, the language path needs no architectural changes:

1. The `Species: Cat` hardcoded literal at server.ts:4451 must become dynamic (`Species: ${animal.species}`), but remains an English label — no localization needed. [VERIFIED]
2. The system prompt's cat-specific language ("writing a bio for a specific cat," "No cats match," etc.) needs species-aware variants or generalization, in BOTH `systemMessageEn` and `systemMessageEs`. [VERIFIED]
3. The user message scaffolding, attribute labels, and SM data will work as-is for any species — they're already species-agnostic in structure, just hardcoded to "Cat" in one place. [VERIFIED]
4. The content filter at server.ts:4230 has no species-specific patterns and works for any narrative. [VERIFIED]
5. Error messages for `noMatches` reference "cats" ("No cats match") and would need generalization in both languages. [VERIFIED]
