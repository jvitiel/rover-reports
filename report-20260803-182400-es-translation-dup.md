# Spanish Adoption Application Translation Failure — Diagnosis

**Date:** 2026-08-03
**Scope:** Read-only diagnosis, SELECT-only DB access
**Records:** Record A (earlier), Record B (later) — same applicant, two distinct submissions

---

## 1. Table & Records

**Table:** `adoption_applications`

| | Record A | Record B |
|---|---|---|
| **Row ID** | 65 | 66 |
| **created_at** | 2026-08-03T16:36:57.805Z | 2026-08-03T17:22:57.650Z |
| **Gap** | — | ~46 minutes after Record A |
| **language_submitted** | `es` | `es` |
| **translated** | `1` | `1` |
| **pdf_generated** | `1` | `1` |
| **email_sent** | `1` | `1` |

**Conclusion:** Two distinct rows (COUNT = 2), two genuine submissions from the same applicant. [VERIFIED — `SELECT id, submitted_at FROM adoption_applications WHERE id IN (65, 66)` returns two distinct rows with different timestamps and different primary keys.] The trailing-space difference in the applicant name field between records (Record A: 25 chars, Record B: 24 chars) confirms separate form entries, not a system duplication. [VERIFIED — `SELECT id, length(applicant_name) FROM adoption_applications WHERE id IN (65, 66)` returns 25 and 24.]

**Note:** The `_original_es` key pattern (used to preserve Spanish originals) does NOT exist in adoption applications. That pattern is only used for volunteer applications (server.ts:9919). Adoption translation overwrites fields in-place before saving. [VERIFIED — `SELECT id, json_extract(form_data_json, '$._original_es') IS NOT NULL FROM adoption_applications WHERE id IN (65, 66)` returns 0 for both.]

---

## 2. Translation & Banner Code Path

### Translation timing: submit-time (stored in DB)

Translation occurs at submit-time, not PDF-generation-time. The translated values are written to the DB, and the PDF reads from the DB.

**Flow (server.ts:9308–9370):**

1. **Detection** — `language_submitted` is set from the form body at server.ts:9217:
   ```
   language_submitted: body.language === 'es' ? 'es' : 'en'
   ```

2. **Translation call** — server.ts:9308–9354: if `application.language_submitted === 'es'`, the handler calls `translateApplicationFields()` (attributeParser.ts:459) with 26 free-text field values. This function sends them to GPT-4o requesting a JSON object with the same keys but English translations.

3. **Apply translations** — server.ts:9344–9349: the returned JSON entries are iterated and written onto the `application` object, overwriting Spanish values with English:
   ```typescript
   for (const [key, value] of Object.entries(translated)) {
     if (value) {
       (application as unknown as Record<string, unknown>)[key] = value;
     }
   }
   ```

4. **Flag set** — server.ts:9350: `application.translated = true` is set unconditionally after the apply loop (within the try block).

5. **Save** — server.ts:9370 calls `saveAdoptionApplication(application)` which writes all individual columns from the application object.

6. **PDF generation** — server.ts:9375–9385: re-reads the saved record from DB via `getAdoptionApplication(applicationId)` and passes it to `generateApplicationPdf(savedApp)`. The PDF renders whatever is in the DB columns.

### Banner is INDEPENDENT of translation success

**pdfGenerator.ts:79–84:**
```typescript
if (app.language_submitted === 'es') {
  doc.rect(50, y, 512, 25).fill('#FFF3CD');
  doc.fontSize(10).fillColor('#856404').font('Helvetica-Bold')
     .text('⚠ Originally submitted in Spanish / Originalmente enviado en español', 60, y + 7);
}
```

The banner is stamped based solely on `language_submitted === 'es'`. It does NOT check whether `translated === 1` or whether any fields were actually translated to English. [VERIFIED — pdfGenerator.ts:79, condition is `app.language_submitted === 'es'` only.]

**The same banner pattern appears in emailService.ts:83,91,137** for the email HTML and plaintext versions. [VERIFIED — emailService.ts:83,91,137.]

**Result:** The banner will appear on BOTH a successfully translated application AND one where translation failed but `language_submitted` was set to `es`. The banner is cosmetically correct (it says the app was "originally submitted in Spanish") but misleading — it implies the visible content is a translation, when it may still be the original Spanish.

### Success logging is misleading

**attributeParser.ts:504–507:**
```typescript
const translated = JSON.parse(content);
console.log(`[Parser] Successfully translated application fields`);
return translated;
```

"Successfully translated" means only that GPT-4o returned valid JSON. It does NOT verify that the returned values are actually English, that the keys match the input keys, or that the values differ from the input. An empty object `{}`, a partial object, or a JSON object with Spanish text back would all log "Successfully translated". [VERIFIED — attributeParser.ts:504–507.]

