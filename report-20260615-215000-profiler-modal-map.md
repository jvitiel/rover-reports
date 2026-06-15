# Staff-PWA profiler recording modal — code map

**Date:** 2026-06-15 21:50 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: File paths

The profiler recording modal spans two files:

- **Markup for the modal overlay:** `/home/shelter/shelter-apps/staff-pwa/index.html` lines 328–348 [VERIFIED]
- **Modal JS logic + recording handlers + card template (Start/Stop/Upload buttons):** `/home/shelter/shelter-apps/staff-pwa/app.js` [VERIFIED]

---

## Q2: Q10 "Done" button

The "Done" button is the **same physical button** as the "Next" button — its text changes dynamically on Q10. [VERIFIED]

### Markup (index.html:342)

```html
<button id="profilerNextBtn" class="btn btn-primary" onclick="profilerModalNext()">Next</button>
```

### Text swap (app.js:2385)

```javascript
document.getElementById('profilerNextBtn').textContent = currentQuestionIndex === PROFILER_QUESTIONS.length ? 'Done' : 'Next';
```

On Q10 (`currentQuestionIndex === 10 === PROFILER_QUESTIONS.length`), the button reads "Done". [VERIFIED]

### Handler: `profilerModalNext()` (app.js:2398–2404)

```javascript
function profilerModalNext() {
  if (currentQuestionIndex >= PROFILER_QUESTIONS.length) {
    dismissProfilerModal();
    return;
  }
  currentQuestionIndex++;
  updateProfilerModalDisplay();
}
```

**On Q10, "Done" calls `dismissProfilerModal()`.** [VERIFIED]

### `dismissProfilerModal()` (app.js:2369–2371)

```javascript
function dismissProfilerModal() {
  document.getElementById('profilerQuestionModal').classList.remove('active');
}
```

**That's ALL it does.** It hides the modal overlay. It does NOT stop the recording, does NOT finalize audio, does NOT trigger transcription. The recording continues running in the background after the modal closes. [VERIFIED]

---

## Q3: "Stop Recording" button

There is no separate "Stop Recording" button in the modal. The Start/Stop Recording button is on the **profile card** behind the modal (not inside the modal itself). When recording is active, its label changes to "Stop Recording".

### Markup (app.js:2030–2033, inside the profile card template)

```javascript
<button class="btn-record" id="behaviorRecordBtn" onclick="toggleBehaviorRecording('${animal.animalId}', '${escapeForJs(animal.name)}')">
  <span class="record-icon">🎤</span>
  <span class="record-text">Start Recording</span>
</button>
```

### Handler: `toggleBehaviorRecording()` (app.js:2291–2340)

```javascript
async function toggleBehaviorRecording(animalId, name) {
  behaviorAnimalId = animalId;
  behaviorAnimalName = name;
  
  const btn = document.getElementById('behaviorRecordBtn');
  const indicator = document.getElementById('behaviorRecordingIndicator');
  
  if (isRecording) {
    stopBehaviorRecording();
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleBehaviorRecordingStop;
      
      mediaRecorder.start(500);
      isRecording = true;
      recordingStartTime = Date.now();
      acquireBehaviorWakeLock();
      
      btn.classList.add('recording');
      btn.querySelector('.record-text').textContent = 'Stop Recording';
      indicator.classList.add('active');
      
      recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        document.getElementById('behaviorRecordingTime').textContent = timeStr;
        const modalTimer = document.getElementById('profilerModalTimer');
        if (modalTimer) modalTimer.textContent = timeStr;
      }, 1000);

      // Open question-flow modal at question 1
      openProfilerQuestionModal();
    } catch (error) {
      console.error('Recording error:', error);
      alert('Unable to access microphone.');
      dismissProfilerModal();
      releaseBehaviorWakeLock();
    }
  }
}
```

When `isRecording` is true (i.e. button shows "Stop Recording"), clicking it calls `stopBehaviorRecording()`. [VERIFIED]

### `stopBehaviorRecording()` (app.js:2342–2358)

```javascript
function stopBehaviorRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  
  isRecording = false;
  clearInterval(recordingTimer);
  releaseBehaviorWakeLock();
  dismissProfilerModal();
  
  const btn = document.getElementById('behaviorRecordBtn');
  const indicator = document.getElementById('behaviorRecordingIndicator');
  if (btn) { btn.classList.remove('recording'); btn.querySelector('.record-text').textContent = 'Start Recording'; }
  if (indicator) indicator.classList.remove('active');
}
```

