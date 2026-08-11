# Adoption PDF Sample-Send Path — Diagnosis

**Date:** 2026-08-11 (read-only)

---

## 1. Send Primitive

There is no single shared "send email" wrapper. Each email function calls `getResend().emails.send(...)` directly with an inline payload. The adoption staff notification function is:

```typescript
// emailService.ts:49
export async function sendApplicationEmail(
  app: AdoptionApplication,
  pdfPath: string
): Promise<boolean>
```

Inside, it reads the PDF file and calls Resend directly (`emailService.ts:154-165`):

```typescript
const pdfBuffer = readFileSync(pdfPath);              // :55 — Buffer
const pdfFilename = path.basename(pdfPath);            // :56

const { data, error } = await getResend().emails.send({
  from: FROM_EMAIL,                                    // :155
  to: ADOPTION_TO_EMAILS,                             // :156 — hardcoded array
  subject: `New Adoption Application: ...`,            // :157
  html: htmlBody,                                      // :158
  text: textBody,                                      // :159
  attachments: [{                                      // :160-164
    filename: pdfFilename,   // string
    content: pdfBuffer,      // Buffer (from readFileSync)
  }],
});
```

**Attachments shape:** `{ filename: string, content: Buffer }` — raw Buffer from `readFileSync`, not base64, not a file path. [VERIFIED — emailService.ts:55-56, 160-164]

**Can the primitive take a custom single recipient?** `sendApplicationEmail` hardcodes `to: ADOPTION_TO_EMAILS` (the 3-address array at line 30). It does NOT accept a recipient parameter. To send to a custom single recipient, you must call `getResend().emails.send(...)` directly — it accepts `to: string | string[]`. The `getResend()` function is module-scoped (not exported), but the Resend SDK is imported at the top of the file. For a one-off test script, you'd either: (a) import the Resend SDK directly and instantiate with the API key, or (b) write a throwaway function inside emailService.ts. [VERIFIED — emailService.ts:17-26 (getResend not exported), emailService.ts:156 (hardcoded to)]

**Does sendApplicationEmail call a lower primitive?** No. It calls `getResend().emails.send()` directly — there is no intermediary. [VERIFIED — emailService.ts:154]

---

## 2. FROM + ENV

**From address:** The verified sender domain address configured at emailService.ts:29. [VERIFIED — emailService.ts:29]

**SANDBOX_MODE:** `false`. The check compares FROM_EMAIL against the Resend sandbox sender; the production from-address does not match, so SANDBOX_MODE is false. [VERIFIED — emailService.ts:35]

**RESEND_API_KEY:** Present. `getResend()` reads from the secrets file at `secrets.resend.apiKey` and throws if missing. The service is actively sending emails (adoption confirmations, intake alerts), so the key is present and valid. [VERIFIED — emailService.ts:19-24, confirmed by production email sends]

---

## 3. PDF Standalone — generateApplicationPdf

**Signature and return type** (`pdfGenerator.ts:44`):

```typescript
export async function generateApplicationPdf(app: AdoptionApplication): Promise<string>
```

Returns the file path (string) of the generated PDF. [VERIFIED — pdfGenerator.ts:44, :302 `resolve(filepath)`]

**Output path:** `{PDF_DIR}/{id}-{sanitized_name}-{date}.pdf` where PDF_DIR is `/home/shelter/shelter-apps/adoption-pdfs`. [VERIFIED — pdfGenerator.ts:9, :43-45]

### Fields dereferenced WITHOUT guard (would throw or render badly if undefined):

| Field | Usage | Line | Risk |
|-------|-------|------|------|
| `app.applicant_name` | `sanitizeFilename(app.applicant_name)` in filename | :43 | TypeError if undefined — sanitizeFilename calls `.replace()` |
| `app.id` | Template literal `${app.id}` in filename + header | :44, :133 | Renders as `undefined` (cosmetic, no throw) |
| `app.language_submitted` | `=== 'es'` check | :79 | Safe — falsy just skips the block |
| `app.animal_type` | `=== 'cat'` / `'dog'` / `'small_animal'` checks | :166-181 | Safe — falsy skips all species blocks |
| `app.children` | `=== 'yes'` check | :191 | Safe |
| `app.residence_owned` | `=== 'rented'` check | :200 | Safe |
| `app.had_pets_before` | `=== 'yes'` check | :213 | Safe |
| `app.digital_signature_name` | Direct text render | :296 | Renders as `undefined` string (cosmetic, no throw) |
| `app.form_data_json` | `app.form_data_json ? JSON.parse(...) : {}` | :278 | Safe — guarded by ternary + try/catch |

### Minimum fields for no-error render:

```typescript
{
  applicant_name: '<any-string>',        // required — sanitizeFilename will throw on undefined
  animal_type: 'cat',                    // required by type, but won't throw if undefined
  applicant_email: '<any-email>',        // required by type
  applicant_phone_cell: '<any-phone>',   // required by type
  applicant_address: '<any-address>',    // required by type
  digital_signature_name: '<any-name>',  // required by type, rendered unguarded
  language_submitted: 'en',             // required by type (union 'en' | 'es')
  status: 'pending',                    // required by type
}
```

All other fields are optional in the interface and rendered through `fieldRow(label, value)` which displays `value || '—'`. They will not throw. [VERIFIED — pdfGenerator.ts:98-107, types.ts:275-400]

### age_confirmed from form_data_json:

Confirmed. The new block at `pdfGenerator.ts:277-283` parses `app.form_data_json` and extracts `fd.age_confirmed === 'on' ? 'Yes' : 'No'`, with try/catch fallback to `'—'`. [VERIFIED — pdfGenerator.ts:277-283]

---

## 4. No Side Effects

**generateApplicationPdf:** Zero DB calls. No imports of localDatabase. No INSERT/UPDATE/DELETE. The only I/O is writing the PDF file to disk. [VERIFIED — pdfGenerator.ts full file, grep for INSERT/UPDATE/DELETE/run/exec/save/insert returns zero matches]

**getResend().emails.send():** Pure Resend API call. No DB interaction. The only email function that touches the DB is `sendIntakeAlertEmail` which calls `markIntakeEmailSent` (emailService.ts:633) — but that is a separate function, not part of the send primitive. `sendApplicationEmail` does NOT write to the DB. [VERIFIED — emailService.ts:49-175, no DB import or call]

**Answer:** Neither `generateApplicationPdf` nor a direct `getResend().emails.send()` call creates any `adoption_applications` row. [VERIFIED]

---

## Summary — One-Off Test Send Recipe

1. Build a minimal synthetic `AdoptionApplication` object in memory (minimum fields above + `form_data_json: JSON.stringify({ age_confirmed: 'on' })`)
2. Call `generateApplicationPdf(syntheticApp)` → get `/tmp/test-*.pdf` path (override PDF_DIR or move after)
3. `readFileSync(pdfPath)` → Buffer
4. `new Resend(apiKey).emails.send({ from: FROM_EMAIL, to: ['<single-test-recipient>'], subject: '...', html: '...', text: '...', attachments: [{ filename: path.basename(pdfPath), content: pdfBuffer }] })`
5. Delete temp PDF

No DB row created at any step.
