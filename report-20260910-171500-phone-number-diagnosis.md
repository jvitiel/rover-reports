# Phone Number Correction Diagnosis — Read-Only

**Date:** 2026-09-10  
**Target:** Wrong org phone `(877) XXX-XXXX` in adoption PDF header; correct is `(845) XXX-XXXX`

---

## 1. PDF Header Literal

The phone number in the PDF header is NOT a hardcoded literal in pdfGenerator.ts. It is imported from a centralized constant.

**Constant definition:**  
`server/src/shelterContact.ts:7`

```ts
export const SHELTER_CONTACT = {
  name: 'Four Legs Good Animal Rescue',
  address: 'PO Box 103, Pomona, NY 10970',
  phone: '(877) XXX-XXXX',
  email: 'i***@fourlegsgoodnynj.org',
} as const;
```

**PDF header render:**  
`server/src/pdfGenerator.ts:71-73`

```ts
.text(SHELTER_CONTACT.name, 150, 75, { align: 'right' })
.text(SHELTER_CONTACT.address, 150, 88, { align: 'right' })
.text(`${SHELTER_CONTACT.phone} | ${SHELTER_CONTACT.email}`, 150, 101, { align: 'right' });
```

**Verdict:** The phone is from `SHELTER_CONTACT.phone`, a shared constant — not a hardcoded string in the PDF generator. [VERIFIED — shelterContact.ts:7, pdfGenerator.ts:73]

---

## 2. Language Handling (EN + ES)

The PDF header block (pdfGenerator.ts:69-73) renders **once**, unconditionally, before any language check. The Spanish branch (pdfGenerator.ts:79-82) only adds a yellow notice banner `"⚠ Originally submitted in Spanish / Originalmente enviado en español"` — it does NOT re-render the header or phone number.

**Verdict:** A single edit to `SHELTER_CONTACT.phone` in shelterContact.ts covers BOTH English and Spanish adoption PDFs. There is no separate Spanish header. [VERIFIED — pdfGenerator.ts:69-82]

---

## 3. Blast Radius — All Occurrences of the Old Number

Grep: searched all `.ts`, `.js`, `.html`, `.tsx`, `.json` files under `/home/shelter/shelter-apps/` for the old `(877)` number pattern.

Excluding `/dist/` (compiled output, regenerated on build) and `src.backup-*` (inactive backup):

| # | File:Line | Context | Type |
|---|-----------|---------|------|
| 1 | `server/src/shelterContact.ts:7` | `phone: '(877) XXX-XXXX'` | **CONSTANT DEFINITION** |
| 2 | `server/src/test-email-samples.ts:25` | `phone: '(877) XXX-XXXX'` | **HARDCODED COPY** (test script, does not import shelterContact) |

**Only 2 source occurrences.** Both are in `server/src/`.

### Consumers of `SHELTER_CONTACT.phone` (via import, no hardcoded number):

| File | Lines | Usage |
|------|-------|-------|
| `pdfGenerator.ts` | 73 | Adoption PDF header |
| `timeReceiptPDF.ts` | 103 | Volunteer time receipt PDF header |
| `emailService.ts` | 127, 150, 869, 895, 1063 | Applicant confirmation email (html+text), volunteer email (html+text), featured email |

**Email bodies:** Yes — `emailService.ts` uses `SHELTER_CONTACT.phone` in email footer blocks for adoption confirmation, volunteer confirmation, and featured animal emails. All via the shared constant, not hardcoded.

No occurrences in any PWA HTML, dashboard, or client-side code.

---

## 4. Centralization

The number IS centralized. `SHELTER_CONTACT` is defined once in `server/src/shelterContact.ts` and imported by pdfGenerator.ts, timeReceiptPDF.ts, and emailService.ts. The file header comment says: *"Update here to change it everywhere."*

**Exception:** `server/src/test-email-samples.ts:25` has an independent hardcoded copy (the file redefines its own local `SHELTER_CONTACT` object instead of importing from shelterContact.ts). This is a one-off test script, not production code, but should be updated for consistency.

**Verdict:** The fix is ONE constant change (`shelterContact.ts:7`) for all production code, plus ONE hardcoded literal in the test script (`test-email-samples.ts:25`). [VERIFIED — grep across full source tree]
