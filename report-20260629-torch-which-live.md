# Torch Deduplication — Which Install Is Live? — 2026-06-29

## 1. How the Worker Is Invoked

Both crop invocation paths use an absolute venv interpreter:

**cropSweep.ts line 25:**
```typescript
const CROP_PYTHON = '/opt/crop-venv/bin/python3';
```

**server.ts line 4018 (manual crop endpoint):**
```typescript
const CROP_PYTHON = '/opt/crop-venv/bin/python3';
```

Both call `execFileAsync(CROP_PYTHON, ...)` — the interpreter is hardcoded as `/opt/crop-venv/bin/python3`. No bare `python3`, no PATH resolution.

## 2. The Decisive Runtime Test

```bash
$ /opt/crop-venv/bin/python3 -c "import torch; print(torch.__file__)"
/opt/crop-venv/lib/python3.12/site-packages/torch/__init__.py

$ sudo -u shelter /opt/crop-venv/bin/python3 -c "import torch; print(torch.__file__)"
/opt/crop-venv/lib/python3.12/site-packages/torch/__init__.py
```

**THE LIVE TORCH is in /opt/crop-venv/.** Both as root and as the shelter user (matching runtime context), the worker's interpreter loads torch from the venv. The `/home/rover/.local/` torch is never touched by the crop pipeline.

## 3. Is the Rover .local Torch Used by Anything?

| Check | Result |
|-------|--------|
| Python scripts in /home/rover/scripts/, /home/rover/rover/ | None import torch |
| Rover crontab Python entries | One: `score-profiles.py` — runs as `shelter` user (not rover), does NOT import torch |
| Running Python processes under rover | None |
| OC/openclaw torch dependency | None — OC is Node.js, not Python |
| Any other script/service importing from rover's .local | None found |

**Rover's .local torch is the original failed installation** from the Jun 22 crop setup. The session history confirms: torch + ultralytics were first `pip install`'d as the rover user, discovered to be invisible to the shelter-user-running shelter-app, then a shared venv at `/opt/crop-venv/` was created as the fix. The rover .local copy was never cleaned up.

```bash
$ python3 -c "import torch; print(torch.__file__)"   # (as rover)
/home/rover/.local/lib/python3.12/site-packages/torch/__init__.py
```

This only activates when rover's own Python runs — which nothing does for ML purposes.

## 4. Sizes

| Install | Size | Status |
|---------|------|--------|
| /opt/crop-venv/ | **5.4 GB** | ✅ LIVE — used by crop worker |
| /home/rover/.local/lib/python3.12/site-packages/ | **5.3 GB** | ❌ UNUSED — deletable leftover |

Breakdown of rover's .local ML packages:
| Package | Size |
|---------|------|
| nvidia* (CUDA libs) | 2.7 GB |
| torch/ | 1.2 GB |
| triton/ | 691 MB |
| ultralytics/ | 9 MB |
| Other packages | ~700 MB |

**Note:** The entire 5.3 GB site-packages directory may contain non-ML packages too. A targeted removal of just the ML stack (torch, triton, nvidia*, ultralytics + their deps) would reclaim ~4.6 GB. Removing the entire .local/lib directory would reclaim 5.3 GB but could remove non-ML packages rover uses for other purposes.

## 5. Verdict

| Question | Answer |
|----------|--------|
| **(a) Which torch is LIVE?** | `/opt/crop-venv/lib/python3.12/site-packages/torch/` — loaded by `/opt/crop-venv/bin/python3` |
| **(b) Which is the deletable leftover?** | `/home/rover/.local/lib/python3.12/site-packages/torch/` (and nvidia*, triton, ultralytics) |
| **(c) Is the leftover confirmed unused?** | ✅ Yes — no rover process, script, cron, or service imports torch from rover's .local |
| **(d) How much does removal reclaim?** | **~4.6 GB** (ML packages only) or **~5.3 GB** (entire site-packages) |
| **(e) Cleanest removal method** | Targeted pip uninstall as rover (preserves non-ML packages) |

### Recommended removal commands (do NOT execute):

```bash
# Targeted: remove only the ML stack (preserves other rover pip packages)
pip uninstall -y torch torchvision torchaudio triton ultralytics
# nvidia packages (many individual packages):
pip freeze | grep nvidia | xargs pip uninstall -y

# Verify torch is gone from rover's Python:
python3 -c "import torch" 2>&1  # should fail with ModuleNotFoundError
```

### Post-removal confirmation step:

After removing rover's .local torch, trigger one crop to confirm the live pipeline still works:
```bash
sudo -u shelter /opt/crop-venv/bin/python3 -c "import torch; print('torch OK:', torch.__file__)"
# Then trigger a test crop via the API or wait for the next SM sync crop sweep
```

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 14:38 UTC.*
