# Adoption Form Submit Mechanism & POST Body Keys — EN + ES

## Q1 — Submit Mechanism + Endpoint

The form uses a JS `fetch()` submit handler, not a native HTML form action. [VERIFIED]

**Form element:** `<form>` with `id="adoptionForm"` inside `<div id="adoption-application">`. No `action` or `method` attribute on the form tag — submission is entirely JS-driven.

**Submit handler** (inline `<script>` in page content, not theme JS):

```js
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  if (!validateForm()) { return; }

  // Collect form data
  const formData = new FormData(form);
  const data = {};

  formData.forEach((value, key) => {
    // Skip pet rows - we'll handle separately
    if (!key.startsWith('pet_')) {
      data[key] = value;
    }
  });

  // Add language
  data.language = 'en';   // ES form uses: data.language = 'es';

  // Collect previous pets
  if (data.had_pets_before === 'yes') {
    data.previous_pets_json = collectPreviousPets();
  }

  // Convert checkbox values
  ['willing_animal_control_laws', 'willing_sign_papers', 'willing_followup'].forEach(key => {
    data[key] = data[key] === 'yes' ? 'yes' : 'no';
  });

  // Submit
  const response = await fetch('https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
```

**Endpoint:**
- EN: `POST https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application` [VERIFIED]
- ES: `POST https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application?lang=es` [VERIFIED]

**Body format:** `JSON.stringify(data)` with `Content-Type: application/json`. [VERIFIED]

**Submit logic location:** Inline `<script>` block inside the WordPress page content (post_content), not in the 4lg-theme JS directory. [VERIFIED — found at approximately line 1877 EN / 1910 ES in the rendered HTML]

---

## Q2 — Body-Key Construction + Full Current Key Set

**How the body is built:**
1. `new FormData(form)` iterates all named inputs in the form.
2. Each key/value is copied to a plain `data` object, **except** keys starting with `pet_` (previous-pet dynamic rows).
3. Three keys are added/modified programmatically:
   - `data.language` = `'en'` (or `'es'`)
   - `data.previous_pets_json` = array from `collectPreviousPets()` (if `had_pets_before === 'yes'`)
   - Agreement checkboxes normalized to `'yes'`/`'no'`

**Complete set of body keys POSTed** (derived from form `name` attributes + programmatic additions):

| # | Body Key | Source |
|---|----------|--------|
| 1 | `applicant_name` | text input |
| 2 | `applicant_email` | email input |
| 3 | `applicant_phone_cell` | tel input |
| 4 | `applicant_phone_home` | tel input |
| 5 | `applicant_address` | text input |
| 6 | `age_confirmed` | checkbox |
| 7 | `animal_type` | radio buttons (cat/dog/small_animal) |
| 8 | `animal_names_interested` | text input |
| 9 | `adopting_for` | text input |
| 10 | `gender_preference` | select |
| 11 | `personality_type` | textarea |
| 12 | `weight_size_preference` | select |
| 13 | `age_preference` | select |
| 14 | `cat_hair_length` | select |
| 15 | `cat_color` | text input |
| 16 | `cat_declaw` | select |
| 17 | `cat_behavior_counter` | textarea |
| 18 | `cat_behavior_furniture` | textarea |
| 19 | `cat_behavior_litterbox` | textarea |
| 20 | `dog_breed_type` | text input |
| 21 | `dog_hair_length` | select |
| 22 | `dog_fenced_yard` | select |
| 23 | `dog_fence_type` | text input |
| 24 | `dog_leash_use` | select |
| 25 | `dog_behavior_housebreak` | textarea |
| 26 | `dog_behavior_biting` | textarea |
| 27 | `dog_behavior_barking` | textarea |
| 28 | `small_animal_breed` | text input |
| 29 | `small_animal_hair` | select |
| 30 | `small_animal_behavior` | textarea |
| 31 | `occupation_applicant` | text input |
| 32 | `occupation_spouse` | text input |
| 33 | `household_count` | number input |
| 34 | `children` | select |
| 35 | `children_ages` | text input |
| 36 | `allergies` | select |
| 37 | `allergies_detail` | text input |
| 38 | `animal_caretaker` | text input |
| 39 | `residence_type` | select |
| 40 | `residence_owned` | select |
| 41 | `renter_pets_allowed` | text input |
| 42 | `renter_landlord_name` | text input |
| 43 | `renter_landlord_phone` | tel input |
| 44 | `animal_indoor_outdoor` | select |
| 45 | `someone_home_daytime` | select |
| 46 | `hours_unattended` | text input |
| 47 | `where_kept_when_away` | textarea |
| 48 | `plan_if_moving` | textarea |
| 49 | `had_pets_before` | select |
| 50 | `pets_neutered` | select |
| 51 | `pets_neutered_explain` | text input |
| 52 | `pets_indoor_outdoor` | select |
| 53 | `pets_vaccinated` | select |
| 54 | `financially_able` | select |
| 55 | `intro_precautions` | textarea |
| 56 | `not_get_along_plan` | textarea |
| 57 | `other_agencies` | textarea |
| 58 | `vet_name` | text input |
| 59 | `vet_phone` | tel input |
| 60 | `ref1_name` | text input |
| 61 | `ref1_association` | text input |
| 62 | `ref1_how_long` | text input |
| 63 | `ref1_home_phone` | tel input |
| 64 | `ref1_cell_phone` | tel input |
| 65 | `ref2_name` | text input |
| 66 | `ref2_association` | text input |
| 67 | `ref2_how_long` | text input |
| 68 | `ref2_home_phone` | tel input |
| 69 | `ref2_cell_phone` | tel input |
| 70 | `ref3_name` | text input |
| 71 | `ref3_association` | text input |
| 72 | `ref3_how_long` | text input |
| 73 | `ref3_home_phone` | tel input |
| 74 | `ref3_cell_phone` | tel input |
| 75 | `willing_animal_control_laws` | checkbox → 'yes'/'no' |
| 76 | `willing_sign_papers` | checkbox → 'yes'/'no' |
| 77 | `willing_followup` | checkbox → 'yes'/'no' |
| 78 | `digital_signature_name` | text input |
| 79 | `digital_signature_date` | hidden input |
| 80 | `language` | programmatic: 'en' or 'es' |
| 81 | `previous_pets_json` | programmatic: array from collectPreviousPets() |

