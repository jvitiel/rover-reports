# Adoptions Tab — Scoping Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Map the adoption submission pipeline, determine whether data is stored and PDFs are web-accessible, identify the volunteer pattern to mirror, and scope the new Adoptions tab.

---

## 1. The Adoption Submission Handler

**Endpoint:** `POST /api/adoption-application` at **server/src/server.ts:8798–9064**

**Pipeline (in order):**

1. **Receive form fields** (server.ts:8809–8830) — validates required: `applicant_name`, `applicant_email`, `applicant_phone_cell`, `applicant_address`, `animal_type`, `digital_signature_name`. Also receives `animal_names_interested` (the animal name(s) the applicant is interested in), `language` (en/es), and ~50 other fields covering preferences, household, references, etc.

2. **Build application object** (server.ts:8835–8924) — maps every body field into a typed `AdoptionApplication` object.

3. **Translate if Spanish** (server.ts:8926–8966) — if `language_submitted === 'es'`, calls `translateApplicationFields()` on ~26 free-text fields (personality_type, behavior fields, occupation, etc.). Sets `application.translated = true`. On failure, continues in Spanish.

4. **Save to database** (server.ts:8986) — calls `saveAdoptionApplication(application)` → inserts into `adoption_applications` table, returns the new `id`.

5. **Generate PDF** (server.ts:8999) — calls `generateApplicationPdf(savedApp)` → writes PDF to `/home/shelter/shelter-apps/adoption-pdfs/{id}-{SafeName}-{date}.pdf`. Marks `pdf_generated = 1` on success.

6. **Send emails** (server.ts:9014–9045) — sends staff notification email with PDF attached, then sends applicant confirmation email with PDF copy. Marks `email_sent = 1` on success.

---

## 2. Is the Application Already Stored? — YES ✅

**Table:** `adoption_applications` — full schema with 85+ columns.

```sql
CREATE TABLE adoption_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    language_submitted TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'new',
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone_cell TEXT NOT NULL,
    applicant_address TEXT NOT NULL,
    animal_type TEXT NOT NULL,          -- 'cat', 'dog', 'small_animal'
    animal_names_interested TEXT,       -- the animal name(s)
    ...
    digital_signature_name TEXT NOT NULL,
    digital_signature_date TEXT,
    form_data_json TEXT,               -- full raw form body
    pdf_generated INTEGER NOT NULL DEFAULT 0,
    email_sent INTEGER NOT NULL DEFAULT 0,
    translated INTEGER NOT NULL DEFAULT 0
);
```

Indexed on `status` and `submitted_at`.

**Populated at:** server.ts:8986 via `saveAdoptionApplication()` (localDatabase.ts:2041).

**Current data:** 9 applications, earliest 2026-03-15, latest 2026-05-14.

**Existing list function:** `getAdoptionApplications(status?)` at **localDatabase.ts:2183** — returns all applications ordered by `submitted_at DESC`. Already written but **NOT imported or called** from server.ts (no GET endpoint exists yet).

---

## 3. Where Does the PDF Go? — SAVED TO DISK + WEB-ACCESSIBLE ✅

**PDF generation:** pdfGenerator.ts:40–45

```ts
const dateStr = new Date().toISOString().split('T')[0];
const safeName = sanitizeFilename(app.applicant_name);
const filename = `${app.id}-${safeName}-${dateStr}.pdf`;
const filepath = path.join(PDF_DIR, filename);
```

**PDF directory:** `/home/shelter/shelter-apps/adoption-pdfs/` (pdfGenerator.ts:8)

**Static serving:** server.ts:10517–10518

```ts
// Serve adoption PDFs as static files (for blank forms and generated PDFs)
app.use('/adoption-pdfs', express.static(getPdfDirectory()));
```

**Web-accessible URL pattern:** `/adoption-pdfs/{id}-{SafeName}-{date}.pdf`

**Current files on disk:** 13 files (9 generated applications + 2 blank templates + 1 .gitkeep). Example: `9-John_Vitiello-2026-05-14.pdf`.

**The PDF filename is NOT stored in the database.** It can be reconstructed from `id` + `applicant_name` + `submitted_at` date, but this is fragile (name sanitization, date = generation date not submission date). For the Adoptions tab, either:
- Store the filename in a new column (cleanest), or
- Reconstruct it with the same `sanitizeFilename()` logic client-side (fragile but zero-migration)

**Static path is already in the auth-exempt list** at server.ts:717: `'/adoption-pdfs/'` is whitelisted alongside `/data/`, `/public/`, etc. — so PDFs are publicly accessible via URL without dashboard auth.

---

## 4. The Volunteer Pattern (to mirror)

### 4a. Volunteer submission handler

**Web form endpoint:** `POST /api/volunteers` at **server.ts:9350** — receives form data from WordPress, translates Spanish fields, saves to `volunteers` table with `submission_source: 'web_form'`.

**Upload+OCR endpoint:** `POST /api/volunteers/upload` at **server.ts:9177** — receives scanned images, runs OCR to extract fields, returns extracted data for review.

### 4b. Volunteer table

```sql
CREATE TABLE volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT, cell_phone TEXT, address_city TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    submission_source TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    ...
);
```

### 4c. Volunteer list endpoint

`GET /api/volunteers` at **server.ts:9494** — returns all volunteers, optionally filtered by status/search/tags.