---

## 3. Stored Content Per Record

Language detected via presence of Spanish diacritics (á, é, í, ó, ú, ñ) and Spanish/English stop-word patterns in free-text columns (plan_if_moving, not_get_along_plan, intro_precautions, where_kept_when_away):

| | Record A (id 65) | Record B (id 66) |
|---|---|---|
| **Free-text fields populated** | Yes | Yes |
| **Content language** | English | Spanish |
| **Spanish diacritics present** | No | Yes |
| **English stop-words detected** | Yes | No |
| **Spanish stop-words detected** | No | Yes |
| **`translated` flag** | 1 | 1 |

**Conclusion:** Record A was successfully translated — free-text columns contain English. Record B was NOT translated — free-text columns still contain Spanish despite `translated = 1`. [VERIFIED — `SELECT id, CASE WHEN plan_if_moving LIKE '%á%' ... THEN 'has_diacritics' ELSE 'no_diacritics' END FROM adoption_applications WHERE id IN (65, 66)` returns no_diacritics for 65, has_diacritics for 66.]

The `form_data_json` column for both records contains the original submitted body (always Spanish, set before translation at server.ts:9304), which is expected.

---

## 4. Logs Around Record B

**Window searched:** 2026-08-03 17:12:00 – 17:33:00 UTC (±10 min around Record B's 17:22:57)

**journalctl -u shelter-app output for adoption/translation events:**

```
17:22:52 POST /api/adoption-application
17:22:52 [Adoption] Translating Spanish submission to English...
17:22:52 [Parser] Translating 15 adoption application fields from Spanish
17:22:57 [Parser] Successfully translated application fields
17:22:57 [Adoption] Translation complete
17:22:57 [Database] Saved adoption application 66
17:22:57 [Adoption] Generating PDF...
17:22:57 [PDF] Generated: .../66-...-2026-08-03.pdf
17:22:57 [Adoption] Sending email notifications...
17:22:58 [Adoption] Staff notification sent successfully
17:22:58 [Adoption] Applicant confirmation sent successfully
```

**Error/failure/timeout/429 in window:** NONE. [VERIFIED — `journalctl -u shelter-app --since "2026-08-03 17:12:00" --until "2026-08-03 17:33:00" | grep -iE "error|fail|timeout|429|rate|exception"` returned zero adoption-related matches.]

**Clean window.** No translation API errors, no timeouts, no rate limits. The GPT-4o call completed in ~5 seconds (17:22:52 → 17:22:57), same as Record A (16:36:52 → 16:36:57).

---

## 5. Root Cause Analysis

**Proximate cause:** GPT-4o returned valid JSON that was parsed and logged as "successful", but the returned values did not result in English text being stored in the DB columns. [INFERRED — the log shows no error, `translated=1` was set, but DB content is Spanish; the only explanation consistent with all evidence is that GPT-4o either returned Spanish text as-is, returned keys that didn't match the input keys, or returned empty/null values that failed the `if (value)` guard.]

**The code has three gaps that allowed this silent failure:**

1. **No translation validation** (attributeParser.ts:504): The function logs "Successfully translated" when `JSON.parse()` succeeds, regardless of content quality. It does not verify the output language or key matching.

2. **`translated` flag set unconditionally** (server.ts:9350): The flag is set to true after the apply loop runs, whether or not any fields were actually overwritten. A no-op apply (GPT returns `{}` or mismatched keys) still sets `translated = 1`.

3. **Banner decoupled from translation outcome** (pdfGenerator.ts:79): The "translated from Spanish" banner is stamped based on `language_submitted`, not on whether translation actually occurred. Both PDFs show the banner, but only Record A's PDF has English content.

**Why two submissions:** The applicant submitted the form twice, ~46 minutes apart. This is a genuine double submission, not a system bug creating duplicates. The trailing-space difference in the name field and different `submitted_at` timestamps confirm separate form entries. [VERIFIED]

**Why Record A worked but Record B didn't:** Both used the same code path, same model (GPT-4o), same field count (15). The difference is in GPT-4o's non-deterministic output. The exact GPT response content is not logged, so the specific failure mode (returned Spanish, wrong keys, or empty values) cannot be determined definitively. [INFERRED]

---

## 6. Summary

1. **Two distinct submissions** (row count = 2, ids 65 and 66), not one row surfaced twice. Same applicant, ~46 min apart.
2. **Translation is submit-time** (stored in DB). Banner is set independently of translation success — it checks only `language_submitted === 'es'`, not whether fields were actually translated.
3. **Record B translation failure was silent.** GPT-4o returned valid JSON (no API error, no timeout, clean log window), but the content did not result in English text being saved. The `translated` flag was set to 1 despite this. The code does not validate GPT output language or key matching.