**Address key confirmation:**
- Input `name` attribute: `applicant_address` [VERIFIED]
- Body key sent in POST: `applicant_address` (FormData key = input name) [VERIFIED]
- This matches the backend's `requiredFields` array and `body.applicant_address` read exactly. [VERIFIED]

**Collision check for planned new keys:**
- `applicant_city`: **does not exist** in current form [VERIFIED]
- `applicant_state`: **does not exist** in current form [VERIFIED]
- `applicant_zip`: **does not exist** in current form [VERIFIED]
- No other city/state/zip field under any name exists. [VERIFIED]

The new keys are safe to add with zero collision risk.

---

## Q3 — Address Field Markup (EN + ES)

### EN (`/adopt/`)

```html
<div class="form-row single">
  <div class="form-group">
    <label>Address <span class="required">*</span></label>
    <input type="text" name="applicant_address" placeholder="Street, City, State, ZIP" required>
    <span class="field-error">Please enter your full address</span>
  </div>
</div>
```

- Label text: `Address`
- Wrapper classes: `form-row single` → `form-group`
- Input: `type="text"`, `name="applicant_address"`, `placeholder="Street, City, State, ZIP"`, `required`
- No `id` attribute on the input. [VERIFIED]
- Validation entry in `REQUIRED_TEXT_FIELDS`: `{ name: 'applicant_address', label: 'Address' }` [VERIFIED]

### ES (`/es/adopta-una-mascota/`)

```html
<div class="form-row single">
  <div class="form-group">
    <label>Dirección <span class="required">*</span></label>
    <input type="text" name="applicant_address" placeholder="Calle, Ciudad, Estado, Código Postal" required>
    <span class="field-error">Por favor ingresa tu dirección completa</span>
  </div>
</div>
```

- Label text: `Dirección` (translated)
- Input `name` attribute: **`applicant_address`** — **IDENTICAL to EN** [VERIFIED]
- Placeholder: `Calle, Ciudad, Estado, Código Postal` (translated)
- Error message: `Por favor ingresa tu dirección completa` (translated)
- Validation entry in `REQUIRED_TEXT_FIELDS`: `{ name: 'applicant_address', label: 'Dirección' }` [VERIFIED]

**Key finding:** EN and ES use the same input `name="applicant_address"`. Only the label, placeholder, and error text are translated. The key sent in the POST body is identical. [VERIFIED]

---

## Q4 — EN/ES Key Parity

**EN and ES POST an identical set of body keys.** [VERIFIED]

`diff` of all `name` attributes between the two rendered pages produces **zero differences**. [VERIFIED — diff output was empty]

Both forms:
- Use the same input `name` attributes throughout
- Only translate user-visible text (labels, placeholders, error messages, button text)
- The JS submit handler is structurally identical; only `data.language` differs (`'en'` vs `'es'`) and the fetch URL (ES appends `?lang=es`)

The form↔API contract is: input `name` attributes = JSON body keys, plus `language` and `previous_pets_json` added programmatically. The contract is language-agnostic by design — no key translation occurs.

---

## Implementation Note for Form Change

The `new FormData(form)` → object pattern means: **whatever `name` attributes exist on the inputs will be the POST body keys automatically.** To split the address:

1. Replace the single `<input name="applicant_address">` with 4 inputs: `name="applicant_address"` (street), `name="applicant_city"`, `name="applicant_state"`, `name="applicant_zip"`
2. The submit handler needs **zero JS changes** — FormData will pick up the new names automatically
3. Update `REQUIRED_TEXT_FIELDS` to add the 3 new entries (and update the existing `applicant_address` label to "Street Address")
4. Do this identically on EN and ES pages (same `name` attributes, different labels/placeholders)

The backend API handler must then accept the 3 new keys — already diagnosed in the prior report.
