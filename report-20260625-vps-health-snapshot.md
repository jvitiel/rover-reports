# VPS Health Snapshot — 2026-06-26 04:43 UTC

## 1. Load & Uptime

```
04:43:18 up 102 days, 7:56,  load average: 0.04, 0.05, 0.01
CPU cores: 2
```

Load averages are near zero — **no CPU saturation**. 1-min load (0.04) is well under core count (2). The system is CPU-idle right now.

## 2. CPU — Top Processes

| PID | User | %CPU | %MEM | Elapsed | Command |
|-----|------|------|------|---------|---------|
| 75334 | shelter | 3.4 | 0.9 | 00:04 | crop-worker.py (photo ID cee36558…) |
| 4183251 | rover | 0.9 | 13.3 | 5d 01:58 | openclaw (Rover agent) |
| 75002 | shelter | 0.2 | 5.3 | 41:16 | node dist/server.js (shelter-app) |
| 725 | caddy | 0.0 | 0.9 | 102d | caddy |

**No process pegging a core.** The crop-worker just started (4s old at snapshot). Rover OC has been running for 5 days.

## 3. Memory

```
              total    used    free    shared  buff/cache  available
Mem:          3.8Gi   1.1Gi   1.0Gi   176Ki      2.0Gi      2.7Gi
Swap:         511Mi   240Mi   271Mi
```

**Swap is 47% used (240MB of 511MB).** Available memory (2.7GB) looks adequate at first glance, but the swap usage tells a different story — the kernel has been paging out.

### Top memory consumers:

| PID | User | %MEM | RSS (MB) | VmSwap (MB) | Total Working Set | Command |
|-----|------|------|----------|-------------|-------------------|---------|
| 4183251 | rover | 13.3 | 530 | **204** | **734** | openclaw (Rover) |
| 75002 | shelter | 5.3 | 208 | 0 | 208 | shelter-app (node) |
| 4007187 | root | 2.4 | 96 | — | — | systemd-journald |
| 725 | caddy | 0.9 | 38 | — | — | caddy |

**⚠️ The Rover/OC process has 204MB swapped out** — that's 85% of all swap usage on the box. Its total working set (RSS 530MB + swap 204MB = 734MB) consumes ~19% of total physical RAM. On a 3.8GB box this is significant.

shelter-app's systemd cgroup reports **Memory: 850.8M (peak: 1.2G)** — this includes child processes (the crop-worker). Peak 1.2GB is 31% of physical RAM. Combined with Rover (734MB) and journald (96MB), total committed memory approaches the physical limit, driving swap activity.

## 4. Disk

```
Filesystem      Size  Used Avail Use%  Mounted on
/dev/sda         79G   44G   31G  59%  /
```

**59% — healthy.** No filesystem near the 85% threshold.

| Path | Size |
|------|------|
| /home/shelter/shelter-apps/data/ | 460MB |
| /home/shelter/backups/ | 12GB |
| /home/shelter/rover-reports/ | 103MB |
| /home/rover/rover-reports-repo/ | 175MB |
| journald archives | 2.7GB |

Backups (12GB) are the largest consumer after the OS itself. Not alarming at 59% disk usage. No files over 50MB found in /var/log.

## 5. Shelter-App Process Health

```
● shelter-app.service — active (running) since 04:02:01 UTC (41 min ago)
  Main PID: 75002 (node) — 0.2% CPU, 208MB RSS, 0 swap
  Memory (cgroup): 850.8M (peak: 1.2G)
  Child: crop-worker.py (PID 75334) — processing crop for photo cee36558…
```

The service was restarted 41 minutes ago (04:02 UTC) — this was the `systemctl restart` from the featured-rotation build in this session. **No crashes or OOM in the last 2 hours.** No SIGKILL/SIGTERM beyond the intentional restart.

### Errors found:
- **Google Sheets grid limit exceeded** at 03:55: `Cat Activity` sheet hit 1000-row limit, blocking row append. This error came from the prior PID (74703, before restart). Not crash-causing but worth fixing.

## 6. DB Size & Lock Signs

| File | Size |
|------|------|
| shelter.db | 30MB |
| shelter.db-wal | 4.2MB |
| shelter.db-shm | 32KB |

WAL at 4.2MB is active but normal — no sign of a stuck transaction or checkpoint blockage.

## 7. OC/Agent Footprint

| Metric | Value |
|--------|-------|
| PID | 4183251 |
| Uptime | 5 days, 1 hour, 58 minutes |
| VmSize | 53.5 GB (virtual, normal for V8) |
| RSS | 530 MB |
| **VmSwap** | **204 MB** |
| %CPU | 0.9% |

**The Rover OC process is the dominant memory consumer and swap contributor.** After 5 days of operation its RSS has grown to 530MB with 204MB swapped. This is the single biggest factor in swap pressure on this 3.8GB box. There's no sign of active compaction (CPU is low at 0.9%), but the accumulated memory footprint is large.

