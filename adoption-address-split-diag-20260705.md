# Adoption Application Address Field Split — Backend Diagnosis

## 1. CURRENT ADDRESS STORAGE

**Single column** `applicant_address` (TEXT, NOT NULL) in the `adoption_applications` table. [VERIFIED — PRAGMA table_info output]

No separate city/state/zip columns exist. Row count: **9** applications. [VERIFIED — SELECT COUNT(*)]

The WordPress form currently sends a single free-text field with placeholder "Street, City, State, ZIP".

---

## 2. API INTAKE

**Endpoint:** `POST /api/adoption-application` in `server.ts` (symbol: `app.post('/api/adoption-application', adoptionLimiter, ...)`)

**How address is read:**
- `applicant_address` is in the `requiredFields` array — validation rejects submissions without it.
- Mapped directly: `applicant_address: body.applicant_address`
- The form sends a single field named `applicant_address`; the handler reads `body.applicant_address`.

**What changes:**
- The handler must accept 4 new body fields (e.g., `applicant_address`, `applicant_city`, `applicant_state`, `applicant_zip`), or rename the existing one to `applicant_street` and add the three new ones.
- The `requiredFields` validation array must be updated to require the new fields.
- The `application` object construction block (~30 lines into the handler) maps each body field to the application object — needs 3 new lines.

**Files touched:** `server.ts` (POST handler), `types.ts` (AdoptionApplication interface), `localDatabase.ts` (INSERT statement + rowToAdoptionApplication mapper).

---

## 3. PDF RENDER

**File:** `pdfGenerator.ts` (function `generateApplicationPdf`)

**Current rendering:** The address prints via the `twoColumn` helper:
```
twoColumn('Home Phone', app.applicant_phone_home, 'Address', app.applicant_address);
```
This places "Address" in the right column of a two-column row alongside "Home Phone", rendering whatever text was in the single field.

**What changes:**
- Replace the single `twoColumn` call with either:
  - A `fieldRow('Address', `${app.applicant_street}, ${app.applicant_city}, ${app.applicant_state} ${app.applicant_zip}`)` formatted block, or
  - A `twoColumn` for Home Phone / Street, then a `twoColumn` for City / State+Zip.
- The PDF already has a `fieldRow` (full-width) and `twoColumn` helper — no new layout code needed. Recommend: full-width `fieldRow` with formatted address: `"123 Main St\nSpringfield, NY 10901"` (street on line 1, city/state/zip on line 2).

---

## 4. TRANSLATION PIPELINE

### 4a. What gets translated

Translation runs **only** for Spanish submissions (`language_submitted === 'es'`). It uses an **explicit named field list** — not "all text fields." [VERIFIED — inline `fieldsToTranslate` object in the POST handler]

The **exact fields currently translated** (hardcoded object):
```
personality_type, cat_behavior_counter, cat_behavior_furniture,
cat_behavior_litterbox, dog_behavior_housebreak, dog_behavior_biting,
dog_behavior_barking, small_animal_behavior, occupation_applicant,
occupation_spouse, allergies_detail, animal_caretaker,
where_kept_when_away, plan_if_moving, pets_neutered_explain,
pets_indoor_outdoor, intro_precautions, not_get_along_plan,
other_agencies, cat_color, weight_size_preference, dog_breed_type,
dog_fence_type, small_animal_breed, small_animal_hair,
hours_unattended, renter_pets_allowed
```

### 4b. Is `applicant_address` currently translated?

**No.** [VERIFIED] `applicant_address` is **not** in the `fieldsToTranslate` object. It was already excluded from translation.

### 4c. Would new city/state/zip fields be translated?

**No — as long as they are not added to the `fieldsToTranslate` object.** The mechanism is an explicit inclusion list (allowlist), not a blanket "translate all text." Fields not in the list are never sent to GPT-4o. The new `applicant_city`, `applicant_state`, and `applicant_zip` fields are safe by default — they will pass through verbatim as long as nobody adds them to the object.

The `applicant_street` (or renamed `applicant_address`) field should also stay excluded — street addresses are proper nouns/numbers. The GPT-4o system prompt does say "Keep proper nouns (names, addresses) unchanged," but the safest path is simply not including address fields in the translation object, which is the current behavior.

### 4d. Translation target: stored data or copy?

**Translation overwrites the stored data.** [VERIFIED] The translated values are applied directly to the `application` object before it is saved to the database:
```
for (const [key, value] of Object.entries(translated)) {
  if (value) {
    (application as unknown as Record<string, unknown>)[key] = value;
  }
}
```
The `form_data_json` column preserves the original Spanish submission as `JSON.stringify(body)` — this is the only record of the original text. The DB columns contain English translations for Spanish submissions.

**Implication for address split:** No impact. Address fields aren't translated, so they store the original value regardless of language.

---

## 5. EXISTING FIELD-SPLIT PRECEDENT

### Volunteer table (partial precedent)

The `volunteers` table has `address_city` and `address_state` columns (no street, no zip). [VERIFIED — PRAGMA table_info]

