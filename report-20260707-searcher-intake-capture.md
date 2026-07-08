# Searcher + Overnight Intake — Architecture Capture

## SEARCHER (a.k.a. "Matcher")

### 1. What It Is + How Served

**An AI-powered adoption search assistant.** Public-facing web app where prospective adopters describe what they want in a pet (species, sex, age, narrative preferences), and the system matches them against current shelter animals using Claude + structured bios.

- **Not a separate service** — routes within `shelter-app` (Express), client as static files
- **Client:** `/home/shelter/shelter-apps/matcher-preview/` → served at `/matcher` path
- **Subdomain:** `matcher.4lgshelterapp.duckdns.org` (Caddy reverse-proxy, line 97)
- **CORS origin:** Explicitly listed in CORS allow-list (server.ts:641)
- **Static mount:** `app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-preview')))` (server.ts:11608)

[VERIFIED]

### 2. Endpoints + Model

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/matcher/custom-search` | Main search endpoint — accepts species/sex/ageGroup/narrative, returns matched animals with AI-written bios |

**Model:** `claude-sonnet-4-6` (Anthropic) — used in 3 phases within the endpoint:
1. Phase 1: Intent extraction via `intentExtractor.ts` (narrative → structured filters: color/size/breed/coat/softTerms)
2. Phase 2: Bio writing for matched animals (generates personalized adoption write-ups)
3. Phase 3: Content filtering / preamble generation (low-confidence handling)

[VERIFIED — server.ts:6024, 6138, 6623; all `claude-sonnet-4-6`]

### 3. Data + Files

#### `searcher_daily_metrics` table

| Column | Type | Purpose |
|--------|------|---------|
| snapshot_date | TEXT PK | Date (ET) |
| queries | INTEGER | Total searches that day |
| success_count | INTEGER | Successful matches |
| male/female | INTEGER | Sex filter counts |
| young/adult/senior | INTEGER | Age filter counts |
| lang_en/lang_es | INTEGER | Language breakdown |
| preamble_low_confidence | INTEGER | Low-confidence result count |
| preamble_low_threshold | INTEGER | Below-threshold count |
| preamble_both | INTEGER | Both conditions count |
| errors | INTEGER | Error count |
| avg_response_time_sec | REAL | Avg response time |
| species_cat/dog/small | INTEGER | Species breakdown |

Current rows: 72. [VERIFIED]

#### `matcher_audit` table

Per-search audit trail — 938 rows. Logs hard filters, narrative, result codes, result bios, rejected codes, candidate count, response time, token usage, low-confidence flag, preamble text, language. [VERIFIED]

#### FAQ/Knowledge Files

| File | Size | Entries | Content |
|------|------|---------|---------|
| `server/config/shelter-policy-faq.json` | 908 B | 9 | EN cat FAQ — spay/vax/chip, vet, adoption fees, return policy, follow-up, etc. |
| `server/config/shelter-policy-faq-es.json` | 1,126 B | 9 | ES cat FAQ (same 9 keys, Spanish) |
| `server/config/shelter-policy-faq-dog.json` | 908 B | 9 | EN dog FAQ |
| `server/config/shelter-policy-faq-dog-es.json` | 1,128 B | 9 | ES dog FAQ |

Keys: `spay_vax_chip`, `vet`, `adoption_fees`, `return_policy`, `follow_up`, and 4 more shelter-policy Q&A pairs. [VERIFIED]

#### Intent Extractor

`server/src/intentExtractor.ts` — Phase 1 intent extraction. Parses adopter narrative into structured `ExtractedIntent`: color, size, breed, coat (arrays or null), softTerms (free-text preferences like "playful", "good with kids"). One Anthropic API call per search. [VERIFIED]

### 4. Status

- **Live in production:** YES — `https://matcher.4lgshelterapp.duckdns.org/` returns **200** [VERIFIED]
- **Species supported:** cat, dog, small_animal — all three are in `ENABLED_SPECIES` [VERIFIED — server.ts:4799]
- **EN + ES:** Fully bilingual — `?lang=es` parameter, localized error strings, ES FAQ files [VERIFIED]
- **Wired to public site:** [UNCERTAIN — would need to check WordPress theme for links to the matcher URL; not inspected this pass]
- **Small-animal FAQ:** No dedicated `shelter-policy-faq-small*.json` files exist — only cat and dog FAQ files. Small animals use the same search flow but lack species-specific policy FAQ. [VERIFIED — `find` returned no small-animal FAQ]

## OVERNIGHT INTAKE

### 5. What It Is + Status

**A police drop-off intake form** for overnight/after-hours animal seizures. Officers submit a form with animal details, photo, and optional voice note. Staff get email alerts and manage intakes from the dashboard.

#### Approval/Gating Status

