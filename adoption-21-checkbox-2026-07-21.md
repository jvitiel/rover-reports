# Adoption Application — Missing "21 Years Old" Checkbox on PDF

**Date:** 2026-08-11 (read-only diagnosis)
**Scope:** Trace the age-attestation checkbox from form → server → DB → PDF

---

## 1. FORM FIELD

The online adoption form defines a required checkbox with `name="age_confirmed"`:

**English form** (`adoption-form.html:620-621`):
```html
<input type="checkbox" name="age_confirmed" required>
<span>I confirm that I am at least 21 years of age</span>
```

**Spanish form** (`adoption-pdfs/test-adoption-es.html:643-644`):
```html
<input type="checkbox" name="age_confirmed" required>
<span>Confirmo que tengo al menos 21 años de edad</span>
```

The field is listed in the form's `REQUIRED_CHECKBOXES` array (`adoption-form.html:1341`) and validated client-side before submission. The form JS collects it via `FormData` → `JSON.stringify(data)` and POSTs it to the server.

**Field name:** `age_confirmed` [VERIFIED — adoption-form.html:620]
**Submitted value:** `"on"` (standard HTML checkbox behavior) [VERIFIED — form_data_json in DB, see §3]

---

## 2. SERVER CAPTURE

The adoption submission handler is at `server/src/server.ts:9216-9302`. It builds an `AdoptionApplication` object by mapping `body.*` fields to named properties.

**`age_confirmed` is NOT referenced in the handler.** The handler maps ~60 fields explicitly (applicant_name, applicant_email, etc.) but has no line for `age_confirmed`. [VERIFIED — `grep -rn 'age_confirmed' server/src/*.ts` returns zero matches]

The `AdoptionApplication` interface (`server/src/types.ts:275`) has no `age_confirmed` property. [VERIFIED — types.ts:275-380, field absent]

The `adoption_applications` table schema has no `age_confirmed` column. [VERIFIED — `SELECT sql FROM sqlite_master WHERE name='adoption_applications'`]

**However**, the handler saves the entire request body as:
```typescript
form_data_json: JSON.stringify(body),  // server.ts:9302
```

This means `age_confirmed` IS persisted — but only inside the `form_data_json` JSON blob, not as a dedicated column.

---

## 3. DB STATE

**Storage location:** Inside `form_data_json` (TEXT column containing full POST body as JSON). No dedicated column. [VERIFIED — schema inspection]

**Two most recent records (ids 83 and 84):**

| id | `json_extract(form_data_json, '$.age_confirmed')` | Populated? |
|----|---------------------------------------------------|------------|
| 83 | `on`                                              | Yes        |
| 84 | `on`                                              | Yes        |

[VERIFIED — `SELECT id, json_extract(form_data_json, '$.age_confirmed') FROM adoption_applications WHERE id IN (83, 84)`]

All 5 most recent records (ids 80-84) have `age_confirmed = "on"` in form_data_json. [VERIFIED]

---

## 4. PDF RENDER

`server/src/pdfGenerator.ts` generates the adoption application PDF. It renders fields using `fieldRow(label, app.property)` calls.

**`age_confirmed` is NOT referenced anywhere in pdfGenerator.ts.** [VERIFIED — `grep -n 'age_confirmed\|age_confirm\|ageConfirm\|is_21\|over_21' server/src/pdfGenerator.ts` returns zero matches]

The "Agreements" section (pdfGenerator.ts:273-275) renders three agreement checkboxes:
```
fieldRow('Willing to Follow Animal Control Laws?', formatYesNo(app.willing_animal_control_laws));  // :273
fieldRow('Willing to Sign Adoption Papers?', formatYesNo(app.willing_sign_papers));                // :274
fieldRow('Willing to Allow Follow-up Visits?', formatYesNo(app.willing_followup));                 // :275
```

The age attestation is absent from this section and from every other section of the PDF. [VERIFIED — full grep of pdfGenerator.ts for "21", "age", "confirm", "older" returns only `age_preference` (line 163), which is a different field]

---

## 5. FINDING

**(a) Stored in DB but absent from pdfGenerator → PDF render omission.** [VERIFIED]

The field `age_confirmed` is:
- ✅ Present on the form (adoption-form.html:620)
- ✅ Submitted by the client as part of the POST body
- ❌ NOT mapped to a dedicated column or named property in the server handler (server.ts:9216-9302)
- ✅ Preserved in `form_data_json` (the full body dump) — value `"on"` for all recent records
- ❌ NOT referenced in `pdfGenerator.ts` — never rendered on the PDF

**Root cause chain:** The field was added to the HTML form but never added to (1) the `AdoptionApplication` TypeScript interface, (2) the server handler's field mapping, or (3) the PDF generator. It survives only because `form_data_json: JSON.stringify(body)` captures the entire POST body as a catch-all.

**To fix:** Add `age_confirmed` to the `AdoptionApplication` interface (types.ts), the server handler mapping (server.ts), and a `fieldRow` call in pdfGenerator.ts (likely in the Agreements section or at the top of the Applicant Info section).
