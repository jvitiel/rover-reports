# Python Environment Diagnosis: crop-worker.py Unreachable by Shelter User

**Date:** 2026-06-22 13:20 UTC  
**Mode:** Read-only diagnosis — no writes, no installs

---

## 1. How the Service Runs

**systemd unit:** `/etc/systemd/system/shelter-app.service`

```ini
[Unit]
Description=Shelter App Server
After=network.target

[Service]
Type=simple
User=shelter
WorkingDirectory=/home/shelter/shelter-apps/server
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Confirmed:** runs as `User=shelter`. No custom PATH, no venv activation, no PYTHONPATH. Only env var is `NODE_ENV=production`. The node process inherits shelter's default login environment.

## 2. How the Sweep Invokes the Worker

**cropSweep.ts:102-110:**

```typescript
const stdout = execSync(
  `python3 ${CROP_WORKER} --ids ${row.id}`,
  {
    cwd: path.resolve(__dirname, '..', '..'),
    timeout: 30_000,
    encoding: 'utf-8',
    // Suppress stderr (YOLO model loading chatter)
    stdio: ['pipe', 'pipe', 'pipe'],
  }
);
```

Where `CROP_WORKER` is defined at **cropSweep.ts:22:**
```typescript
const CROP_WORKER = path.join(ROOT_DIR, 'scripts', 'crop-worker.py');
```

Resolves to: `/home/shelter/shelter-apps/scripts/crop-worker.py`

**Invocation:** Bare `python3` (no absolute path), resolved via PATH to `/usr/bin/python3`. The `cwd` is `/home/shelter/shelter-apps` (ROOT_DIR). No custom environment variables — the `execSync` call inherits the node process environment, which is the shelter user's default + `NODE_ENV=production`.

## 3. Where the Deps Are

**Rover's user-local site-packages** (`/home/rover/.local/lib/python3.12/site-packages/`):

```
$ pip show ultralytics
Location: /home/rover/.local/lib/python3.12/site-packages
Version: 8.4.72

$ pip show torch
Location: /home/rover/.local/lib/python3.12/site-packages
Version: 2.12.1
```

**System site-packages:** Neither `ultralytics` nor `torch` present:
```
$ ls /usr/lib/python3/dist-packages/torch → No such file or directory
$ ls /usr/local/lib/python3.12/dist-packages/torch → No such file or directory
```

**No shared venv exists** anywhere on the system — no `/opt/` venvs, no project-level venvs.

**Python version:** `/usr/bin/python3` → Python 3.12.3 (same for both users).

## 4. What Shelter Can See

**Shelter's user-site:** `/home/shelter/.local/lib/python3.12/site-packages/` — directory does not exist.

**Can shelter read rover's site-packages?** Yes — world-readable:
```
$ ls -la /home/rover/.local/lib/python3.12/site-packages/ | head -3
drwxr-xr-x 73 rover rover 4096 Jun 21 00:05 .
```

**PYTHONPATH injection test — WORKS:**
```
$ sudo -u shelter PYTHONPATH=/home/rover/.local/lib/python3.12/site-packages \
    python3 -c "from ultralytics import YOLO; print('OK')"
OK
```

This proves shelter can import the packages if pointed to rover's directory. The files are readable.

**Without PYTHONPATH — fails:**
```
$ sudo -u shelter python3 -c "from ultralytics import YOLO"
ModuleNotFoundError: No module named 'ultralytics'
```

**Non-YOLO deps:** All other crop-worker.py dependencies (`requests`, `Pillow`, `json`, `sqlite3`, etc.) are available system-wide. Only `ultralytics` (+ `torch` as its dependency) are missing for the shelter user.

## 5. Disk Space

```
$ df -h /
Filesystem  Size  Used  Avail  Use%  Mounted on
/dev/sda     79G   35G    41G   46%  /
```

**41G free.** Rover's full user-site is 5.3G (torch=1.2G, ultralytics=9M, rest are transitive deps like torchvision, numpy, scipy, etc.). A fresh targeted install of `ultralytics` (which pulls torch) would cost approximately 2-3G.

## 6. Fix Options

### Option A: Shared venv at `/opt/crop-venv` (RECOMMENDED)

Create a dedicated venv owned by root, readable by all, with `ultralytics` installed:

```bash
sudo python3 -m venv /opt/crop-venv
sudo /opt/crop-venv/bin/pip install ultralytics
sudo chmod -R o+rX /opt/crop-venv
```

Then change `cropSweep.ts:102-103` from:
```typescript
`python3 ${CROP_WORKER} --ids ${row.id}`,
```
to:
```typescript
`/opt/crop-venv/bin/python3 ${CROP_WORKER} --ids ${row.id}`,
```

**Tradeoffs:**
- ✅ Most explicit — absolute interpreter path, no PATH or env ambiguity
- ✅ Works for shelter user (and any other user) without modifying their environments
- ✅ Isolated from rover's personal packages — no breakage if rover upgrades/removes
- ✅ Clean single-purpose venv for the crop pipeline
- ⚠️ Disk cost: ~2-3G for a fresh install (41G free, so fine)
- ⚠️ One line change in cropSweep.ts, plus the constant definition for the interpreter path
- ⚠️ The venv needs Pillow and requests too — but they're in system site-packages, so `--system-site-packages` flag on venv creation lets it inherit those

**Crop file ownership:** The crop worker writes files to `data/animal-media/crops/` which is owned by `shelter:shelter` with group-sticky (`drwxrwsr-x`). Since the service runs as shelter, crop files are created as `shelter:shelter` — no interaction with the venv path.

### Option B: System-wide pip install

```bash
sudo pip3 install ultralytics
```

**Tradeoffs:**
- ✅ Simplest to execute — one command
- ⚠️ Pollutes system Python with 2-3G of ML packages
- ⚠️ Risk of conflicts with system packages (apt-managed numpy, etc.)
- ⚠️ Ubuntu 24.04 blocks `sudo pip install` by default (PEP 668 externally-managed) — requires `--break-system-packages` flag
- ⚠️ System upgrades could clobber or conflict

### Option C: PYTHONPATH in the execSync environment

Change the `execSync` call to inject `PYTHONPATH`:

```typescript
execSync(`python3 ${CROP_WORKER} --ids ${row.id}`, {
  cwd: ROOT_DIR,
  timeout: 30_000,
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PYTHONPATH: '/home/rover/.local/lib/python3.12/site-packages' },
});
```

**Tradeoffs:**
- ✅ Zero disk cost — reuses existing packages
- ✅ Proven to work (tested above)
- ⚠️ Couples the shelter service to rover's personal Python environment
- ⚠️ If rover upgrades/removes ultralytics, the service breaks silently
- ⚠️ Cross-user dependency is invisible — no one will remember this in 6 months

### Option D: Loosen perms on rover's ~/.local + add to shelter's PYTHONPATH

Not recommended. Same fragility as Option C, plus modifying user directory permissions.

---

## Recommendation: Option A (shared venv)

The absolute interpreter path (`/opt/crop-venv/bin/python3`) eliminates all PATH/env ambiguity. The venv is purpose-built, owned by root, readable by all. Disk cost (~2-3G) is well within the 41G free. One constant change in cropSweep.ts. The service user needs no environment modifications.

Optionally use `--system-site-packages` to inherit system Pillow/requests rather than reinstalling them in the venv (saves ~100MB).
