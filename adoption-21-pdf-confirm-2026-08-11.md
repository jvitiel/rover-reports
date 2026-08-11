# Adoption PDF — age_confirmed Render-Path Confirmation

**Date:** 2026-08-11 (read-only diagnosis)

---

## 1. getAdoptionApplication — does the returned object include form_data_json?

**Definition:** `localDatabase.ts:2093-2097`

```typescript
export function getAdoptionApplication(id: number): AdoptionApplication | null {
  const database = getDatabase();
  const row = database.prepare(`SELECT * FROM adoption_applications WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToAdoptionApplication(row);
}
```

The query is `SELECT *` — all columns, including `form_data_json`. [VERIFIED — localDatabase.ts:2095]

The `rowToAdoptionApplication` helper (`localDatabase.ts:2178-2268`) explicitly maps `form_data_json`:

```typescript
form_data_json: row.form_data_json as string | undefined,  // localDatabase.ts:2265
```

The `AdoptionApplication` interface (`types.ts:389`) declares:

```typescript
form_data_json?: string;  // types.ts:389
```

**Answer:** Yes — `getAdoptionApplication` returns `form_data_json` as a raw JSON string (or undefined). [VERIFIED — localDatabase.ts:2095 (SELECT *), localDatabase.ts:2265 (mapping), types.ts:389 (interface)]

---

## 2. pdfGenerator.ts — is form_data_json available and used?

**Function signature:** `pdfGenerator.ts:44`

```typescript
export async function generateApplicationPdf(app: AdoptionApplication): Promise<string>
```

The parameter `app` is typed `AdoptionApplication`, which includes `form_data_json?: string`. So the raw JSON string IS present on the object passed to the PDF generator. [VERIFIED — pdfGenerator.ts:44, types.ts:389]

**Is form_data_json parsed or read anywhere in pdfGenerator.ts today?**

No. A full read of pdfGenerator.ts (313 lines) shows zero references to `form_data_json`. The file does not call `JSON.parse` on it, does not access `app.form_data_json`, and does not extract any keys from it. All rendered fields come from the named properties of the `AdoptionApplication` object (e.g., `app.applicant_name`, `app.willing_followup`, etc.). [VERIFIED — full file read, 0 matches for `form_data_json`]

**Answer:** `form_data_json` is present on the record object as a raw JSON string but is never parsed or read by pdfGenerator.ts. [VERIFIED — pdfGenerator.ts full file, zero references]

---

## 3. Agreements section + helper signatures

### Agreements render block (`pdfGenerator.ts:273-275`):

```typescript
sectionHeader('Agreements');                                                          // :272
fieldRow('Willing to Follow Animal Control Laws?', formatYesNo(app.willing_animal_control_laws));  // :273
fieldRow('Willing to Sign Adoption Papers?', formatYesNo(app.willing_sign_papers));                // :274
fieldRow('Willing to Allow Follow-up Visits?', formatYesNo(app.willing_followup));                 // :275
```

No `age_confirmed` line exists in this block or anywhere else in the file. [VERIFIED — pdfGenerator.ts:272-275]

### fieldRow helper (`pdfGenerator.ts:98-107`):

```typescript
const fieldRow = (label: string, value: string | undefined, width: number = 512) => {
  if (y > 735) { doc.addPage(); y = 50; }
  doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold')
     .text(label + ':', 50, y, { continued: false });
  doc.fontSize(10).fillColor(VALUE_BLUE).font('Helvetica')
     .text(value || '—', 50, y + 12, { width: width - 10 });
  const valueHeight = doc.heightOfString(value || '—', { width: width - 10 });
  y += 12 + valueHeight + 3;
};
```

Renders `value || '—'` — displays the value as-is if truthy, or `—` if falsy. [VERIFIED — pdfGenerator.ts:98-107]

### formatYesNo helper (`pdfGenerator.ts:37-40`):

```typescript
function formatYesNo(value: string | undefined): string {
  if (!value) return '—';
  return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
}
```

**Mapping behavior:**

| Input         | Output |
|---------------|--------|
| `undefined`   | `—`    |
| `null`        | `—`    |
| `""`          | `—`    |
| `"yes"`       | `Yes`  |
| `"Yes"`       | `Yes`  |
| `"no"`        | `No`   |
| `"on"`        | `No`   |
| `"true"`      | `No`   |
| anything else | `No`   |

**Critical finding:** The stored value for `age_confirmed` is the string `"on"` (standard HTML checkbox). `formatYesNo("on")` returns `"No"` because `"on".toLowerCase() !== "yes"`. If `age_confirmed` is rendered via `formatYesNo`, it will display as "No" — incorrect. It must either use a checkbox-aware formatter (e.g., map `"on"` → `"Yes"`) or render via `fieldRow` directly (which would display the raw string `"on"`). [VERIFIED — pdfGenerator.ts:37-40]

[VERIFIED — pdfGenerator.ts:37-40]

---

## 4. age_confirmed key — EN and ES submissions

### Form definitions

Both forms use identical HTML `name` attribute:

**English** (`adoption-form.html:620`):
```html
<input type="checkbox" name="age_confirmed" required>
```

**Spanish** (`adoption-pdfs/test-adoption-es.html:643`):
```html
<input type="checkbox" name="age_confirmed" required>
```

The `name` attribute is `age_confirmed` in both languages. Only the label text differs. [VERIFIED — adoption-form.html:620, test-adoption-es.html:643]

### DB verification — Spanish submissions

```sql
SELECT id, language_submitted, json_extract(form_data_json, '$.age_confirmed')
FROM adoption_applications WHERE language_submitted = 'es' ORDER BY id DESC LIMIT 3;
```

| id | language_submitted | age_confirmed |
|----|-------------------|---------------|
| 82 | es                | on            |
| 66 | es                | on            |
| 65 | es                | on            |

[VERIFIED — SELECT on adoption_applications, ids 82, 66, 65]

**Answer:** The key is `age_confirmed` with value `"on"` for both EN and ES submissions. Confirmed in form HTML (same `name` attribute) and in DB (Spanish records have identical key/value). [VERIFIED]

---

## Summary of findings for implementation

To render `age_confirmed` on the PDF, the fix needs:

1. **form_data_json is available** on the `app` object in `generateApplicationPdf` as a raw JSON string. [VERIFIED]
2. **form_data_json is never parsed** in pdfGenerator.ts today — a `JSON.parse(app.form_data_json)` call would be needed to extract `age_confirmed`. [VERIFIED]
3. **formatYesNo will misrender** the value: `"on"` maps to `"No"`. A checkbox-aware helper is needed (e.g., treat `"on"` as `"Yes"`). [VERIFIED]
4. **The key is `age_confirmed`** for both EN and ES. [VERIFIED]

Alternative path: add `age_confirmed` as a dedicated property to `AdoptionApplication` (types.ts), map it in the server handler (server.ts), and map it in `rowToAdoptionApplication` (localDatabase.ts) — rather than parsing `form_data_json` at render time. This is the pattern used by all other fields.
