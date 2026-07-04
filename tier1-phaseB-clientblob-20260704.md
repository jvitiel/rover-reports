# Tier-1 Phase B: Dashboard Document Links → Gated /api/docs/* via Blob

## STEP 1: Link-Site Findings (verbatim, before edits)

### (a) Adoption PDF — "View PDF" link

**File:** `dashboard/index.html`, inside `loadAdoptionsData()` row template  
**Mechanism:** Bare `<a href>` — no token, opens static path in new tab  
**Current code:**
```js
const pdfCell = a.pdfUrl
  ? `<a href="${a.pdfUrl}" target="_blank" rel="noopener" title="Open PDF">📄 View PDF</a>`
  : '—';
```
**Current URL:** `/adoption-pdfs/{id}-{Name}-{date}.pdf` (from `a.pdfUrl` in API response)  
**ID source:** `a.id` (integer, available in the same `rows.map(a => ...)` callback) [VERIFIED]

### (b) Volunteer scan — thumbnails (site 1)

**File:** `dashboard/index.html`, inside volunteer edit form rendering  
**Mechanism:** Bare `<img src>` with cache-bust — no token  
**Current code:**
```js
volFileUrls.forEach((url, i) => {
  const bustUrl = url.split('?')[0] + '?v=' + cacheBust;
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" src="${bustUrl}" alt="Page ${i+1}" onclick="volOpenScan('${bustUrl}')">...`;
});
```
**Current URL:** `/data/volunteer-files/{uuid}/page-NN.jpg` (from `volFileUrls` array, sourced from DB `original_files` JSON or upload API `fileUrls`)  
**UUID/file source:** Embedded in the URL string. Pattern: `/data/volunteer-files/{uuid}/{file}` [VERIFIED]

**Note:** Two additional re-render sites exist with identical thumbnail code — after `volRotateImage()` and after `volRotateFromLightbox()`. Both were converted. [VERIFIED]

### (b) Volunteer scan — lightbox (site 2)

**File:** `dashboard/index.html`, `volOpenScan(url)` function  
**Mechanism:** Creates a `div.vol-lightbox` overlay with bare `<img src>` — no token  
**Current code:**
```js
function volOpenScan(url) {
  const overlay = document.createElement('div');
  overlay.className = 'vol-lightbox';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  const cleanUrl = url.split('?')[0];
  const idx = volFileUrls.findIndex(u => u.split('?')[0] === cleanUrl);
  overlay.innerHTML = `<button class="vol-lightbox-close">×</button>
    <button class="vol-lightbox-rotate" data-url="${cleanUrl}" data-index="${idx}">↻ Rotate</button>
    <img src="${url}" alt="Scan">`;
  document.body.appendChild(overlay);
}
```
**Current URL:** Same `/data/volunteer-files/{uuid}/page-NN.jpg` passed from thumbnail onclick [VERIFIED]

### (c) Intake audio — `<audio>` element

**File:** `dashboard/index.html`, inside overnight intake detail rendering  
**Mechanism:** Direct `audioEl.src` assignment — no token  
**Current code:**
```js
const audioEl = document.getElementById('intakeVoiceAudio');
if (intake.voice_note_url) {
  audioEl.src = intake.voice_note_url;
  audioEl.style.display = 'block';
} else {
  audioEl.style.display = 'none';
}
```
**Current URL:** `/intake-audio/{id}/voice_{timestamp}.webm` (from `intake.voice_note_url` in API response)  
**ID/file source:** Embedded in the URL string. Pattern: `/intake-audio/{id}/{file}` [VERIFIED]

---

## STEP 2: Shared Helpers Added

### `gatedFetch(url, options)` — general-purpose gated fetch

```js
async function gatedFetch(url, options = {}) {
  await _tokenReady;                    // Same shared promise as gatedGet (3s timeout race)
  if (_piiGateToken) {
    options.headers = Object.assign({}, options.headers || {}, { 'X-Gate-Token': _piiGateToken });
  }
  let resp = await fetch(url, options);
  if (resp.status === 401) {            // Single bounded retry — no loop
    await fetchToken();                  // Reuses existing fetchToken()
    if (_piiGateToken) {
      options.headers = Object.assign({}, options.headers || {}, { 'X-Gate-Token': _piiGateToken });
    }
    resp = await fetch(url, options);   // One retry, then return whatever status
  }
  return resp;
}
```

Mirrors gatedGet exactly: same `_tokenReady` await (with existing ~3s timeout), same `_piiGateToken` variable, same `fetchToken()` call, single bounded 401 retry. No second token channel. [VERIFIED]

### `gatedBlobUrl(url)` — fetch → blob → object URL

```js
async function gatedBlobUrl(url) {
  const resp = await gatedFetch(url);
  if (!resp.ok) return null;             // Caller handles null (shows error/fallback)
  const blob = await resp.blob();
  return URL.createObjectURL(blob);      // Caller responsible for revokeObjectURL
}
```

Returns `null` on non-ok response so callers can show error state. Callers revoke blob URLs on teardown. [VERIFIED]

---

## STEP 3: Converted Link Sites

### (a) Adoption PDF → `openGatedPdf(appId)`

**New link markup:**
```js
const pdfCell = a.pdfUrl
  ? `<a href="#" onclick="event.preventDefault(); openGatedPdf(${a.id})" title="Open PDF">📄 View PDF</a>`
  : '—';
