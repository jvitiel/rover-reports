# Adoption Confirmation Email — Scoping Diagnosis — 2026-07-18

## 1. Location

**File:** `/home/shelter/shelter-apps/server/src/emailService.ts`
**Function:** `sendApplicantConfirmationEmail()` — line 182

**Signature:**
```typescript
export async function sendApplicantConfirmationEmail(
  app: AdoptionApplication,
  pdfPath: string
): Promise<boolean>
```

This is the APPLICANT-facing email (NOT the staff notification). Confirmed by:
- Subject: `'Four Legs Good - Adoption Application Received'` (line 267) [VERIFIED]
- From: `FROM_EMAIL` = `'No-Reply@4lg.org'` (line 29) [VERIFIED]
- To: `[app.applicant_email]` (line 265) [VERIFIED]
- Attachment: the PDF (`pdfFilename`, `pdfBuffer` from `readFileSync(pdfPath)`, lines 188-189) [VERIFIED]

The staff notification is a separate function: `sendApplicationEmail()` at line 49, with subject `'New Adoption Application: ...'`. It does NOT contain the target string. [VERIFIED]

**Send call** (emailService.ts:263-274):
```typescript
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [app.applicant_email],
      subject: 'Four Legs Good - Adoption Application Received',
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
    });
```

**Called from:** `server.ts:9413` inside the `POST /api/adoption-application` handler:
```typescript
      applicantEmailSent = await sendApplicantConfirmationEmail(savedApp, pdfPath);
```

[VERIFIED — server.ts:9413]

---

## 2. The Exact HTML and Styling Convention

### Target line in HTML template (emailService.ts:218):

```html
    <div class="message">
      <p>Thank you for submitting your adoption application for <strong>${animalNames}</strong>.</p>
      <p>Attached is a copy of your application for your records.</p>
      <p>We will be in touch soon to discuss next steps.</p>
    </div>
```

[VERIFIED — emailService.ts:214-220]

### Target line in plain-text fallback (emailService.ts:247):

```
We will be in touch soon to discuss next steps.
```

[VERIFIED — emailService.ts:247]

### Template styling convention

The template uses a `<style>` block in the `<head>` (emailService.ts:199-206):

```html
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #3D3835; }
    .header { background: #22804A; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; max-width: 600px; margin: 0 auto; }
    .message { background: #FAF7F4; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .footer { background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
```

[VERIFIED — emailService.ts:199-206]

**Convention:** CSS classes in a `<style>` block, NOT inline styles. The `.message` class gives the beige rounded box. Text styling uses standard HTML tags (`<strong>`, `<em>`, `<p>`, `<h1>`). No inline `style=` attributes on content elements.

**For large + bold:** The template convention supports either:
- A new CSS class in the `<style>` block (e.g., `.required-action { font-size: 16px; font-weight: bold; ... }`)
- Or inline `style=` on a `<p>` tag if keeping the change minimal

The existing template already uses `<strong>` for emphasis (line 216: `<strong>${animalNames}</strong>`). For LARGE + BOLD, a sized `<p>` or a new class is needed since `<strong>` alone does not increase size.

---

## 3. The Spanish Question

### 3a. Does the endpoint read `data.language`?

**Yes.** The `POST /api/adoption-application` handler reads `body.language` at two points:

1. **Console log** (server.ts:9215):
   ```typescript
   console.log(`[Adoption] Received application from ${body.applicant_name} (${body.language || 'en'})`);
   ```

2. **Application object** (server.ts:9219):
   ```typescript
   language_submitted: body.language === 'es' ? 'es' : 'en',
   ```

[VERIFIED — server.ts:9215, 9219]

The `language_submitted` field is stored in the database (`adoption_applications.language_submitted`, default `'en'`). It IS available to the email function via the `app` object.

### 3b. Does the confirmation email branch on language?

**No.** `sendApplicantConfirmationEmail()` (lines 182-290) contains zero references to `language_submitted`, `language`, `lang`, `es`, or `spanish`. There is exactly ONE English template. No i18n, no conditionals, no alternative templates. [VERIFIED — grep of function body returned zero hits]

By contrast, the STAFF notification email (`sendApplicationEmail()`, line 49) DOES reference `app.language_submitted === 'es'` to show a yellow "submitted in Spanish" notice banner (emailService.ts:83, 91). The applicant-facing email has no such logic.

