# Intake Alert Recipients — Deactivation Log

**Date:** 2026-06-26 16:16 UTC
**Directive:** Website 4 directive, relayed via Dashboard 17

---

## STEP 0 — Backup

**Path:** `/home/shelter/backups/pre-intake-recipient-deactivate-20260626-161651.db`
**Size:** 30MB, non-empty ✅

## STEP 1 — Inventory (read-only gate)

```
id  email                      name                active
--  -------------------------  ------------------  ------
1   flgnynjai@gmail.com        Test Staff          1     
3   sheltersupervisor@4lg.org  Shelter Supervisor  1     
4   info@4lg.org               Info Distribution   1
```

**Gate result: PASS** — exactly 3 rows, ids 1/3/4, emails match expected values, all active=1.

## STEP 2 — UPDATE

```sql
-- intake-alert paused ~6mo; production recipients deactivated, test address id=1 left ACTIVE
-- as intentional canary (Website 4 directive, relayed via Dashboard 17).
-- Reversible: set active=1 on id=3,4 to revive.
UPDATE intake_alert_recipients SET active=0 WHERE id=3 AND email='sheltersupervisor@4lg.org';
-- rows changed: 1
UPDATE intake_alert_recipients SET active=0 WHERE id=4 AND email='info@4lg.org';
-- rows changed: 1
```

## STEP 3 — Read-back Verify

```
id  email                      active
--  -------------------------  ------
1   flgnynjai@gmail.com        1     
3   sheltersupervisor@4lg.org  0     
4   info@4lg.org               0
```

| id | email | expected active | actual active | ✓ |
|----|-------|----------------|---------------|---|
| 1 | flgnynjai@gmail.com | 1 (canary) | 1 | ✅ |
| 3 | sheltersupervisor@4lg.org | 0 (deactivated) | 0 | ✅ |
| 4 | info@4lg.org | 0 (deactivated) | 0 | ✅ |

## Rollback

To reactivate:
```sql
UPDATE intake_alert_recipients SET active=1 WHERE id IN (3, 4);
```

Or restore from backup: `/home/shelter/backups/pre-intake-recipient-deactivate-20260626-161651.db`
