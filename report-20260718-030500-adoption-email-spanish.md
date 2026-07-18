# Adoption Confirmation Email — Spanish Support — 2026-07-18

## Overview

Added Spanish language support to `sendApplicantConfirmationEmail()` in `emailService.ts`. Single template driven by a strings map keyed on `app.language_submitted`. EN output byte-identical to pre-change. English PDF attached for both languages.

**Commit:** `b13e057`

---

## Verification 1 — tsc clean + restart

```
$ npm run build
> shelter-apps@2.0.0 build
> tsc
(exit code 0)

$ sudo systemctl restart shelter-app && systemctl is-active shelter-app
active
```

[VERIFIED]

---

## Verification 2 — Strings Map and Rewritten Template

### Strings map (emailService.ts:193-227)

```typescript
    const isEs = app.language_submitted === 'es';
    
    const strings = isEs ? {
      subject: 'Four Legs Good - Solicitud de Adopción Recibida',
      headerH1: '🐾 ¡Solicitud Recibida!',
      greeting: 'Estimado/a',
      thankYou: 'Gracias por enviar su solicitud de adopción para',
      attached: 'Adjunto encontrará una copia de su solicitud para sus archivos.',
      vetNotice: 'Recordatorio: No podemos procesar su solicitud hasta que hablemos con su veterinario. Por favor, comuníquese con su veterinario y autorícelo a hablar con nosotros sobre su cuenta. Una vez hecho esto, envíenos un correo electrónico a <a href="mailto:adopt@4lg.org" style="color: #22804A;">adopt@4lg.org</a> para informarnos, y así podamos comenzar a procesar su solicitud.',
      vetNoticeText: 'IMPORTANTE: No podemos procesar su solicitud hasta que hablemos con su veterinario. Por favor, comuníquese con su veterinario y autorícelo a hablar con nosotros sobre su cuenta. Una vez hecho esto, envíenos un correo electrónico a adopt@4lg.org para informarnos, y así podamos comenzar a procesar su solicitud.',
      contactIntro: 'Si tiene alguna pregunta mientras tanto, no dude en comunicarse con nosotros:',
      emailLabel: 'Correo electrónico:',
      phoneLabel: 'Teléfono:',
      thanksAdoption: '¡Gracias por considerar la adopción!',
      signoff: '— El Equipo de Four Legs Good',
    } : {
      subject: 'Four Legs Good - Adoption Application Received',
      headerH1: '🐾 Application Received!',
      greeting: 'Dear',
      thankYou: 'Thank you for submitting your adoption application for',
      attached: 'Attached is a copy of your application for your records.',
      vetNotice: 'Reminder: We cannot process your application until we speak with your vet. Please contact your vet and authorize them to discuss your account with us. Once completed, please send an email to <a href="mailto:adopt@4lg.org" style="color: #22804A;">adopt@4lg.org</a> letting us know so that we may begin processing your application.',
      vetNoticeText: 'IMPORTANT: We cannot process your application until we speak with your vet. Please contact your vet and authorize them to discuss your account with us. Once completed, please send an email to adopt@4lg.org letting us know so that we may begin processing your application.',
      contactIntro: "If you have any questions in the meantime, please don't hesitate to contact us:",
      emailLabel: 'Email:',
      phoneLabel: 'Phone:',
      thanksAdoption: 'Thank you for considering adoption!',
      signoff: '— The Four Legs Good Team',
    };
```

### Animal type fallback (emailService.ts:229-230)

```typescript
    const animalTypeEs: Record<string, string> = { cat: '🐱 Gato', dog: '🐕 Perro', small_animal: '🐹 Animal Pequeño' };
    const animalNames = app.animal_names_interested || (isEs ? (animalTypeEs[app.animal_type] || app.animal_type) : formatAnimalType(app.animal_type));
```

Local ES map; shared `formatAnimalType()` untouched.

### Rewritten HTML template (emailService.ts:233-268)

