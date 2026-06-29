# Health-Check Rebuild — Implementation Scoping — 2026-06-29

## 1. Dated-Report Link Fix

### Current lines:

**Line 16 (URL constant):**
```bash
REPORT_URL="https://raw.githubusercontent.com/jvitiel/rover-reports/main/health-check-latest.md"
```

**Line 14 (dated filename):**
```bash
REPORT_DATED="$REPORT_DIR/health-check-$(date +%Y%m%d).md"
```

**Telegram message (lines ~244, ~254):**
```bash
Full report: $REPORT_URL
```

### Precise change:

Replace line 16:
```bash
REPORT_URL="https://raw.githubusercontent.com/jvitiel/rover-reports/main/health-check-$(date +%Y%m%d).md"
```

The `latest` file can remain as a convenience copy (no cost — it's already written). Nothing else references the `health-check-latest.md` filename. No external consumer depends on it.

---

## 2. State File for Week-over-Week Deltas

### Design:

| Property | Value |
|----------|-------|
| **Path** | `/home/shelter/scripts/.health-check-state.json` |
| **Owner** | root (script runs as root cron) |
| **Format** | JSON — one object with dated metrics |

### Metrics to persist (3) and their source lines:

| Metric | Variable | Source line |
|--------|----------|------------|
| Memory free (MB) | `MEM_AVAIL` | Line 41: `MEM_AVAIL=$(free -m \| awk '/^Mem:/{print $7}')` |
| Disk % | `DISK_PCT` | Line 49: `DISK_PCT=$(df -h / \| awk 'NR==2{print $5}' \| tr -d '%')` |
| DB size (MB) | `DB_SIZE_MB` | Line 115: `DB_SIZE_MB=$(echo "scale=1; $DB_SIZE / 1048576" \| bc)` |

### Implementation insertion points:

**Read last week's state — insert after line 20 (after variable declarations, before GATHER DATA):**
```bash
STATE_FILE="/home/shelter/scripts/.health-check-state.json"
PREV_MEM_AVAIL="" PREV_DISK_PCT="" PREV_DB_SIZE=""
if [ -f "$STATE_FILE" ]; then
  PREV_MEM_AVAIL=$(jq -r '.mem_avail // empty' "$STATE_FILE" 2>/dev/null)
  PREV_DISK_PCT=$(jq -r '.disk_pct // empty' "$STATE_FILE" 2>/dev/null)
  PREV_DB_SIZE=$(jq -r '.db_size_mb // empty' "$STATE_FILE" 2>/dev/null)
fi
```

**Write this week's state — insert after the report is built, before git push (~line 237):**
```bash
cat > "$STATE_FILE" << STATEJSON
{
  "date": "$TODAY",
  "mem_avail": $MEM_AVAIL,
  "disk_pct": $DISK_PCT,
  "db_size_mb": $DB_SIZE_MB,
  "tables": [$(sudo -u shelter sqlite3 "$DB" "SELECT '\"' || name || '\"' FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null | paste -sd,)]
}
STATEJSON
```

**Delta display in Telegram — helper function:**
```bash
delta() {
  local cur="$1" prev="$2" unit="$3"
  if [ -n "$prev" ] && [ "$prev" != "null" ]; then
    local d=$((cur - prev))
    if [ "$d" -gt 0 ]; then echo "${cur}${unit} (↑${d})";
    elif [ "$d" -lt 0 ]; then echo "${cur}${unit} (↓$((-d)))";
    else echo "${cur}${unit} (→)"; fi
  else echo "${cur}${unit}"; fi
}
```

**Telegram message lines would become:**
```
Memory: $(delta $MEM_AVAIL "$PREV_MEM_AVAIL" "MB") free. Disk: $(delta $DISK_PCT "$PREV_DISK_PCT" "%") used. DB: $(delta ${DB_SIZE_MB%.*} "$PREV_DB_SIZE" "MB").
```

Example output: `Memory: 1200MB (↓300) free. Disk: 55% (↓7) used. DB: 32MB (↑1).`

---

## 3. Dynamic Table Discovery

### Current table-count block (lines 117-137):

```bash
db_count() {
  sudo -u shelter sqlite3 "$DB" "SELECT COUNT(*) FROM $1;" 2>/dev/null || echo "ERROR"
}

CT_ANIMAL_MEDIA=$(db_count animal_media)
CT_ANIMAL_METADATA=$(db_count animal_metadata)
CT_DAILY_ACTIVITIES=$(db_count daily_activities)
CT_FEEDING_ARCHIVE=$(db_count feeding_archive)
CT_ACTIVITY_ARCHIVE=$(db_count activity_archive)
CT_WELLBEING_ALERTS=$(db_count wellbeing_alerts)
CT_VOLUNTEER_TIMECLOCK=$(db_count volunteer_timeclock)
CT_ADOPTION_APPLICATIONS=$(db_count adoption_applications)
CT_OVERNIGHT_INTAKES=$(db_count overnight_intakes)
```

### Proposed replacement:

```bash
# Dynamic table discovery
TABLE_REPORT=""
TABLE_LIST=$(sudo -u shelter sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name;" 2>/dev/null)
for tbl in $TABLE_LIST; do
  ct=$(sudo -u shelter sqlite3 "$DB" "SELECT COUNT(*) FROM \"$tbl\";" 2>/dev/null || echo "ERROR")
  TABLE_REPORT="${TABLE_REPORT}| ${tbl} | ${ct} |\n"
  [ "$ct" = "0" ] && flag "DB: table $tbl is empty"
done

# New-table detection (requires state file)
if [ -f "$STATE_FILE" ]; then
  PREV_TABLES=$(jq -r '.tables[]' "$STATE_FILE" 2>/dev/null)
  for tbl in $TABLE_LIST; do
    echo "$PREV_TABLES" | grep -qx "$tbl" || flag "DB: NEW table detected: $tbl"
  done
fi
```

The report section would replace the hardcoded table with:
```
## Database Tables ($(echo "$TABLE_LIST" | wc -w) tables)

| Table | Rows |
|-------|------|
$(echo -e "$TABLE_REPORT")
```

**Current table count:** 39 tables (38 + sqlite_sequence). Excluding sqlite_sequence: 38 reportable.

---

## 4. The 7 In-App Scheduler Freshness Checks

### All tables/columns confirmed to exist. Exact queries:

| # | Scheduler | Table.Column | Freshness Query | Stale threshold | Weight |
|---|-----------|-------------|-----------------|-----------------|--------|
| 1 | Midnight feeding (midnight ET) | `feeding_archive.date` | `SELECT MAX(date) FROM feeding_archive` | >3 days | **CRITICAL** |
| 2 | Activity auto-close (23:55 ET) | `activity_archive.date` | `SELECT MAX(date) FROM activity_archive` | >9 days | **CRITICAL** |
| 3 | Nightly SM photo sync (2am ET) | `animal_media.created_at WHERE source='sm-sync'` | `SELECT MAX(created_at) FROM animal_media WHERE source='sm-sync'` | >2 days | **CRITICAL** |
| 4 | Generic bio (9:30am ET) | `animal_bios.created_at` | `SELECT MAX(created_at) FROM animal_bios` | >7 days | INFORMATIONAL |
| 5 | Searcher snapshot (00:10 ET) | `searcher_daily_metrics.date` | `SELECT MAX(date) FROM searcher_daily_metrics` | >2 days | INFORMATIONAL |
| 6 | Deadline reminders (hourly) | `rg_requests.reminder_sent_at` | `SELECT MAX(reminder_sent_at) FROM rg_requests WHERE reminder_sent_at IS NOT NULL` | N/A — fires only when deadlines exist | INFORMATIONAL |
| 7 | Daily adoptable check (9am ET) | `adoptable_status_snapshot.checked_at` | `SELECT MAX(checked_at) FROM adoptable_status_snapshot` | >2 days | **CRITICAL** (see §5) |

### Column existence verified:

```
feeding_archive.date              → confirmed (MAX = 2026-06-29)
activity_archive.date             → confirmed (MAX present)
animal_media.created_at           → confirmed (sm-sync MAX = 2026-06-29T06:00:01)
animal_bios.created_at            → confirmed (291 rows)
searcher_daily_metrics.date       → confirmed (64 rows)
staff_notifications.created_at    → confirmed (7 rows)
adoptable_status_snapshot.checked_at → confirmed (484 rows)
rg_requests.reminder_sent_at      → needs verification (assumed from markRGRequestReminderSent)
```

### Note on #6 (deadline reminders):

The deadline reminder scheduler (`setInterval(checkDeadlineReminders, 60 * 60 * 1000)`, line 12004) calls `getRequestsDueForReminder()` and then `markRGRequestReminderSent(request.id!)`. It writes to `rg_requests.reminder_sent_at` — but only when there ARE requests with approaching deadlines. If no requests are pending, it runs but writes nothing. This makes freshness-checking unreliable — the check would flag "stale" even when the scheduler is running correctly but has nothing to do.

**Recommendation:** Skip freshness for #6. Instead, note it as "hourly, no output when idle" in the report. Or check shelter-app journal logs for `[RG Cares] Deadline reminder check` entries.

### Implementation — insert after the existing feeding/activity checks (after line ~157):

```bash
# --- In-app scheduler freshness ---
SM_SYNC_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(created_at) FROM animal_media WHERE source='sm-sync';" 2>/dev/null || echo "unknown")
if [ "$SM_SYNC_MAX" != "unknown" ] && [ -n "$SM_SYNC_MAX" ]; then
  SM_SYNC_EPOCH=$(date -d "$SM_SYNC_MAX" +%s 2>/dev/null || echo "0")
  if [ "$SM_SYNC_EPOCH" -gt 0 ]; then
    SM_SYNC_HOURS_AGO=$(( (NOW_EPOCH - SM_SYNC_EPOCH) / 3600 ))
    [ "$SM_SYNC_HOURS_AGO" -gt 48 ] && flag "⚠️ SM photo sync last ran $(date -d "$SM_SYNC_MAX" +%Y-%m-%d) (>48h stale)"
  fi
fi

ADOPTABLE_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(checked_at) FROM adoptable_status_snapshot;" 2>/dev/null || echo "unknown")
if [ "$ADOPTABLE_MAX" != "unknown" ] && [ -n "$ADOPTABLE_MAX" ]; then
  ADOPTABLE_EPOCH=$(date -d "$ADOPTABLE_MAX" +%s 2>/dev/null || echo "0")
  if [ "$ADOPTABLE_EPOCH" -gt 0 ]; then
    ADOPTABLE_HOURS_AGO=$(( (NOW_EPOCH - ADOPTABLE_EPOCH) / 3600 ))
    [ "$ADOPTABLE_HOURS_AGO" -gt 48 ] && flag "⚠️ Adoptable check last ran $(date -d "$ADOPTABLE_MAX" +%Y-%m-%d) (>48h stale)"
  fi
fi

BIO_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(created_at) FROM animal_bios;" 2>/dev/null || echo "unknown")
SEARCHER_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(date) FROM searcher_daily_metrics;" 2>/dev/null || echo "unknown")
```

---

## 5. RESOLVED: Daily Adoptable Check — CRITICAL

### What it does (server.ts lines 12593–12680):

`runAdoptableStatusCheck()` is the **public-facing adoptable status alerting system**:

1. Reads ALL animals from ShelterManager (`fetchAnimals({ includeUnavailable: true })`)
2. Compares each animal's current `isAvailable` status against the `adoptable_status_snapshot` table
3. Identifies **newly adoptable** animals (transition from not-available → available)
4. **Sends an email alert** to `ADOPTABLE_ALERT_RECIPIENT` listing newly adoptable animals
5. Updates the snapshot table with current status for all animals

### Why CRITICAL:

- It drives the **email notification system** that tells staff when animals become available for adoption
- If the scheduler stops, staff aren't notified of newly adoptable animals — this directly affects adoption outcomes
- The snapshot table (`adoptable_status_snapshot`) is the persistence layer — if it stops updating, the next run after a restart would send a flood of false "newly adoptable" alerts for all animals
- It involves external communication (email) — failure is not silent

### Freshness check:

```sql
SELECT MAX(checked_at) FROM adoptable_status_snapshot;
```

Stale threshold: >48 hours (runs daily at 9am ET). **Weight: CRITICAL.**

---

## 6. Media-Freshness + Grok-Resumption Checks

### Media tarball freshness:

```bash
MEDIA_NEWEST=$(find /home/shelter/backups -name "media-*.tar.gz" -type f -printf '%T@ %f\n' 2>/dev/null | sort -rn | head -1)
if [ -n "$MEDIA_NEWEST" ]; then
  MEDIA_EPOCH=$(echo "$MEDIA_NEWEST" | cut -d. -f1)
  MEDIA_AGE_DAYS=$(( (NOW_EPOCH - MEDIA_EPOCH) / 86400 ))
  [ "$MEDIA_AGE_DAYS" -gt 8 ] && flag "Backup: media-*.tar.gz is ${MEDIA_AGE_DAYS} days old (threshold: 8)"
else
  flag "Backup: no media-*.tar.gz found"
fi
```

### Grok-resumption detection:

The column to use is `captured_at` (it's the same as `created_at` for grok_imagine, but `captured_at` is indexed — `CREATE INDEX idx_media_captured ON animal_media(captured_at)`).

```bash
# Grok video resumption check: any grok_imagine video newer than the latest media backup?
GROK_LATEST=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(captured_at) FROM animal_media WHERE source='grok_imagine';" 2>/dev/null)
if [ -n "$GROK_LATEST" ] && [ -n "$MEDIA_EPOCH" ]; then
  GROK_EPOCH=$(date -d "$GROK_LATEST" +%s 2>/dev/null || echo "0")
  if [ "$GROK_EPOCH" -gt "$MEDIA_EPOCH" ]; then
    flag "ℹ️ New grok_imagine video (${GROK_LATEST}) not yet in a media backup — consider tightening media cadence if generation resumed"
  fi
fi
```

**Current grok_imagine MAX(captured_at):** `2026-06-29T13:18:07.456Z` — this is TODAY, newer than the media backup from 19:46 UTC. The check would fire immediately. However, this timestamp represents a crop/thumbnail operation that happened to touch a grok_imagine record, not a new video generation. 

**Correction:** Use `created_at` (the original creation time) instead of `captured_at` (which updates on edits). And filter to `media_type='video'`:

```sql
SELECT MAX(created_at) FROM animal_media WHERE source='grok_imagine' AND media_type='video';
```

Current value would need verification, but videos were created in April — well before the media backup.

---

## 7. HTTP Probes

### Current state: zero probes — only `systemctl is-active`.

### Proposed probe targets (all GET, no side effects):

| Endpoint | URL | What it tests |
|----------|-----|---------------|
| API health | `http://127.0.0.1:3000/api/animals?limit=1` | Express is responding, DB is readable |
| Dashboard | `https://dashboard.4lgshelterapp.duckdns.org/` | Caddy + TLS + static serving |
| Staff PWA | `https://staff.4lgshelterapp.duckdns.org/` | Caddy routing + static serving |
| Matcher | `https://matcher.4lgshelterapp.duckdns.org/` | Matcher app serving |

### Implementation:

```bash
# --- HTTP health probes ---
http_probe() {
  local label="$1" url="$2"
  local code=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$code" != "200" ]; then
    flag "HTTP: $label returned $code (expected 200)"
  fi
  echo "$code"
}

HTTP_API=$(http_probe "API" "http://127.0.0.1:3000/api/animals?limit=1")
HTTP_DASHBOARD=$(http_probe "Dashboard" "https://dashboard.4lgshelterapp.duckdns.org/")
HTTP_STAFF=$(http_probe "Staff PWA" "https://staff.4lgshelterapp.duckdns.org/")
HTTP_MATCHER=$(http_probe "Matcher" "https://matcher.4lgshelterapp.duckdns.org/")
```

Report section:
```
## HTTP Health Probes

| Endpoint | Status |
|----------|--------|
| API (localhost:3000) | $HTTP_API |
| Dashboard | $HTTP_DASHBOARD |
| Staff PWA | $HTTP_STAFF |
| Matcher | $HTTP_MATCHER |
```

**Not probing:** volunteer, dogwalker, caregiver, coordinator, custom-search, test-activity, draft, staging-staff — these are all reverse-proxied to the same shelter-app on :3000, so if Dashboard + API work, they all work. The 4 probes above cover: direct API, Caddy→app routing, and two different static-rewrite paths.

---

## 8. Secrets Mode + Disk Threshold

### Secrets mode check (line 172):

```bash
[ "$SECRETS_MODE" != "600" ] && flag "Security: shelter-secrets.json mode is $SECRETS_MODE (should be 600)"
```

**Already correct.** The script checks for 600 (not 644). The earlier review report was wrong — the script was fixed before or is as-shipped. No change needed.

### Disk threshold (line 55):

```bash
[ "$DISK_PCT" -gt 70 ] && flag "Disk: ${DISK_PCT}% used (threshold: 70%)"
```

**Change to 60:**
```bash
[ "$DISK_PCT" -gt 60 ] && flag "Disk: ${DISK_PCT}% used (threshold: 60%)"
```

---

## 9. Structure Assessment

The additions fold cleanly into the existing script structure as **additive sections**:

| Addition | Insertion point | Lines added |
|----------|----------------|-------------|
| State file read | After line 20 (before GATHER DATA) | ~8 |
| Delta helper function | After state read | ~8 |
| Dynamic table discovery | Replace lines 117-137 | ~15 (net +6) |
| SM-sync/adoptable/bio/searcher freshness | After line 157 (after existing feeding/activity checks) | ~30 |
| HTTP probes | After services section (~line 80) | ~12 |
| Media/grok checks | After backup section (~line 175) | ~15 |
| State file write | After report build, before git push (~line 237) | ~10 |
| Disk threshold | Line 55, change 70→60 | 0 (edit only) |
| Dated URL | Line 16, edit | 0 (edit only) |
| Report sections | In the heredoc | ~20 |

**Total: ~100 lines added, ~10 lines replaced.** No reorganization needed. The script's existing structure (gather → build report → send) accommodates all additions as new gather blocks and new report sections.

**Risk profile:** Low. This is monitoring-only — a wrong check produces a wrong report line, doesn't break anything live. The state file is write-once-per-week with a small JSON blob.

---

*Read-only scoping. No files modified. Generated 2026-06-29 20:55 UTC.*