```

**New handler:**
```js
async function openGatedPdf(appId) {
  try {
    const blobUrl = await gatedBlobUrl('/api/docs/adoption-pdf/' + appId);
    if (!blobUrl) { alert('Failed to load PDF'); return; }
    const w = window.open(blobUrl, '_blank');
    if (w) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error('[Adoptions] PDF load error:', err);
    alert('Failed to load PDF');
  }
}
```

**New URL:** `GET /api/docs/adoption-pdf/{id}` (integer id from `a.id`)  
**Revoke:** After 60s delay (allows new tab to fully load the PDF) [VERIFIED]

### (b) Volunteer scan thumbnails → gated blob `<img>`

**New thumbnail rendering (all 3 render sites — initial, post-rotate, post-lightbox-rotate):**
```js
volFileUrls.forEach((url, i) => {
  const cleanUrl = url.split('?')[0];
  const gatedUrl = volToGatedUrl(cleanUrl);
  const thumbId = 'vol-thumb-' + i;
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" id="${thumbId}" alt="Page ${i+1}" onclick="volOpenGatedScan(${i})" style="background:#f0ece6;">...`;
  if (gatedUrl) gatedBlobUrl(gatedUrl).then(b => {
    if (b) { document.getElementById(thumbId).src = b; document.getElementById(thumbId).dataset.blobUrl = b; }
  });
});
```

**URL converter helper:**
```js
function volToGatedUrl(url) {
  const m = url.match(/^\/data\/volunteer-files\/([0-9a-fA-F-]{36})\/(.+)$/);
  return m ? '/api/docs/volunteer-file/' + m[1] + '/' + m[2] : null;
}
```

**New URL:** `GET /api/docs/volunteer-file/{uuid}/{file}` (extracted from existing `/data/volunteer-files/{uuid}/{file}` URL)  
**Image loads async** — shows neutral background until blob arrives [VERIFIED]

### (b) Volunteer scan lightbox → `volOpenGatedScan(index)`

**New gated lightbox:**
```js
async function volOpenGatedScan(index) {
  const url = volFileUrls[index];
  if (!url) return;
  const cleanUrl = url.split('?')[0];
  const gatedUrl = volToGatedUrl(cleanUrl);
  const overlay = document.createElement('div');
  overlay.className = 'vol-lightbox';
  let blobUrl = null;
  overlay.onclick = async (e) => { if (e.target === overlay) { if (blobUrl) URL.revokeObjectURL(blobUrl); overlay.remove(); } };
  overlay.innerHTML = `<button class="vol-lightbox-close" onclick="...">×</button>
    <button class="vol-lightbox-rotate" data-url="${cleanUrl}" data-index="${index}">↻ Rotate</button>
    <img alt="Loading scan..." style="background:#f0ece6; min-width:200px; min-height:300px;">`;
  document.body.appendChild(overlay);
  if (gatedUrl) {
    blobUrl = await gatedBlobUrl(gatedUrl);
    const img = overlay.querySelector('img');
    if (img && blobUrl) { img.src = blobUrl; img.dataset.blobUrl = blobUrl; }
  }
}
```

**Revoke:** On lightbox close (overlay click or × button) [VERIFIED]

**Original `volOpenScan` preserved** (still exists, updated close handler to revoke blob URLs on dismiss). Used as fallback by rotate operations that return a bare `/data/...` URL from the rotate-image API. [VERIFIED]

### (c) Intake audio → gated blob `<audio>`

**New code:**
```js
const audioEl = document.getElementById('intakeVoiceAudio');
if (intake.voice_note_url) {
  if (audioEl.dataset.blobUrl) { URL.revokeObjectURL(audioEl.dataset.blobUrl); audioEl.dataset.blobUrl = ''; }
  const audioMatch = intake.voice_note_url.match(/^\/intake-audio\/(\d+)\/(.+)$/);
  if (audioMatch) {
    gatedBlobUrl('/api/docs/intake-audio/' + audioMatch[1] + '/' + audioMatch[2]).then(b => {
      if (b) { audioEl.src = b; audioEl.dataset.blobUrl = b; }
      else { audioEl.src = intake.voice_note_url; }  // fallback
    }).catch(() => { audioEl.src = intake.voice_note_url; });
  } else {
    audioEl.src = intake.voice_note_url;  // fallback if URL doesn't match pattern
  }
  audioEl.style.display = 'block';
}
```

**New URL:** `GET /api/docs/intake-audio/{id}/{file}` (extracted from `/intake-audio/{id}/voice_{ts}.webm`)  
**Revoke:** On next load (previous blob URL revoked before setting new one)  
**Fallback:** If gated fetch fails, falls back to old static URL (old mount still live this phase) [VERIFIED]

---

## Confirmation: Nothing Else Touched

- **No static mount changed** — `/adoption-pdfs`, `/data`, `/intake-audio`, `/intake-photos` all untouched [VERIFIED]
- **No Caddy config changed** [VERIFIED]
- **No rate-limiter `staticPrefixes` changed** [VERIFIED]
- **No `/api/docs/*` routes changed** [VERIFIED]
- **No `isGatedPath` changed** [VERIFIED]
- **No server.ts changed** [VERIFIED]

## Build Result

Dashboard is served as static HTML — no build step required. Server tsc build confirmed still clean:
```
> shelter-apps@2.0.0 build
> tsc
Process exited with code 0.
```
[VERIFIED]

## git diff --stat

```
dashboard/index.html | 104 ++++++++++++++++++++++++++++++++++++++++++++++-----
 1 file changed, 95 insertions(+), 9 deletions(-)
```

Exactly 1 file. [VERIFIED]

## Commit

```
[master 4322956] Tier-1 Phase B: convert dashboard adoption-PDF/volunteer-scan/intake-audio
  links to gated /api/docs routes via gatedFetch blob helper
 1 file changed, 95 insertions(+), 9 deletions(-)
```

Only `dashboard/index.html` staged and committed. [VERIFIED]
