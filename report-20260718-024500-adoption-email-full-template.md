# Adoption Confirmation Email — Full Template for Spanish Translation — 2026-07-18

## 1. Complete Function (emailService.ts:182-290)

```typescript
export async function sendApplicantConfirmationEmail(
  app: AdoptionApplication,
  pdfPath: string
): Promise<boolean> {
  try {
    // Read PDF attachment
    const pdfBuffer = readFileSync(pdfPath);
    const pdfFilename = path.basename(pdfPath);
    
    // Get animal names for display
    const animalNames = app.animal_names_interested || formatAnimalType(app.animal_type);
    
    // Build email body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #3D3835; }
    .header { background: #22804A; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; max-width: 600px; margin: 0 auto; }
    .message { background: #FAF7F4; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .footer { background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐾 Application Received!</h1>
  </div>
  <div class="content">
    <p>Dear ${app.applicant_name},</p>
    
    <div class="message">
      <p>Thank you for submitting your adoption application for <strong>${animalNames}</strong>.</p>
      <p>Attached is a copy of your application for your records.</p>
      <p style="font-size: 18px; font-weight: bold; line-height: 1.5; margin: 16px 0 0 0;">Reminder: We cannot process your application until we speak with your vet. Please contact your vet and authorize them to discuss your account with us. Once completed, please send an email to <a href="mailto:adopt@4lg.org" style="color: #22804A;">adopt@4lg.org</a> letting us know so that we may begin processing your application.</p>
    </div>
    
    <p>If you have any questions in the meantime, please don't hesitate to contact us:</p>
    <ul>
      <li>Email: <a href="mailto:adopt@4lg.org">adopt@4lg.org</a></li>
      <li>Phone: <a href="tel:[shelter-phone]">[shelter phone]</a></li>
    </ul>
    
    <p>Thank you for considering adoption!</p>
    <p><em>— The Four Legs Good Team</em></p>
  </div>
  <div class="footer">
    ${SHELTER_CONTACT.name}<br>
    ${SHELTER_CONTACT.address}<br>
    <a href="https://fourlegsgoodnynj.org">fourlegsgoodnynj.org</a>
  </div>
</body>
</html>
    `.trim();
    
    // Plain text fallback
    const textBody = `
Dear ${app.applicant_name},

Thank you for submitting your adoption application for ${animalNames}.

Attached is a copy of your application for your records.

IMPORTANT: We cannot process your application until we speak with your vet. Please contact your vet and authorize them to discuss your account with us. Once completed, please send an email to adopt@4lg.org letting us know so that we may begin processing your application.

If you have any questions in the meantime, please don't hesitate to contact us:
- Email: adopt@4lg.org
- Phone: [shelter phone]

Thank you for considering adoption!

— The Four Legs Good Team

---
${SHELTER_CONTACT.name}
${SHELTER_CONTACT.address}
fourlegsgoodnynj.org
    `.trim();
    
    // Send email to applicant
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
    
    if (error) {
      console.error('[Email] Resend error sending applicant confirmation:', error);
      return false;
    }
    
    console.log(`[Email] Applicant confirmation sent to ${app.applicant_email}. ID: ${data?.id}`);
    return true;
  } catch (err) {
    console.error('[Email] Error sending applicant confirmation:', err);
    return false;
  }
}
```

[VERIFIED — `sed -n '182,290p' emailService.ts`]

---

## 2. Every User-Visible English String (in order)

| # | Location | English string | Notes |
|---|----------|---------------|-------|
| 1 | Subject line | `Four Legs Good - Adoption Application Received` | emailService.ts:267 |
| 2 | Header h1 | `🐾 Application Received!` | Inside `.header` div |
| 3 | Greeting | `Dear ${app.applicant_name},` | `${app.applicant_name}` is the applicant's name — keep as variable |
| 4 | Message p1 | `Thank you for submitting your adoption application for <strong>${animalNames}</strong>.` | `${animalNames}` = animal names or formatted type |
| 5 | Message p2 | `Attached is a copy of your application for your records.` | |
| 6 | Message p3 (bold) | `Reminder: We cannot process your application until we speak with your vet. Please contact your vet and authorize them to discuss your account with us. Once completed, please send an email to adopt@4lg.org letting us know so that we may begin processing your application.` | Inline-styled 18px bold |
| 7 | Contact intro | `If you have any questions in the meantime, please don't hesitate to contact us:` | |
| 8 | Contact li 1 | `Email:` (label) + `adopt@4lg.org` (value/link) | |
| 9 | Contact li 2 | `Phone:` (label) + `[shelter phone]` (value/link) | |
| 10 | Sign-off p1 | `Thank you for considering adoption!` | |
| 11 | Sign-off p2 | `— The Four Legs Good Team` | Inside `<em>` |
| 12 | Footer line 1 | `${SHELTER_CONTACT.name}` = `Four Legs Good Animal Rescue` | Variable, but renders as English org name |
| 13 | Footer line 2 | `${SHELTER_CONTACT.address}` = `PO Box 103, Pomona, NY 10970` | Address — likely stays unchanged |
| 14 | Footer link | `fourlegsgoodnynj.org` | URL — stays unchanged |

