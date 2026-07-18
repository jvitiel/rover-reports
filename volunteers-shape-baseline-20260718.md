# Volunteers Table — Shape Baseline

Date: 2026-07-18T19:55Z
Type: read-only schema/shape reference — zero changes made
PII: NONE — column names, key names, and language codes only

---

## 1 — Column Names (PRAGMA table_info)

44 columns, ordered by cid: [VERIFIED]

```
 0  id                                 INTEGER  PK
 1  full_name                          TEXT     NOT NULL
 2  email                              TEXT
 3  cell_phone                         TEXT
 4  home_phone                         TEXT
 5  address_city                       TEXT
 6  address_state                      TEXT
 7  age_18_or_older                    BOOLEAN
 8  status                             TEXT     NOT NULL  DEFAULT 'pending'
 9  submission_source                  TEXT     NOT NULL
10  submitted_at                       TEXT     NOT NULL
11  approved_at                        TEXT
12  approved_by                        TEXT
13  form_version                       TEXT
14  form_data                          TEXT
15  original_files                     TEXT
16  ocr_raw                            TEXT
17  notes                              TEXT
18  training_start_date                TEXT
19  approved_dog_walk_socialize        BOOLEAN  DEFAULT 0
20  approved_dog_care                  BOOLEAN  DEFAULT 0
21  approved_dog_foster                BOOLEAN  DEFAULT 0
22  approved_cat_socialize             BOOLEAN  DEFAULT 0
23  approved_cat_care                  BOOLEAN  DEFAULT 0
24  approved_cat_foster                BOOLEAN  DEFAULT 0
25  approved_cat_tnvr                  BOOLEAN  DEFAULT 0
26  approved_small_socialize           BOOLEAN  DEFAULT 0
27  approved_small_care                BOOLEAN  DEFAULT 0
28  approved_small_foster              BOOLEAN  DEFAULT 0
29  approved_other_greeter             BOOLEAN  DEFAULT 0
30  approved_other_adoption_events     BOOLEAN  DEFAULT 0
31  approved_other_social_fundraising  BOOLEAN  DEFAULT 0
32  approved_other_shelter_maintenance BOOLEAN  DEFAULT 0
33  approved_other_front_office        BOOLEAN  DEFAULT 0
34  approved_other_back_office         BOOLEAN  DEFAULT 0
35  approved_other_it_tech             BOOLEAN  DEFAULT 0
36  approved_other_photography_social  BOOLEAN  DEFAULT 0
37  approved_other_transportation      BOOLEAN  DEFAULT 0
38  approved_other_misc_chores         BOOLEAN  DEFAULT 0
39  created_at                         TEXT     NOT NULL  DEFAULT datetime('now')
40  last_modified_at                   TEXT     NOT NULL  DEFAULT datetime('now')
41  policy_reviewed_at                 TEXT
42  tags                               TEXT
43  age_under_18                       INTEGER
```

**No `language` or `language_submitted` column exists.** [VERIFIED]

---

## 2 — form_data JSON Shape

Sampled row: id 487 (most recent). [VERIFIED]

### Top-level keys (6)

```
personal
open_text
availability
jobs
other_talents
availability_flags
```

Confirmed consistent across all 16 web_form submissions: `SELECT DISTINCT key FROM volunteers, json_each(form_data) WHERE submission_source = 'web_form'` returns the same 7 keys (the 6 above plus `form_version` when present). [VERIFIED]

**No `language` key at the form_data top level.** [VERIFIED — checked all web_form rows]

### Nested key names

**personal** (14 keys):
```
full_name, address, city, state, zip, cell_phone, home_phone, email,
emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
date, is_18_or_older, age_if_under_18
```

**open_text** (3 keys):
```
why_volunteer, special_skills, allergies_conditions
```

**availability** (10 keys):
```
monday, tuesday, wednesday, thursday, friday, saturday, sunday,
almost_any_time, seasonal, start_date
```

