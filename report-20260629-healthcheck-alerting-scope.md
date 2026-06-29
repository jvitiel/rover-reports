# Health-Check Alerting Redesign — Scoping — 2026-06-29

## Part 1 — Three Query Fixes

### Fix 1: Activity staleness — wrong table + wrong threshold

**Current (line 193, 207):**
```bash
ACTIVITY_MAX_DATE=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(date) FROM activity_archive;" 2>/dev/null || echo "unknown")
...
[ "$ACTIVITY_DAYS_STALE" -gt 9 ] && flag "⚠️ Activity archive last ran ${ACTIVITY_MAX_DATE} (>9 days stale)"
```

**Problem:** `activity_archive` has a built-in 7-day lag (`archiveActivitiesOlderThan(7)`). The archive is always ~7-8 days old. Threshold >9 means the scheduler must be dead 2+ days before alerting. And the label/variable names say "archive" which is confusing.

**Corrected:**
```bash
ACTIVITY_MAX_DATE=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(date) FROM daily_activities;" 2>/dev/null || echo "unknown")
...
[ "$ACTIVITY_DAYS_STALE" -gt 2 ] && flag "⚠️ Activity auto-close last ran ${ACTIVITY_MAX_DATE} (>2 days stale) — CRITICAL"
```

**Confirmed:** `daily_activities` has a `date` column (PRAGMA verified). `MAX(date)` returns `2026-06-29` (today ✅).

Also update the Scheduler Freshness report section: rename from "Activity archive (23:55 ET)" to "Activity auto-close (23:55 ET)".

### Fix 2: animal_bios — wrong column name

**Current (line 236):**
```bash
BIO_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(created_at) FROM animal_bios;" 2>/dev/null || echo "unknown")
```

**Corrected:**
```bash
BIO_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(generated_at) FROM animal_bios;" 2>/dev/null || echo "unknown")
```

**Confirmed:** `generated_at` is the correct column (PRAGMA verified). Returns `2026-06-29T13:30:00.026Z` (today ✅).

### Fix 3: searcher_daily_metrics — wrong column name

**Current (line 247):**
```bash
SEARCHER_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(date) FROM searcher_daily_metrics;" 2>/dev/null || echo "unknown")
```

**Corrected:**
```bash
SEARCHER_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(snapshot_date) FROM searcher_daily_metrics;" 2>/dev/null || echo "unknown")
```

**Confirmed:** `snapshot_date` is the correct column (PRAGMA verified, PK). Returns `2026-06-28` (yesterday ✅ — runs daily at 00:10 ET).

---

## Part 2 — Telegram Message Redesign

### Current message construction (lines 534–546)

```bash
if [ "$FLAG_COUNT" -eq 0 ]; then
  TG_MSG="🟢 Weekly health check — all clear.
Uptime: $UPTIME. Memory: $(delta $MEM_AVAIL "$PREV_MEM_AVAIL" "MB") free. Disk: $(delta $DISK_PCT "$PREV_DISK_PCT" "%") used. DB: $(delta ${DB_SIZE_MB%.*} "$PREV_DB_SIZE" "MB"). ${TABLE_COUNT} tables. HTTP: ${HTTP_API}/${HTTP_DASHBOARD}/${HTTP_STAFF}/${HTTP_MATCHER}. Backups current.
Full report: $REPORT_URL"
else
  TG_MSG="🟡 Weekly health check — $FLAG_COUNT flag(s).
"
  for f in "${FLAGS[@]}"; do
    TG_MSG="${TG_MSG}• ${f}
"
  done
  TG_MSG="${TG_MSG}
Full report: $REPORT_URL"
fi
```

### Problems with current design

1. **All-clear message is a dense wall of text** — vitals crammed into one line, hard to scan.
2. **Flags-fired message has no severity separation** — a critical scheduler death and an informational empty table appear identically as bullet points.
3. **All-clear message drops key information** — scheduler freshness, backup ages, and security checks aren't surfaced even as confirmation.
4. **Flags-fired message loses the vitals** — when flags fire, the memory/disk/DB deltas disappear entirely from the message.

### Proposed redesign

**Principle:** A person reading ONLY the Telegram message should see (a) everything needing attention, severity-ranked, and (b) key vitals at a glance. The report is the detailed backup, not the primary signal.

**Implementation approach:** Split the flag() calls into two accumulators instead of one:

```bash
FLAGS_CRITICAL=()
FLAGS_INFO=()
flag_critical() { FLAGS_CRITICAL+=("$1"); }
flag_info() { FLAGS_INFO+=("$1"); }
```

Then change each `flag` call site:
- `flag "⚠️ ..."` → `flag_critical "..."` (services, HTTP probes, critical schedulers, disk, security regressions)
- `flag "ℹ️ ..."` → `flag_info "..."` (empty tables, informational schedulers, grok resumption, media backup age)

The old `flag()` function stays as a thin wrapper for any un-categorized flags, defaulting to critical.

**Message body structure:**

