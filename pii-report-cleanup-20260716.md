# PII Cleanup — Public Reports Repo

Date: 2026-07-17 01:51 UTC

---

## Clone Confirmation

| Item | Value |
|------|-------|
| Clone path | `/home/rover/rover-reports-repo` |
| Remote | `origin https://github.com/jvitiel/rover-reports.git` |
| Branch | `main` |
| Pre-operation status | Clean (`nothing to commit, working tree clean`) |

[VERIFIED — `git remote -v`, `git branch --show-current`, `git status` output]

---

## Commit Contents

`git show --stat HEAD` output:

```
commit b008d3d9093c47d3565caf5231f1e699458b3e95

 adoption-notify-recipients-diag-20260702.md        |  67 ----
 report-20260528-205000-es-subscribe-error-diag.md  |  84 -----
 report-20260626-volunteer-dupe-candidates.md       | 137 --------
 report-20260630-featured-email-build.md            |  95 -----
 report-20260630-featured-six-build-scope.md        | 360 -------------------
 report-20260701-wp-security-diag.md                |   6 +-
 report-20260712-001000-volunteer-age-submission.md | 120 -------
 ...-20260712-042400-volunteer-age-fix-diagnosis.md | 388 ---------------------
 ...rt-20260712-043700-volunteer-age-app-js-hold.md |  69 ----
 report-20260712-050000-volunteer-age-fix-build.md  | 234 -------------
 report-20260712-051500-volunteer-age-editable.md   | 109 ------
 ...rt-20260713-130300-adoptable-email-recipient.md | 154 --------
 ...t-20260713-131200-adoptable-email-add-martha.md | 129 -------
 report-20260715-161400-featured-six-unknown.md     | 195 -----------
 14 files changed, 3 insertions(+), 2144 deletions(-)
```

**14 files touched: 13 deleted, 1 modified.** [VERIFIED — `git show --stat HEAD`]

---

## Deletions — Gone from Working Tree and Remote

All 13 files confirmed absent from working tree. [VERIFIED — `test -f` returned false for all 13]

Remote spot check (3 of 13 raw URLs):

| File | HTTP status |
|------|------------|
| adoption-notify-recipients-diag-20260702.md | 404 |
| report-20260626-volunteer-dupe-candidates.md | 404 |
| report-20260712-001000-volunteer-age-submission.md | 404 |

[VERIFIED — `curl -s -o /dev/null -w '%{http_code}'` output]

---

## Redacted File

`report-20260701-wp-security-diag.md` — exists in working tree. [VERIFIED — `ls -la`]

| Metric | Pre-redaction | Post-redaction |
|--------|--------------|----------------|
| Line count | 142 | 142 |
| `[REDACTED]` occurrences | 0 | 3 |

Lines containing `@` patterns post-redaction: **3**. These are the site owner's administrator account (appears on 2 lines) and the dashboard service account (1 line). Zero third-party email addresses remain. [VERIFIED — `grep -n '@'` output; all remaining @ lines are the admin user_login/user_email and the service account, not third-party PII]

---

## No Force-Push / No History Rewrite

`git reflog -5`:
```
b008d3d HEAD@{0}: commit: Remove third-party PII from public reports...
39b6962 HEAD@{1}: commit: Report: WP REST enum fix post-deploy gap closure
55714d4 HEAD@{2}: commit: Report: WP REST user-enumeration fix deploy...
9116f2f HEAD@{3}: commit: Report: WP application-passwords enumeration probe...
10e0b42 HEAD@{4}: commit: Report: WordPress REST user-enum preflight diagnosis
```

All entries are ordinary `commit` operations. No `reset`, no `rebase`, no `push --force`, no `filter-branch`. Push was fast-forward: `39b6962..b008d3d main -> main`. [VERIFIED — `git reflog -5` and push output]

History still contains the deleted files in prior commits. This is the ruled, accepted tradeoff — no attempt to change it.

---

## Clone In Sync

```
$ git status
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Local HEAD and `origin/main` both point to `b008d3d`. No divergence. Next report push will work. [VERIFIED — `git status`, `git log --oneline -1 origin/main` and `git log --oneline -1 HEAD` both show `b008d3d`]
