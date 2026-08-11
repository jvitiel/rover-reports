# Adoption PDF Sample Send — Test Results

**Date:** 2026-08-11 16:15 UTC

---

## Send Result

**Resend message ID:** `4521d2e9-0c37-4dc8-b8df-1838d87f6d37` [VERIFIED — Resend API response `data.id`]

- **Recipient:** single test address (no Cc/Bcc)
- **Subject:** `[TEST] Adoption PDF sample — 21+ attestation (EN + ES)`
- **From:** Production sender address (emailService.ts:29 value)
- **Attachments:** Two PDFs — synthetic EN (id 999998) and ES (id 999999) applications with `form_data_json: { age_confirmed: 'on' }`
- **Method:** Direct `Resend.emails.send()` — did NOT call `sendApplicationEmail`, did NOT reference `ADOPTION_TO_EMAILS`

---

## Row Count Verification

| Checkpoint | COUNT(*) |
|------------|----------|
| Before     | 73       |
| After      | 73       |

**No adoption_applications row was created.** [VERIFIED — before/after SELECT COUNT(*) both return 73]

---

## Cleanup

- EN PDF (`999998-TEST_Sample_Applicant-2026-08-11.pdf`): deleted ✓
- ES PDF (`999999-TEST_Sample_Applicant-2026-08-11.pdf`): deleted ✓
- Throwaway script (`/tmp/send-test-sample.mjs`): deleted ✓
- No tracked source files were edited or committed
