# Adoption PDF Language Handling — Diagnosis — 2026-06-17

## Summary

For a Spanish submission: the PDF has **English labels** and **English-translated answers** (via GPT-4o), plus a **yellow banner** noting "Originally submitted in Spanish / Originalmente enviado en español." Staff receives an English-readable PDF with a clear language flag. If translation fails, answers fall through in Spanish with the same banner. [VERIFIED]

---

## 1. Language Capture

**Yes — the submission language is captured.**

**server.ts:7700:**
```ts
language_submitted: body.language === 'es' ? 'es' : 'en',
```

The frontend sends a `language` field in the POST body. The backend normalizes it to `'es'` or `'en'` and stores it as `language_submitted` on the `AdoptionApplication` object, which is persisted to the database. [VERIFIED]

---

## 2. Translation of Applicant Answers

**Yes — free-text answers ARE translated to English before the PDF is generated.**

**server.ts:7788–7838** — the translation block runs BEFORE `saveAdoptionApplication()` and BEFORE `generateApplicationPdf()`:

```ts
if (application.language_submitted === 'es') {
  console.log('[Adoption] Translating Spanish submission to English...');
  try {
    const fieldsToTranslate = {
      personality_type: application.personality_type,
      cat_behavior_counter: application.cat_behavior_counter,
      cat_behavior_furniture: application.cat_behavior_furniture,
      cat_behavior_litterbox: application.cat_behavior_litterbox,
      dog_behavior_housebreak: application.dog_behavior_housebreak,
      dog_behavior_biting: application.dog_behavior_biting,
      dog_behavior_barking: application.dog_behavior_barking,
      small_animal_behavior: application.small_animal_behavior,
      occupation_applicant: application.occupation_applicant,
      occupation_spouse: application.occupation_spouse,
      allergies_detail: application.allergies_detail,
      animal_caretaker: application.animal_caretaker,
      where_kept_when_away: application.where_kept_when_away,
      plan_if_moving: application.plan_if_moving,
      pets_neutered_explain: application.pets_neutered_explain,
      pets_indoor_outdoor: application.pets_indoor_outdoor,
      intro_precautions: application.intro_precautions,
      not_get_along_plan: application.not_get_along_plan,
      other_agencies: application.other_agencies,
      cat_color: application.cat_color,
      weight_size_preference: application.weight_size_preference,
      dog_breed_type: application.dog_breed_type,
      dog_fence_type: application.dog_fence_type,
      small_animal_breed: application.small_animal_breed,
      small_animal_hair: application.small_animal_hair,
      hours_unattended: application.hours_unattended,
      renter_pets_allowed: application.renter_pets_allowed,
    };

    const translated = await translateApplicationFields(fieldsToTranslate);

    // Apply translations — overwrites the application object IN PLACE
    for (const [key, value] of Object.entries(translated)) {
      if (value) {
        (application as unknown as Record<string, unknown>)[key] = value;
      }
    }

    application.translated = true;
    console.log('[Adoption] Translation complete');
  } catch (err) {
    console.error('[Adoption] Translation failed, saving in Spanish:', err);
    // Continue without translation - form will be saved in Spanish
  }
}
```

**Translation engine (attributeParser.ts:430–480):**
```ts
export async function translateApplicationFields(
  spanishFields: Record<string, string | undefined>
): Promise<Record<string, string>> {
  const client = getOpenAI();
  // ...
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a translator. Return only a JSON object with the translations.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
```

**Critical sequence:** Translation happens at server.ts:7788, DB save at server.ts:7852, PDF generation at server.ts:7864. The translated values overwrite the application object before both save and PDF, so both the database record and the PDF contain the English translations. [VERIFIED]

**Failure mode:** If translation fails (GPT-4o error, timeout), the catch block logs the error and continues — the application is saved and the PDF generated with the original Spanish text. The `application.translated` flag remains `false`. [VERIFIED]

---

## 3. The PDF Itself (pdfGenerator.ts)

### (a) Labels/headings: Always English [VERIFIED]

All section headers and field labels are hardcoded English strings in `pdfGenerator.ts`. Examples:
```ts
sectionHeader('Applicant Information');
fieldRow('Full Name', app.applicant_name);
twoColumn('Email', app.applicant_email, 'Cell Phone', app.applicant_phone_cell);
sectionHeader('Animal Preferences');
sectionHeader('Household Information');
sectionHeader('Commitment & Care');
```
There is no conditional label switching based on `language_submitted`. Labels are always English. [VERIFIED]

### (b) Applicant answers: English (translated) [VERIFIED]

The PDF renders `app.personality_type`, `app.cat_behavior_counter`, etc. — the same fields that were overwritten with English translations before the PDF was generated. So answers appear in English. [VERIFIED]

### (c) Spanish-submission banner: Yes, it exists [VERIFIED]

**pdfGenerator.ts:84–88:**
```ts
// Spanish submission notice
if (app.language_submitted === 'es') {
  doc.rect(50, y, 512, 25).fill('#FFF3CD');
  doc.fontSize(10).fillColor('#856404').font('Helvetica-Bold')
     .text('⚠ Originally submitted in Spanish / Originalmente enviado en español', 60, y + 7);
  y += 35;
}
```

A yellow banner appears at the top of the first page (below the header, above the application data) with bilingual text: "⚠ Originally submitted in Spanish / Originalmente enviado en español". [VERIFIED]

---

## 4. Net Staff Experience for a Spanish Submission

What staff actually receives in the alert email (sent to `flgnynjai@gmail.com`):

1. **Email body:** HTML summary with applicant name/email/phone/type/date. If Spanish, a yellow notice: "⚠️ This application was originally submitted in Spanish and has been auto-translated." (emailService.ts:92 region) [VERIFIED]

2. **Attached PDF:**
   - **All labels/headings:** English (always)
   - **All applicant answers:** English (GPT-4o translated)
   - **Yellow banner at top:** "⚠ Originally submitted in Spanish / Originalmente enviado en español"
   - **Structured fields** (name, email, phone, address, yes/no selections): passed through as-is (these don't need translation)

3. **If translation failed:** Same PDF format, same yellow banner, but free-text answers remain in Spanish. The `translated` flag on the DB record would be `false`, but this isn't surfaced on the PDF itself — the banner appears regardless of whether translation succeeded.

**Net result:** Staff gets an English-readable PDF with a clear "was originally Spanish" flag. [VERIFIED]

---

## Conclusions

**(a) Is submission language captured?** Yes — `language_submitted` field, set from `body.language`, stored in DB. [VERIFIED]

**(b) Are answers translated?** Yes — 27 free-text fields are translated from Spanish to English via GPT-4o (`translateApplicationFields` in attributeParser.ts:430) BEFORE the DB save and PDF generation. The application object is mutated in place, so the PDF renders English text. [VERIFIED]

**(c) Is there a "was originally Spanish" note?** Yes — a yellow banner on the PDF ("⚠ Originally submitted in Spanish / Originalmente enviado en español") and a yellow notice in the alert email. Both always appear for `language_submitted === 'es'`, regardless of translation success. [VERIFIED]

**(d) Net staff-facing result:** English labels + English-translated answers + yellow language banner. The PDF is fully readable in English. If translation fails, answers fall through in Spanish but the banner still appears. [VERIFIED]