```html
  <div class="header">
    <h1>${strings.headerH1}</h1>
  </div>
  <div class="content">
    <p>${strings.greeting} ${app.applicant_name},</p>
    
    <div class="message">
      <p>${strings.thankYou} <strong>${animalNames}</strong>.</p>
      <p>${strings.attached}</p>
      <p style="font-size: 18px; font-weight: bold; line-height: 1.5; margin: 16px 0 0 0;">${strings.vetNotice}</p>
    </div>
    
    <p>${strings.contactIntro}</p>
    <ul>
      <li>${strings.emailLabel} <a href="mailto:adopt@4lg.org">adopt@4lg.org</a></li>
      <li>${strings.phoneLabel} <a href="tel:[shelter-phone]">[shelter phone]</a></li>
    </ul>
    
    <p>${strings.thanksAdoption}</p>
    <p><em>${strings.signoff}</em></p>
  </div>
```

### Rewritten plaintext (emailService.ts:272-289)

```
${strings.greeting} ${app.applicant_name},

${strings.thankYou} ${animalNames}.

${strings.attached}

${strings.vetNoticeText}

${strings.contactIntro}
- ${strings.emailLabel} adopt@4lg.org
- ${strings.phoneLabel} [shelter phone]

${strings.thanksAdoption}

${strings.signoff}

---
${SHELTER_CONTACT.name}
${SHELTER_CONTACT.address}
fourlegsgoodnynj.org
```

### Subject line (emailService.ts:296)

```typescript
      subject: strings.subject,
```

[VERIFIED — `sed` output of rewritten function]

---

## Verification 3 — EN Regression Proof

Pre-change EN output was captured by rendering the old hardcoded template with sample values (`applicant_name: 'Sample Preview EN'`, `animal_names_interested: 'Whiskers & Mittens'`). Post-change EN output was captured by rendering the new strings-map template with identical sample values and `language_submitted: 'en'`.

```
$ diff /tmp/en-pre-html.txt /tmp/en-post-html.txt
(no output, exit code 0)

$ diff /tmp/en-pre-text.txt /tmp/en-post-text.txt
(no output, exit code 0)

$ diff /tmp/en-pre-subject.txt /tmp/en-post-subject.txt
(no output, exit code 0)

$ sha256sum /tmp/en-pre-html.txt /tmp/en-post-html.txt
8734ccba3a15f3a8b757477c34fe9d2a4b024853969d1c6fa2639b92c3498eb9  /tmp/en-pre-html.txt
8734ccba3a15f3a8b757477c34fe9d2a4b024853969d1c6fa2639b92c3498eb9  /tmp/en-post-html.txt

$ sha256sum /tmp/en-pre-text.txt /tmp/en-post-text.txt
859d09669b9eb94ca92fdde70692cdd76f9478acda309fd7b7a8fc98c7126532  /tmp/en-pre-text.txt
859d09669b9eb94ca92fdde70692cdd76f9478acda309fd7b7a8fc98c7126532  /tmp/en-post-text.txt

$ sha256sum /tmp/en-pre-subject.txt /tmp/en-post-subject.txt
ed1d2a8ae0e8215714960f97cecf2080803ece22b8ab180445dd3bf91a1c9458  /tmp/en-pre-subject.txt
ed1d2a8ae0e8215714960f97cecf2080803ece22b8ab180445dd3bf91a1c9458  /tmp/en-post-subject.txt
```

**Zero diff. SHA256 match on all three (HTML, plaintext, subject). EN output is byte-identical to pre-change.** [VERIFIED]

---

## Verification 4 — Phone Line Unchanged

```
$ grep -n 'tel:[shelter-phone]' server/src/emailService.ts
256:      <li>${strings.phoneLabel} <a href="tel:[shelter-phone]">[shelter phone]</a></li>
963:      <li>Phone: <a href="tel:[shelter-phone]">[shelter phone]</a></li>
```