**jobs** (20 keys):
```
dog_walk_socialize, dog_care, dog_foster,
cat_socialize, cat_care, cat_foster, cat_tnvr,
small_socialize, small_care, small_foster,
other_greeter, other_adoption_events, other_social_fundraising,
other_shelter_maintenance, other_front_office, other_back_office,
other_it_tech, other_photography_social, other_transportation,
other_misc_chores
```

**other_talents**: scalar (string), not a sub-object.

**availability_flags**: sub-object (server-generated normalization flags, not from form input).

All key names above: [VERIFIED via json_each]

---

## 3 — Language Discriminator

### 3a. Where language is recorded

**It is NOT recorded.** There is no `language` column on the `volunteers` table and no `language` key inside `form_data`. [VERIFIED — PRAGMA + json_each across all web_form rows]

The language is READ at submission time but never persisted:

```typescript
// server.ts line ~9912 (inside POST /api/volunteers handler)
const isSpanish = req.body.language === 'es' || req.query.lang === 'es';
```

[VERIFIED — read from server.ts]

The JS form sends `language: 'es'` at the **top level of the request payload** (same level as `formData`, `status`, `submissionSource`) — NOT inside `formData`. The server destructures `req.body` as:

```typescript
const { tempId, formData, status, notes, approvedBy, submissionSource } = req.body;
```

`language` is not destructured into a named variable. It is accessed only via `req.body.language` for the `isSpanish` check. It is never passed to `insertVolunteer()` and never written to any column or JSON field. [VERIFIED]

### 3b. EN-vs-ES presence/value pattern

**EN rows:** No language trace anywhere. `form_data` contains no `language` key. No `_original_es` key. [VERIFIED — sampled id 487 and all 16 web_form rows]

**ES rows:** Would have `_original_es` key inside `form_data` (server writes it during translation at lines ~9924–9930). However: **zero ES volunteer submissions exist in the database.** [VERIFIED — `json_extract(form_data, '$._original_es') IS NOT NULL` returns 0 rows across entire table]

The `_original_es` key is the ONLY persistent language signal. The server writes it into `formData` before `JSON.stringify(formData)`:

```typescript
// server.ts lines ~9924-9930
if (isSpanish) {
  // ...
  formData._original_es = {
    why_volunteer: formData.open_text?.why_volunteer,
    special_skills: formData.open_text?.special_skills,
    allergies_conditions: formData.open_text?.allergies_conditions,
    other_talents: formData.other_talents,
  };
  // ... overwrites open_text fields with English translations
}
```

### 3c. Definitive rule

**EN rows carry:** No language indicator. `form_data` has no `language` key, no `_original_es` key. Open-text fields are stored as-is (English).

**ES rows carry:** `form_data._original_es` is PRESENT (preserving original Spanish open-text values before English translation overwrites them). No explicit `language` field — `_original_es` presence IS the language discriminator. Open-text fields (`why_volunteer`, `special_skills`, `allergies_conditions`, `other_talents`) are overwritten with English translations; originals preserved in `_original_es`.

**The definitive shape rule for Website 7:**
- The volunteer form JS sends `language: 'es'` at `req.body.language` (top-level payload, outside `formData`).
- The server checks `req.body.language === 'es' || req.query.lang === 'es'` to detect Spanish.
- Language is consumed (triggers translation) but NOT persisted as a named field.
- The only persistent signal is `form_data._original_es` (PRESENT on ES rows, ABSENT on EN rows).
- **There is no `language` or `language_submitted` column or JSON key.** This differs from the adoption form, which stores `language_submitted` as a top-level column. [VERIFIED — contrast: `PRAGMA table_info(adoption_applications)` would show a `language_submitted` column; `volunteers` does not have one]

### Scoping report reference

Full extraction scoping: https://raw.githubusercontent.com/jvitiel/rover-reports/main/report-20260718-volunteer-extraction-scoping.md