Several zombie (`<defunct>`) child processes of the rover user are present — these are benign remnants of exec'd diagnostic commands being reaped.

## 8. Recent Scheduled Jobs / Active Work

### DogWalker cache refresh — **anomalous latency**
```
04:32:03  Cache refreshed: 36 dogs in 169ms      ← normal
04:34:06  Cache refreshed: 36 dogs in 3,251ms    ← slightly slow
04:36:03  Cache refreshed: 36 dogs in 326ms      ← normal
04:41:30  Cache refreshed: 36 dogs in 180,701ms  ← ⚠️ 3 MINUTES
04:41:30  Cache refreshed: 36 dogs in 60,633ms   ← ⚠️ 1 MINUTE
```

At 04:41:30 two DogWalker cache refreshes completed after **3 minutes** and **1 minute** respectively. Normal baseline is 150ms–350ms. This is a **1000x slowdown** coinciding with the reported sluggishness window. The refresh involves calling ShelterManager API + Google Sheets — both I/O-bound. A 3-minute hang on a normally-instant operation is classic swap-thrash behavior: when the node process's pages are evicted, every function call incurs disk I/O to page them back in.

### Crop worker
A crop-worker.py child process is currently running (PID 75334), spawned by shelter-app to process a manual crop submitted at 04:37:48. At 3.4% CPU and 37MB RSS it's not individually heavy, but it adds to the shelter-app cgroup's 850MB total (peak 1.2GB).

### Repeating API calls — possible client retry loop
```
POST /api/photos/728/add-to-strip  — 8 calls every ~30s from 04:38 to 04:41
PUT /api/photos/728/reorder        — 3 calls every ~30s from 04:42 to 04:43
```

These are from John's dashboard browser session (Brave, Windows, IP 24.189.251.114). The exact 30-second cadence suggests a client-side retry/polling loop — possibly the dashboard retrying a request that timed out during the sluggish window, or a JS `setInterval` that fires even after an earlier attempt is still pending. Each call triggers `[ShelterManager] Returning 495 cached animals` — not expensive individually, but in the sluggish window they pile up.

### Page load burst at 04:41:29
A full dashboard reload occurred at 04:41:29 (favicon, behavior-notes, featured-slots, multiple bio fetches, multiple library-photo fetches). This coincides with 6× back-to-back `[ShelterManager] Returning 495 cached animals` calls in the same second — the dashboard's multiple API endpoints all hitting the same cache simultaneously.

## 9. Caddy

```
PID 725 — 0.0% CPU, 38MB RSS, uptime 102 days
```

Caddy itself is healthy. One error in the last 30 minutes:

```
04:43:13 — 502 on PUT /api/photos/728/reorder
  "read tcp 127.0.0.1:40796->127.0.0.1:3000: read: connection reset by peer"
  Duration: 21.6 seconds
```

The shelter-app node process reset the connection after a **21.6-second** hang on a simple reorder PUT. This confirms the backend was unresponsive during that window — consistent with swap-thrash or event-loop blocking.

---

## Diagnosis Summary

### Primary cause: **Memory pressure / swap thrash on a 3.8GB box**

The VPS has 3.8GB RAM. Active memory consumers:
- Rover/OC: 734MB (530 RSS + 204 swap) — **85% of all swap usage**
- shelter-app cgroup: 850MB (peak 1.2GB) — includes crop-worker
- journald: 96MB
- System/kernel: ~200MB

Total committed: ~1.8–2.0GB active + 2.0GB buff/cache. The kernel is keeping 2.7GB "available" by aggressively swapping out the OC process (204MB to swap), but when any operation needs those pages back (e.g., a new API request hits a rarely-accessed code path), it must page from disk — causing multi-second stalls.

The smoking gun: DogWalker cache refresh went from 169ms → 180,701ms (1000x slowdown) at the same time Caddy logged a 21.6-second backend hang. This is the pattern of **swap thrash under memory pressure**, not CPU overload (load average 0.04) or I/O saturation from disk.

### Contributing factors:
1. **Rover/OC 5-day runtime** — 530MB RSS with 204MB swapped. A periodic restart or memory-limit guard would reduce swap pressure.
2. **Crop-worker child** spawning adds transient memory pressure (37MB + Python runtime) during the same window.
3. **Client retry loop** — POST /api/photos/728/add-to-strip firing every 30 seconds adds requests during the already-degraded window.
4. **Google Sheets Cat Activity sheet full** (1000 rows) — not related to the sluggishness but will cause errors on cat activity logging until expanded.

### Not the cause:
- CPU is idle (load 0.04 on 2 cores)
- Disk is 59% — plenty of space
- DB WAL is 4.2MB — no stuck transactions
- No crashes/OOMs in the logs
- Caddy is fine (502 is a symptom of backend hang, not caddy's fault)