This:
1. Calls `mediaRecorder.stop()` → triggers `onstop` → calls `handleBehaviorRecordingStop()` [VERIFIED]
2. Stops all audio tracks
3. Clears timer, releases wake lock
4. Calls `dismissProfilerModal()` (closes modal if still open)
5. Resets button text to "Start Recording"

### `handleBehaviorRecordingStop()` (app.js:2403–2436)

```javascript
async function handleBehaviorRecordingStop() {
  const mimeType = mediaRecorder?.mimeType || 'audio/webm';
  const audioBlob = new Blob(audioChunks, { type: mimeType });
  
  if (audioBlob.size < 1000) { alert('Recording too short.'); return; }
  
  showLoading('Transcribing and analyzing...');
  const base64Audio = await blobToBase64(audioBlob);
  
  try {
    const response = await fetch(`${API_BASE}/caregiver/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64Audio, shelterCode: behaviorAnimalId, animalName: behaviorAnimalName, filename: 'recording.webm', caregiver: userName }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      pendingBehaviorData = result.data;
      displayBehaviorReview(result.data);
    } else {
      throw new Error(result.error || 'Processing failed');
    }
  } catch (error) {
    console.error('Behavior recording error:', error);
    alert('Error: ' + error.message);
  } finally {
    hideLoading();
  }
}
```

This sends the audio to `/caregiver/transcribe`, then shows the review view with extracted fields. [VERIFIED]

---

## Q4: Button markup with exact emoji characters

### Start/Stop Recording button (app.js:2030–2033)

```javascript
<button class="btn-record" id="behaviorRecordBtn" onclick="toggleBehaviorRecording('${animal.animalId}', '${escapeForJs(animal.name)}')">
  <span class="record-icon">🎤</span>
  <span class="record-text">Start Recording</span>
</button>
```

- Emoji: `🎤` — raw UTF-8 glyph (U+1F3A4 MICROPHONE), not an HTML entity or unicode escape [VERIFIED]
- The text "Start Recording" / "Stop Recording" is in the `<span class="record-text">` and toggled via `.textContent` in JS [VERIFIED]

### Upload from Phone button (app.js:2034–2036)

```javascript
<label class="btn-upload-phone" for="upload-phone-${animal.shelterCode}">
  📤 Upload from Phone
</label>
<input type="file" id="upload-phone-${animal.shelterCode}" accept="image/*" style="display:none" onchange="handleProfileUpload(event, '${animal.shelterCode}', '${animal.animalId}')">
```

- Emoji: `📤` — raw UTF-8 glyph (U+1F4E4 OUTBOX TRAY), not an HTML entity or unicode escape [VERIFIED]
- This is a `<label>` wrapping a hidden `<input type="file">`, not a `<button>` [VERIFIED]
- Handler: `handleProfileUpload(event, shelterCode, animalId)` — triggered on file selection, not on label click [VERIFIED]

---

## Q5: "Done" vs "Stop Recording" — shared code path?

**Partially shared, but divergent at the critical point.** [VERIFIED]

| Action | Calls | Stops recording? | Triggers transcription? |
|--------|-------|-------------------|------------------------|
| **"Done" (Q10)** | `profilerModalNext()` → `dismissProfilerModal()` | **NO** | **NO** |
| **"Stop Recording"** | `toggleBehaviorRecording()` → `stopBehaviorRecording()` → `mediaRecorder.stop()` → `handleBehaviorRecordingStop()` | **YES** | **YES** |

Both paths call `dismissProfilerModal()` (modal hide). But:

- **"Done" ONLY hides the modal.** The recording keeps running. The microphone stays active. The timer keeps ticking (on the profile card, behind the now-hidden modal). The user must then manually click "Stop Recording" on the profile card to finalize. [VERIFIED]
- **"Stop Recording" does everything:** stops the MediaRecorder, closes the mic, clears the timer, hides the modal, and fires `handleBehaviorRecordingStop` (transcription + review). [VERIFIED]

**They share only `dismissProfilerModal()`.** The recording lifecycle is entirely in the "Stop Recording" path. [VERIFIED]