- **Public submit `POST /api/intake`:** **INTENTIONALLY UNGATED** — designed for anonymous police officer use. Not in `isGatedWrite()`. Comment at server.ts:805–807 explicitly states: _"existing W1 volunteer/intake writes are NOT added until W1b (server enforcement step). Public submits... must NEVER appear here."_ The form is public-facing by design. [VERIFIED]
- **Dashboard read `GET /api/intakes`:** **UNGATED** — no auth middleware, no token check. Returns all intakes to any caller. [VERIFIED — server.ts:11860–11868, no auth guard]
- **Dashboard read `GET /api/intakes/:id`:** **UNGATED** — same, no auth. [VERIFIED]
- **Status update `POST /api/intakes/:id/status`:** **UNGATED** — no auth guard on the write. [VERIFIED]
- **Alert recipients `GET/POST/DELETE /api/intake-recipients`:** `GET /api/intake-recipients` IS in `isGatedPath()` (line 799: `p === '/api/intake-recipients'`). The `POST` is NOT in `isGatedWrite()`. [VERIFIED]
- **Intake audio `GET /api/docs/intake-audio/:id/:file`:** **GATED** — under `isGatedPath()` via the `/api/docs/` prefix check. Has strict filename validation + path-traversal guard. [VERIFIED — server.ts:11419–11455]
- **Intake photos `/intake-photos/*`:** **UNGATED** — served via `express.static()` (server.ts:12024). No auth. Filenames are UUID-based (not sequential), providing obscurity but not access control. [VERIFIED]

### 6. Endpoints + Data

#### Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/intake` | Serve the intake form HTML | None (public) |
| POST | `/api/intake` | Submit intake (multipart: form data + photo) | None (public, by design) |
| GET | `/api/intake/confirm/:id` | Confirmation page after submit | None |
| POST | `/api/intake/:id/voice` | Upload voice note for intake | None |
| GET | `/api/intakes` | List all intakes (dashboard) | None |
| GET | `/api/intakes/stats` | Intake stats (dashboard) | None |
| GET | `/api/intakes/:id` | Single intake detail (dashboard) | None |
| POST | `/api/intakes/:id/status` | Update intake status (dashboard) | None |
| GET | `/api/intake-recipients` | List alert recipients | PII-gated |
| POST | `/api/intake-recipients` | Add alert recipient | None |
| DELETE | `/api/intake-recipients/:id` | Remove alert recipient | None |
| GET | `/api/docs/intake-audio/:id/:file` | Stream voice note | PII-gated |

#### `overnight_intakes` table — PII content

| Column | PII? | Content |
|--------|------|---------|
| date_seized, time_seized | No | Seizure date/time |
| location_found | Potentially | Where animal was found |
| reason, reason_other | No | Seizure reason |
| breed, sex, color, dog_name | No | Animal description |
| **officer_name** | **Yes** | Submitting officer's name |
| **officer_phone** | **Yes** | Officer phone (added later) |
| **officer_email** | **Yes** | Officer email (added later) |
| hit_by_car through bloated | No | Medical condition checkboxes |
| photo_url | No | Photo path (UUID filename) |
| other_notes | Potentially | Free-text notes |
| voice_note_url | No | Voice note path |
| voice_transcript | Potentially | Whisper transcription of voice note |
| jurisdiction | No | Municipality name |
| status | No | new/reviewed/resolved |
| submitted_at, email_sent_at | No | Timestamps |

Current rows: 13. [VERIFIED]

#### `intake_alert_recipients` table

3 rows — email addresses + names of staff who receive email alerts on new intakes. [VERIFIED]

#### File Storage

| Type | Path | Naming | Serving |
|------|------|--------|---------|
| Photos | `/home/shelter/shelter-apps/intake-photos/` | UUID filenames (multer diskStorage) | `express.static` — ungated |
| Voice notes | `/home/shelter/shelter-apps/intake-audio/{intakeId}/` | `voice_{timestamp}.webm` | `/api/docs/intake-audio/:id/:file` — PII-gated |

[VERIFIED]

#### Multer config for intake photos

```ts
const intakeStorage = multer.diskStorage({ ... });
const intakeUpload = multer({ storage: intakeStorage, limits: { fileSize: 5 * 1024 * 1024 } });
```

5 MB limit, disk storage (not memory). [VERIFIED — server.ts:11683–11693]

#### 3 PDF Report Buttons (client-side, jsPDF)

| Report | Filename pattern | Content |
|--------|-----------------|---------|
| Intake Report | `Intake-Report-{id}-{date}.pdf` | Full intake details |
| Health Assessment | `Health-Assessment-{id}.pdf` | Medical condition summary |
| Seizure Record | `Seizure-Record-{id}.pdf` | Legal seizure documentation |

All generated client-side via jsPDF — no server endpoint. [VERIFIED — dashboard/index.html:12024, 12145, 12244]

### 7. How It's Accessed

- **Officer submission:** Standalone intake form at `/intake` path (served from `/home/shelter/shelter-apps/intake-form.html`). Listed in Caddy's `@standalone` matcher so it bypasses the dashboard SPA. Accessible at `https://dashboard.4lgshelterapp.duckdns.org/intake`. [VERIFIED]
- **Staff management:** Dashboard "🚨 Overnight Intake" tab (tab #9 of 10). Lists all intakes in a table, click to view details, update status, generate PDF reports. [VERIFIED]
- **Email alerts:** On new submit → `sendIntakeAlertEmail` to recipients in `intake_alert_recipients` + `sendIntakeOfficerReceiptEmail` to the submitting officer. [VERIFIED]
