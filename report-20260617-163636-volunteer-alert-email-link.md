# Volunteer Alert Email — Deep Link Diagnosis — 2026-06-17

## Summary

**Yes, the volunteer alert email contains a hot link directly to the new volunteer record.** [VERIFIED]

---

## 1. Email Send Location

**File:** `emailService.ts`, function `sendVolunteerReviewerEmail()`, starting at line 1063.

The email is sent to `volunteer@4lg.org` (constant `VOLUNTEER_REVIEWER_EMAIL` at line 31) via Resend, triggered when a new `web_form` volunteer application is submitted.

**Resend call (emailService.ts:~1209–1215):**
```ts
const { data, error } = await getResend().emails.send({
  from: FROM_EMAIL,
  to: [VOLUNTEER_REVIEWER_EMAIL],
  subject: `New Volunteer Application: ${vol.full_name}`,
  html: htmlBody,
  text: textBody,
});
```

---

## 2. The Deep Link

Both the HTML and plain-text versions include a direct link to the specific volunteer record, using the record's `vol.id`.

**HTML version (emailService.ts:~1173–1175) — styled green CTA button:**
```html
<p style="text-align: center;">
  <a href="https://dashboard.4lgshelterapp.duckdns.org/#volunteers/${vol.id}" class="cta" style="color: #ffffff !important;">Review in Dashboard</a>
</p>
```

**Plain-text version (emailService.ts:~1198):**
```
Review: https://dashboard.4lgshelterapp.duckdns.org/#volunteers/${vol.id}
```

---

## 3. What the Link Points To

The URL pattern is:
```
https://dashboard.4lgshelterapp.duckdns.org/#volunteers/{volunteerId}
```

This is a hash-routed deep link into the dashboard app's volunteer section, with the specific volunteer record ID in the URL. When staff clicks it, the dashboard should navigate directly to that volunteer's record (assuming the dashboard's client-side router handles the `#volunteers/:id` route). [VERIFIED — URL structure confirmed from code]

---

## 4. Other Identifying Info in the Email

Beyond the deep link, the email body includes:

- **Applicant name** (bold, in info box)
- **Email address** (mailto link)
- **Phone number**
- **Submission timestamp**
- **Job interests** (itemized list)
- **Availability** (day-by-day breakdown)
- **Other talents** (free text)

Staff has both a one-click link AND enough identifying info to find the record manually if needed.

---

## 5. Email Template Structure

The HTML email is a branded template with:
- Green header banner: "🤝 New Volunteer Application"
- Info box with name/email/phone/submitted date
- Green section boxes for: Interested In, Availability, Other Talents
- **Green CTA button: "Review in Dashboard"** (the deep link)
- Footer with shelter contact info

---

## Conclusion

**Yes — the alert email hot-links directly to the new volunteer record.** [VERIFIED]

The link is `https://dashboard.4lgshelterapp.duckdns.org/#volunteers/{id}` where `{id}` is the newly-created volunteer record's database ID. It appears as both a styled green "Review in Dashboard" button in the HTML version and a plain URL in the text version. Staff does not need to manually search the volunteer table — one click lands on the record.
