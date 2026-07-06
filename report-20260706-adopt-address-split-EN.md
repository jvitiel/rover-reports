# Adoption Form Address-Split EN Implementation — 2026-07-06

## STEP 1 — Rollback Capture

- Backup file: `/home/rover/adopt-page7.bak-20260706-165838.html`
- Byte count: 75,303 bytes [VERIFIED]
- Non-empty confirmed [VERIFIED]

## STEP 2b — Diff (safety gate)

Diff shows exactly 2 regions, no other changes [VERIFIED]:

```diff
782,784c782,801
<             <label>Address <span class="required">*</span></label>
<             <input type="text" name="applicant_address" placeholder="Street, City, State, ZIP" required>
<             <span class="field-error">Please enter your full address</span>
---
>             <label>Street Address <span class="required">*</span></label>
>             <input type="text" name="applicant_address" placeholder="123 Main St" required>
>             <span class="field-error">Please enter your street address</span>
>           </div>
>         </div>
>         <div class="form-row">
>           <div class="form-group">
>             <label>City <span class="required">*</span></label>
>             <input type="text" name="applicant_city" placeholder="Nyack" required>
>             <span class="field-error">Please enter your city</span>
>           </div>
>           <div class="form-group">
>             <label>State <span class="required">*</span></label>
>             <input type="text" name="applicant_state" placeholder="NY" required>
>             <span class="field-error">Please enter your state</span>
>           </div>
>           <div class="form-group">
>             <label>ZIP Code <span class="required">*</span></label>
>             <input type="text" name="applicant_zip" placeholder="10960" required>
>             <span class="field-error">Please enter your ZIP code</span>
1505c1522,1525
<       { name: 'applicant_address', label: 'Address' },
---
>       { name: 'applicant_address', label: 'Street Address' },
>       { name: 'applicant_city', label: 'City' },
>       { name: 'applicant_state', label: 'State' },
>       { name: 'applicant_zip', label: 'ZIP Code' },
```

Region 1: Address block — old single-field `form-row single` replaced with street (single row) + city/state/zip (bare `form-row`, 3 columns via auto-fit grid).

Region 2: REQUIRED_TEXT_FIELDS — old single `applicant_address` entry replaced with 4 entries (address/city/state/zip).

## STEP 3 — Import

```
wp eval-file ~/import-page7.php
OK: updated post 7
```
[VERIFIED]

## STEP 4 — Live Verification

### 4a — HTTP Status [VERIFIED]
```
HTTP/2 200
server: nginx
```

### 4b — Input Name Attributes [VERIFIED]
```
applicant_address: 1
applicant_city: 1
applicant_state: 1
applicant_zip: 1
```
All 4 present exactly once.

### 4c — Old Placeholder Gone [VERIFIED]
```
Old placeholder matches: 0 (expect 0)
```
"Street, City, State, ZIP" no longer appears.

### 4d — REQUIRED_TEXT_FIELDS Updated [VERIFIED]
```
applicant_city in script: 2 (expect >=2)
applicant_state in script: 2 (expect >=2)
applicant_zip in script: 2 (expect >=2)
```
Each appears once as an input name and once in REQUIRED_TEXT_FIELDS.

### 4e — Form + Submit Handler Intact [VERIFIED]
```
form tags: 2
new FormData: 1
fetch( calls: 1
```
Form and submit handler present and intact.

### 4f — Page Size [VERIFIED]
```
Rendered page bytes: 131,965
```
Full-size page, not truncated.

## STEP 6 — Cache Purge [VERIFIED]

```
Success: Speed Optimizer by SiteGround assets folder purged successfully.
Warning: Unable to Purge File Cache. Please make sure it is enabled.
Success: Dynamic Cache Successfully Purged.
```

File cache not enabled (normal for this host). Dynamic cache purged.

## Artifacts

| Item | Location |
|------|----------|
| Backup (rollback) | `/home/rover/adopt-page7.bak-20260706-165838.html` (75,303 bytes) |
| Working copy | `/home/rover/adopt-page7.work.html` (retained on VPS) |
| Remote cleanup | `import-page7.php` + `adopt-page7.work.html` removed from SiteGround home |

## Scope Confirmation

- Page 7 (EN adopt) post_content: UPDATED [VERIFIED]
- Page 339 (ES adopta): NOT TOUCHED [VERIFIED — not accessed for writes]
- No theme files, plugins, options, or other posts modified [VERIFIED]