**Total: 14 user-visible strings** (of which 12 need translation; items 8-value, 9-value, 13, and 14 are addresses/URLs/email that stay unchanged).

[VERIFIED — enumerated from the pasted function]

---

## 3. Template Interpolations

| Interpolation | What it holds | Source |
|--------------|--------------|--------|
| `${app.applicant_name}` | Applicant's full name (string from form field `applicant_name`) | AdoptionApplication.applicant_name |
| `${animalNames}` | Local variable: `app.animal_names_interested \|\| formatAnimalType(app.animal_type)` — either the specific animal names the applicant listed, or a formatted type string like `🐱 Cat`, `🐕 Dog`, `🐹 Small Animal` | Line 192 |
| `${SHELTER_CONTACT.name}` | `'Four Legs Good Animal Rescue'` | shelterContact.ts:5 |
| `${SHELTER_CONTACT.address}` | `'PO Box 103, Pomona, NY 10970'` | shelterContact.ts:6 |
| `${app.applicant_email}` | Applicant's email (used in `to:` field and console log, not in template body) | AdoptionApplication.applicant_email |

**Note on `formatAnimalType`:** This function maps `cat` → `🐱 Cat`, `dog` → `🐕 Dog`, `small_animal` → `🐹 Small Animal`. These English labels would appear in the Spanish email when no specific animal name is provided. A Spanish version should either use a separate Spanish map or translate inline.

[VERIFIED — `grep` and `sed` output for each]

---

## 4. Complete Plaintext Body (verbatim)

```
Dear ${app.applicant_name},

Thank you for submitting your adoption application for ${animalNames}.

Attached is a copy of your application for your records.

IMPORTANT: We cannot process your application until we speak with your vet. Please contact your vet and authorize them to discuss your account with us. Once completed, please send an email to adopt@4lg.org letting us know so that we may begin processing your application.

If you have any questions in the meantime, please don't hesitate to contact us:
- Email: adopt@4lg.org
- Phone: [shelter phone]

Thank you for considering adoption!

— The Four Legs Good Team

---
${SHELTER_CONTACT.name}
${SHELTER_CONTACT.address}
fourlegsgoodnynj.org
```

[VERIFIED — `sed -n '241,263p'` output, `.trim()` applied]

---

## 5. PDF Attachment Logic

```typescript
    const pdfBuffer = readFileSync(pdfPath);           // line 188
    const pdfFilename = path.basename(pdfPath);        // line 189
    ...
    attachments: [
      {
        filename: pdfFilename,                         // line 272
        content: pdfBuffer,                            // line 273
      },
    ],
```

The PDF is read from disk as a raw buffer and attached with its original filename (e.g., `37-John_V_Test-2026-07-17.pdf`). The PDF itself is generated by `generateApplicationPdf()` in `pdfGenerator.ts` — it uses English field labels with a bilingual Spanish banner when `language_submitted === 'es'` (per the earlier diagnosis). The PDF is **not regenerated** by the email function; it receives whatever was already generated.

**Confirmed: the PDF attachment stays unchanged for the Spanish email.** The same English-labeled PDF (with its Spanish-submission banner if applicable) is attached regardless of which email template is sent.

[VERIFIED — emailService.ts:188-189, 272-273]

---

## 6. `language_submitted` Property

**Property name:** `language_submitted`
**Type:** `'en' | 'es'`
**Defined in:** `types.ts:278`

```typescript
  language_submitted: 'en' | 'es';
```

**Set at:** `server.ts:9219` in the POST handler:
```typescript
language_submitted: body.language === 'es' ? 'es' : 'en',
```

**Available inside `sendApplicantConfirmationEmail`:** Yes. The function receives `app: AdoptionApplication`, and `language_submitted` is a property on that object. It is currently not read by the function but is available for branching.

**Possible values:** `'en'` (default, from `/adopt/`) or `'es'` (from `/es/adopta-una-mascota/` which sets `data.language = 'es'` in its submit handler).

[VERIFIED — types.ts:278, server.ts:9219]

---

## Summary

- **Function:** `sendApplicantConfirmationEmail()`, emailService.ts:182-290
- **User-visible English strings needing translation:** 12 (of 14 total; 2 are addresses/URLs)
- **Interpolations:** 4 in-template (`applicant_name`, `animalNames`, `SHELTER_CONTACT.name`, `SHELTER_CONTACT.address`)
- **`formatAnimalType` fallback labels** (`Cat`, `Dog`, `Small Animal`) would also need Spanish equivalents
- **PDF:** Unchanged — same English PDF attached regardless of language
- **Branching property:** `app.language_submitted` — `'en' | 'es'` — available on the `app` object, currently unread by this function