This establishes a naming convention (`address_city`, `address_state`) but is **not a full 4-field split** — volunteers only store city and state.

### Adoption application (no existing split)

The adoption application has no multi-part field split for address. Name is a single `applicant_name` field (not first/last). Phone has a split: `applicant_phone_home` and `applicant_phone_cell` — but that's two separate data points, not one field decomposed.

### Recommended naming convention

Follow the volunteer pattern with adoption-prefixed names:
- `applicant_address` → rename to `applicant_street` (or keep as `applicant_address` for street)
- Add: `applicant_city` (TEXT, NOT NULL)
- Add: `applicant_state` (TEXT, NOT NULL)
- Add: `applicant_zip` (TEXT, NOT NULL)

---

## 6. BLAST RADIUS — All Consumers of `applicant_address`

### Server-side (server.ts)

| Consumer | Location (symbol) | Impact |
|----------|-------------------|--------|
| POST handler | `app.post('/api/adoption-application', ...)` | Must accept new fields, map to DB |
| Required-fields validation | `requiredFields` array in POST handler | Must add new field names |
| GET list endpoint | `app.get('/api/adoption-applications', ...)` | **No impact** — does not expose address in response [VERIFIED] |
| PATCH endpoint | `app.patch('/api/adoption-applications/:id', ...)` | **No impact** — only allows status/boolean/notes updates, not address [VERIFIED] |
| PDF download endpoint | `app.get('/api/docs/adoption-pdf/:id', ...)` | **No impact** — streams existing PDF file |

### Database layer (localDatabase.ts)

| Consumer | Symbol | Impact |
|----------|--------|--------|
| CREATE TABLE | `adoption_applications` DDL | Must add 3 columns, possibly rename 1 |
| INSERT | `saveAdoptionApplication()` | Must include new columns |
| SELECT mapper | `rowToAdoptionApplication()` | Must map new columns |
| SELECT * list | `getAdoptionApplications()` | Uses SELECT * — auto-includes new columns |

### PDF generator (pdfGenerator.ts)

| Consumer | Symbol | Impact |
|----------|--------|--------|
| Address render | `twoColumn('Home Phone', ..., 'Address', app.applicant_address)` | Must render 4 fields |

### Type definition (types.ts)

| Consumer | Symbol | Impact |
|----------|--------|--------|
| Interface | `AdoptionApplication.applicant_address` | Must add 3 new fields |

### Email service (emailService.ts)

**No impact.** [VERIFIED] Does not reference `applicant_address`. Only uses `applicant_name`, `applicant_email`, `applicant_phone_cell`, `applicant_phone_home` from the application.

### Translation (attributeParser.ts)

**No impact.** [VERIFIED] `applicant_address` is not in the translation field list. New fields should not be added.

### Client-side / forms

| File | Impact |
|------|--------|
| `/home/shelter/shelter-apps/adoption-form.html` | WordPress embeds — **Website Opus scope**, not backend |
| `/home/shelter/shelter-apps/public/test-adoption-es.html` | Test form — must update field names to match |
| `/home/shelter/shelter-apps/adoption-pdfs/test-adoption-es.html` | Test form copy — must update |

### Dashboard PWAs

**No impact.** [VERIFIED] No staff-pwa, staging-staff, or dashboard JS references `applicant_address` or `applicantAddress`. The dashboard list view only shows name/animal/status — address is viewed via PDF only.

### Other systems

- **SM sync:** No connection. Adoption applications are not synced to Shelter Manager. [VERIFIED — no SM references in adoption code]
- **Exports/CSV:** No export endpoint exists for adoption applications. [VERIFIED]
- **Notifications/alerts:** Not referenced. [VERIFIED]
- **Backups:** No schema dependency — SQLite backup is whole-file. [VERIFIED]

---

## Summary of Required Changes (Backend Only)

| Layer | File | Change |
|-------|------|--------|
| Schema | `localDatabase.ts` | ALTER TABLE add `applicant_city`, `applicant_state`, `applicant_zip`; optionally rename `applicant_address` → `applicant_street` |
| Types | `types.ts` | Add 3 fields to `AdoptionApplication` interface |
| DB write | `localDatabase.ts` `saveAdoptionApplication()` | Add 3 columns to INSERT |
| DB read | `localDatabase.ts` `rowToAdoptionApplication()` | Map 3 new columns |
| API intake | `server.ts` POST handler | Read 3 new `body.*` fields, add to `requiredFields`, add to `application` object |
| PDF render | `pdfGenerator.ts` | Replace single-address `twoColumn` with formatted 4-field output |
| Test forms | `test-adoption-es.html` (2 copies) | Update form field names |
| Translation | No change needed | Address fields excluded by design (allowlist) |
| Email | No change needed | Doesn't use address |
| Dashboard API | No change needed | GET list doesn't expose address |
| Migration | One-time | Backfill 9 existing rows — parse free-text addresses or leave city/state/zip NULL with `applicant_address` (street) retaining the original blob |