Line 256 is the applicant confirmation email (this change). Line 963 is the volunteer confirmation email (untouched). The `tel:` href and display value are byte-identical to before — only the label changed from hardcoded `Phone:` to `${strings.phoneLabel}`.

In the git diff, the phone line shows:
```
-      <li>Phone: <a href="tel:[shelter-phone]">[shelter phone]</a></li>
+      <li>${strings.phoneLabel} <a href="tel:[shelter-phone]">[shelter phone]</a></li>
```

Href and value unchanged. [VERIFIED]

---

## Verification 5 — Both Samples Sent

```
$ sudo -u shelter bash -c 'cd /home/shelter/shelter-apps/server && npx tsx /tmp/sample-send-es.ts'
[Email] Applicant confirmation sent to [redacted]. ID: cb5adb7f-b281-4998-8dc6-4addfec06965
EN send result: true
[Email] Applicant confirmation sent to [redacted]. ID: a9006a70-137a-45da-b1c6-4f37401fd56e
ES send result: true
```

| Sample | language_submitted | applicant_name | Resend message ID |
|--------|-------------------|---------------|-------------------|
| EN | `'en'` | Sample Preview EN | `cb5adb7f-b281-4998-8dc6-4addfec06965` |
| ES | `'es'` | Sample Preview ES | `a9006a70-137a-45da-b1c6-4f37401fd56e` |

[VERIFIED]

### adoption_applications COUNT(*) unchanged

```
Before: 26
After:  26
```

[VERIFIED — no DB row created]

### No staff email fired

```
$ journalctl -u shelter-app --since="2 minutes ago" | grep -i 'staff\|notification\|sendApplicationEmail'
(no output)
```

[VERIFIED]

### Script deleted

```
$ rm /tmp/sample-send-es.ts /tmp/render-pre.ts /tmp/render-post.ts
$ ls /tmp/sample-send-es.ts
ls: cannot access '/tmp/sample-send-es.ts': No such file or directory
```

[VERIFIED]

---

## Verification 6 — git diff scope

```
$ git diff --stat HEAD~1 -- server/src/emailService.ts
 server/src/emailService.ts | 76 ++++++++++++++++++++++++++++++++--------------
 1 file changed, 54 insertions(+), 22 deletions(-)

$ git diff HEAD~1 -- server/src/emailService.ts | grep -c 'sendApplicationEmail'
0
```

All changes confined to `sendApplicantConfirmationEmail()`. `sendApplicationEmail()` (staff notification) untouched. No other files changed. [VERIFIED]

---

## Commit

```
$ git add server/src/emailService.ts
$ git commit -m "Adoption confirmation email: Spanish body + subject when language_submitted='es' (single template, strings map); English PDF attached for both languages; EN output unchanged"
[master b13e057] Adoption confirmation email: Spanish body + subject when language_submitted='es' (single template, strings map); English PDF attached for both languages; EN output unchanged
 1 file changed, 54 insertions(+), 22 deletions(-)
```

Named path only, no `git add -A`. [VERIFIED]

---

## Summary

| Check | Result |
|-------|--------|
| tsc clean | PASS — exit 0 |
| EN HTML byte-identical | PASS — sha256 `8734ccba...` match |
| EN text byte-identical | PASS — sha256 `859d0966...` match |
| EN subject byte-identical | PASS — sha256 `ed1d2a8a...` match |
| Phone line unchanged | PASS — only label parameterized |
| EN sample sent | PASS — `cb5adb7f-b281-4998-8dc6-4addfec06965` |
| ES sample sent | PASS — `a9006a70-137a-45da-b1c6-4f37401fd56e` |
| No DB row | PASS — count 26→26 |
| No staff email | PASS — zero journal hits |
| Script deleted | PASS |
| sendApplicationEmail untouched | PASS — 0 diff lines |
| PDF unchanged | PASS — attachment logic identical |