### 3c. Do Spanish applicants receive English confirmations?

**Yes.** Spanish applicants receive the identical English confirmation email. The subject is English (`'Four Legs Good - Adoption Application Received'`), the body is English ("Dear ...", "Thank you for submitting...", "We will be in touch soon..."), and there is no conditional branch. [VERIFIED — single template, no language check in the function]

### 3d. Is the PDF language-aware?

**Partially.** The PDF generator (`pdfGenerator.ts:79-82`) checks `app.language_submitted === 'es'` and adds a yellow banner:
```
⚠ Originally submitted in Spanish / Originalmente enviado en español
```

But the PDF field labels (Name, Email, Phone, etc.) are all English regardless of language. The banner is the only ES-aware element. [VERIFIED — pdfGenerator.ts:79-82]

---

## 4. Blast Radius

```
$ grep -rn 'We will be in touch soon to discuss next steps' /home/shelter/shelter-apps/server/src/
emailService.ts:218:      <p>We will be in touch soon to discuss next steps.</p>
emailService.ts:247:We will be in touch soon to discuss next steps.
```

**Two hits, both in `sendApplicantConfirmationEmail()`:**
1. Line 218 — HTML template (inside the `.message` div)
2. Line 247 — Plain text fallback

**Zero hits in:**
- `sendApplicationEmail()` (staff notification) [VERIFIED]
- `sendContactFormEmail()` [VERIFIED]
- `sendIntakeAlertEmail()` [VERIFIED]
- `sendVolunteerApplicantConfirmationEmail()` [VERIFIED]
- Any backup file [VERIFIED]
- Any other file in `server/src/` [VERIFIED]

The string is unique to the applicant confirmation email. The edit has zero blast radius beyond this one function, but requires changing BOTH instances (HTML line 218 and plaintext line 247).

---

## 5. The Edit Point

### Precise location

**Two lines to change in one function:**

| # | File | Line | Context |
|---|------|------|---------|
| 1 | emailService.ts | 218 | HTML: `<p>We will be in touch soon to discuss next steps.</p>` inside `<div class="message">` |
| 2 | emailService.ts | 247 | Plain text: `We will be in touch soon to discuss next steps.` |

### How to render large + bold

The template uses a `<style>` block. Two approaches, ordered by consistency with the template's existing conventions:

**Option A — New class (preferred, matches template convention):**
Add to the `<style>` block (after line 206):
```css
.required-action { font-size: 16px; font-weight: bold; color: #856404; background: #FFF3CD; border: 1px solid #FFEEBA; border-radius: 4px; padding: 12px; margin: 10px 0; }
```
Then replace line 218 with:
```html
<p class="required-action">[new text here]</p>
```

Note: The `.required-action` styling above mirrors the `.spanish-notice` class used in the staff email (emailService.ts:83) — same yellow/amber palette for attention-requiring content. This is a suggestion, not the final styling; the implementation prompt will specify the exact text and appearance.

**Option B — Inline style (simpler, email-client-safe):**
Replace line 218 with:
```html
<p style="font-size: 16px; font-weight: bold; ...">[new text here]</p>
```

Email clients (Gmail, Outlook) strip `<style>` blocks unpredictably. Inline styles are more reliable for email rendering. The existing template uses a `<style>` block, which works in most modern clients but is not guaranteed. If email-client compatibility matters, inline styles on the replacement `<p>` tag are safer regardless of what the rest of the template does.

### Plain text equivalent

Line 247 must also be updated. Plain text cannot be styled, so the emphasis is conveyed by:
```
*** [NEW TEXT HERE] ***
```
or
```
IMPORTANT: [NEW TEXT HERE]
```

---

## Summary

- **Function:** `sendApplicantConfirmationEmail()` in `emailService.ts:182`
- **Target lines:** 218 (HTML) and 247 (plain text) — both inside the same function
- **Styling:** `<style>` block with CSS classes; `<strong>` for inline emphasis; new class or inline style needed for large+bold
- **Spanish version:** None. One English template for all applicants. `language_submitted` is stored but not read by this function.
- **PDF:** English labels, with a bilingual "submitted in Spanish" banner for ES submissions
- **Blast radius:** Zero — the string appears only in this function, in two places (HTML + plaintext)
- **Edit scope:** Two string replacements in one function in one file
