# Adoption PDF — age_confirmed Render Fix

**Date:** 2026-08-11
**Scope:** Single-file edit to `server/src/pdfGenerator.ts`

---

## 1. Edit Applied

Added after `willing_followup` fieldRow (`pdfGenerator.ts:275`), before the Digital Signature section:

```typescript
    // Age attestation (stored in form_data_json, not a dedicated column)
    let ageConfirmedDisplay = '—';
    try {
      const fd = app.form_data_json ? JSON.parse(app.form_data_json) : {};
      ageConfirmedDisplay = fd.age_confirmed === 'on' ? 'Yes' : 'No';
    } catch {
      ageConfirmedDisplay = '—';
    }
    fieldRow('Confirmed 21 Years or Older?', ageConfirmedDisplay);
```

No other lines in the file were modified. [VERIFIED — `git diff` shows 10 insertions, 0 deletions, all within the Agreements section]

---

## 2. Build

```
cd /home/shelter/shelter-apps/server && npm run build
```

**Exit code: 0** (clean, no errors or warnings) [VERIFIED]

---

## 3. Render Verification

Generated PDF for existing record id 82 (ES submission) using compiled `generateApplicationPdf`. Extracted text with `pdftotext`:

```
pdftotext <temp.pdf> - | grep -A2 -B1 "21 Years"
```

Output:
```
Yes
Confirmed 21 Years or Older?:

Yes
```

**Age attestation line is present. Value: Yes.** [VERIFIED — `pdftotext` extraction of temp PDF for record 82, ES submission with `age_confirmed = "on"` in form_data_json]

Temp PDF deleted after verification. No PDF remains in the adoption-pdfs directory from this test.

---

## 4. Restart

```
sudo -n systemctl restart shelter-app  → exit 0
systemctl is-active shelter-app        → active
```

**Status: active** [VERIFIED]

---

## 5. Commit

```
git add src/pdfGenerator.ts
git commit -m "Render age_confirmed (21+ attestation) on adoption PDF from form_data_json"
```

**Commit hash: `be3c80e`** [VERIFIED]

`git push` returned "No configured push destination" — no remote configured for this repo. Local commit stands. This is expected.