### 4d. Dashboard volunteer tab

**Tab button:** dashboard/index.html:5235
```html
<button class="tab-btn" onclick="switchTab('volunteers')" id="tab-volunteers">🤝 Volunteers</button>
```

**Tab content:** dashboard/index.html:6152 — `<div class="tab-content" id="content-volunteers">`

**Data loading:** `volLoadList()` at dashboard/index.html:14152 — fetches `/api/volunteers`, renders table rows with `submitted_at`, `full_name`, city, phone, status, tags.

**switchTab integration:** dashboard/index.html:9009 — `else if (tabName === 'volunteers') { volLoadList(); }`

**Pattern summary:** Tab button → `switchTab('volunteers')` → `volLoadList()` → `GET /api/volunteers` → renders `<tbody>` rows. Click row → detail view.

---

## 5. The Dashboard Tabs

**Tab bar:** dashboard/index.html:5226–5235

```html
<button class="tab-btn active" onclick="switchTab('animals')" id="tab-animals">📷 Media</button>        <!-- :5226 -->
<button class="tab-btn" onclick="switchTab('profiles')" id="tab-profiles">📋 Profiles</button>           <!-- :5227 -->
<button class="tab-btn" onclick="switchTab('stories')" id="tab-stories">📖 Web Stories</button>           <!-- :5228 -->
<button class="tab-btn" onclick="switchTab('events')" id="tab-events">📅 Web Events</button>              <!-- :5229 -->
<button class="tab-btn" onclick="switchTab('activities')" id="tab-activities">🚶 Activities</button>      <!-- :5230 -->
<button class="tab-btn" onclick="switchTab('feeding')" id="tab-feeding">🍖 Feeding</button>               <!-- :5231 -->
<button class="tab-btn" onclick="switchTab('wellbeing')" id="tab-wellbeing">💚 Wellbeing</button>         <!-- :5232 -->
<button class="tab-btn" onclick="switchTab('intake')" id="tab-intake">🚨 Overnight Intake</button>        <!-- :5233 -->
<button class="tab-btn" onclick="handleRgcTabClick()" id="tab-rgc" style="display: none">📬 RG Cares</button> <!-- :5234 -->
<button class="tab-btn" onclick="switchTab('volunteers')" id="tab-volunteers">🤝 Volunteers</button>     <!-- :5235 -->
```

**"Adoptions" would slot between Profiles (5227) and Web Stories (5228)** — a new line after 5227:

```html
<button class="tab-btn" onclick="switchTab('adoptions')" id="tab-adoptions">📝 Adoptions</button>
```

**Content pattern:** Each tab has a `<div class="tab-content" id="content-{tabName}">` section.

**switchTab pattern:** Add `else if (tabName === 'adoptions') { loadAdoptionsData(); }` at ~line 9009.

---

## 6. Scope Summary

### What already exists

| Piece | Status |
|-------|--------|
| Adoption applications stored in DB | ✅ `adoption_applications` table, 9 rows |
| DB list function | ✅ `getAdoptionApplications()` in localDatabase.ts:2183 (not yet imported in server.ts) |
| PDFs saved to disk | ✅ `/home/shelter/shelter-apps/adoption-pdfs/` |
| PDFs web-accessible | ✅ Served via `/adoption-pdfs/` static route (server.ts:10518) |
| GET endpoint for listing | ❌ Does not exist yet |
| Dashboard tab | ❌ Does not exist yet |

### Classification: SMALL-MEDIUM (mostly UI + one thin API endpoint)

The data pipeline is **fully built** — applications are stored, PDFs are saved and web-accessible. No changes to the live submission handler needed.

**Required pieces:**

1. **Backend — 1 new GET endpoint** (SMALL, ~15 lines)
   - `GET /api/dashboard/adoption-applications` → import + call `getAdoptionApplications()`, return rows with computed PDF URL.
   - The DB function already exists; just needs wiring. Does NOT touch the POST handler.
   - PDF URL: either reconstruct from `id + applicant_name + submitted_at` using the same `sanitizeFilename` logic, OR add a `pdf_filename` column to the table (cleaner but requires a migration + updating the POST handler's save step — slightly more touching).
   - **Simpler path:** return the fields and let the client construct the PDF link, or do a `fs.existsSync()` check server-side to find the matching file.

2. **Frontend — 1 new tab** (SMALL-MEDIUM, ~100–150 lines)
   - Tab button after Profiles in the tab bar (1 line, dashboard/index.html:5228).
   - Tab content `<div>` with table: columns = submitted date, applicant name, animal name(s), species (animal_type), PDF link. Newest first (already the DB sort order).
   - `switchTab` integration (1 line).
   - `loadAdoptionsData()` function: fetch → render table. Mirror `volLoadList()` pattern but simpler (no filters, no detail view, just a read-only table with a PDF link column).

3. **Risk assessment:** **LOW** — does NOT touch the live adoption submission handler (POST endpoint). Only adds a new GET endpoint + dashboard tab. The existing submission pipeline is read from, not written to.

### Optional enhancement (not required for MVP)

- Status management (mark reviewed, in-progress, etc.) — mirrors volunteer status workflow
- Search/filter by applicant name, species, date range
- Detail view (click row → full application data)

These can come later. The MVP tab is a simple read-only table with PDF links.