```bash
CRIT_COUNT=${#FLAGS_CRITICAL[@]}
INFO_COUNT=${#FLAGS_INFO[@]}
TOTAL_FLAGS=$((CRIT_COUNT + INFO_COUNT))

# Line 1: verdict
if [ "$CRIT_COUNT" -gt 0 ]; then
  VERDICT="🔴 Weekly health check — ${CRIT_COUNT} critical"
elif [ "$INFO_COUNT" -gt 0 ]; then
  VERDICT="🟡 Weekly health check — ${INFO_COUNT} note(s)"
else
  VERDICT="🟢 Weekly health check — all clear"
fi

# Build message
TG_MSG="$VERDICT

📊 Vitals
Disk: $(delta $DISK_PCT "$PREV_DISK_PCT" "%") used (${DISK_AVAIL} free)
Memory: $(delta $MEM_AVAIL "$PREV_MEM_AVAIL" "MB") free
DB: $(delta ${DB_SIZE_MB%.*} "$PREV_DB_SIZE" "MB") (${TABLE_COUNT} tables)
HTTP: API ${HTTP_API} | Dash ${HTTP_DASHBOARD} | Staff ${HTTP_STAFF} | Matcher ${HTTP_MATCHER}
Services: shelter-app ${SVC_SHELTER} | caddy ${SVC_CADDY} | rover ${SVC_ROVER}"

# Critical flags block (if any)
if [ "$CRIT_COUNT" -gt 0 ]; then
  TG_MSG="${TG_MSG}

⚠️ Critical (${CRIT_COUNT})
"
  for f in "${FLAGS_CRITICAL[@]}"; do
    TG_MSG="${TG_MSG}• ${f}
"
  done
fi

# Informational flags block (if any)
if [ "$INFO_COUNT" -gt 0 ]; then
  TG_MSG="${TG_MSG}

ℹ️ Notes (${INFO_COUNT})
"
  for f in "${FLAGS_INFO[@]}"; do
    TG_MSG="${TG_MSG}• ${f}
"
  done
fi

# Scheduler summary line (always present)
TG_MSG="${TG_MSG}

🕐 Schedulers: feeding ${FEEDING_DAYS_STALE:-?}d | activity ${ACTIVITY_DAYS_STALE:-?}d | SM-sync ${SM_SYNC_HOURS_AGO}h | adoptable ${ADOPTABLE_HOURS_AGO}h
📦 Backups: sqlite ${SQLITE_NEWEST} | data ${DATA_NEWEST} | weekly ${WEEKLY_NEWEST} | media ${MEDIA_NEWEST_FILE}

Full report: $REPORT_URL"
```

### Example messages

**Scenario A — Critical flag (SM-sync dead):**

```
🔴 Weekly health check — 1 critical

📊 Vitals
Disk: 55% (↓7) used (35G free)
Memory: 1200MB (↓300) free
DB: 32MB (→) (38 tables)
HTTP: API 200 | Dash 200 | Staff 200 | Matcher 200
Services: shelter-app active | caddy active | rover active

⚠️ Critical (1)
• SM photo sync last ran 2026-06-26 (>48h stale) — CRITICAL

🕐 Schedulers: feeding 0d | activity 0d | SM-sync 72h | adoptable 5h
📦 Backups: sqlite shelter-20260629.db | data data-20260629.tar.gz | weekly weekly-20260629.tar.gz | media media-20260629.tar.gz

Full report: https://raw.githubusercontent.com/jvitiel/rover-reports/main/health-check-20260629.md
```

**Scenario B — All clear:**

```
🟢 Weekly health check — all clear

📊 Vitals
Disk: 55% (↓7) used (35G free)
Memory: 1200MB (↓300) free
DB: 32MB (→) (38 tables)
HTTP: API 200 | Dash 200 | Staff 200 | Matcher 200
Services: shelter-app active | caddy active | rover active

🕐 Schedulers: feeding 0d | activity 0d | SM-sync 14h | adoptable 5h
📦 Backups: sqlite shelter-20260629.db | data data-20260629.tar.gz | weekly weekly-20260629.tar.gz | media media-20260629.tar.gz

Full report: https://raw.githubusercontent.com/jvitiel/rover-reports/main/health-check-20260629.md
```

**Scenario C — Info-only (empty table, no critical):**

```
🟡 Weekly health check — 2 note(s)

📊 Vitals
Disk: 55% (↓7) used (35G free)
Memory: 1200MB (↓300) free
DB: 32MB (→) (38 tables)
HTTP: API 200 | Dash 200 | Staff 200 | Matcher 200
Services: shelter-app active | caddy active | rover active

ℹ️ Notes (2)
• DB: table volunteer_declines is empty
• DB: NEW table detected since last run: rg_escalations

🕐 Schedulers: feeding 0d | activity 0d | SM-sync 14h | adoptable 5h
📦 Backups: sqlite shelter-20260629.db | data data-20260629.tar.gz | weekly weekly-20260629.tar.gz | media media-20260629.tar.gz

Full report: https://raw.githubusercontent.com/jvitiel/rover-reports/main/health-check-20260629.md
```

---

## Part 3 — Implementation assessment

### What changes

| Change | Surface | Risk |
|--------|---------|------|
| 3 query column/table fixes | 3 lines | Zero — correcting wrong queries |
| Split flag→flag_critical/flag_info | ~25 call sites | Low — rename only, logic unchanged |
| Message body restructure | ~30 lines in BUILD TELEGRAM section | Low — output formatting only |
| Add scheduler/backup summary lines | ~5 new variable references in message | Low — variables already computed |

### What doesn't change

- All data gathering (same queries, same checks, same thresholds except activity >9→>2)
- Report body (full detail stays)
- Alert routing (send-alert.sh)
- Report file write / git push
- State file read/write

**Total: ~25 call-site renames (flag→flag_critical or flag_info) + ~30 lines message restructure + 3 query fixes. No new data sources. Additive/low-risk.**

---

*Read-only scoping. No files modified. Generated 2026-06-29 21:11 UTC.*
