# Volunteer Age Change Audit Trail — Existence Check

**Date:** 2026-07-12  
**Type:** Read-only audit-risk investigation  
**Scope:** Does PATCH /api/volunteers/:id log age field changes with actor + timestamp + before/after?

---

## 1. The PATCH Handler [VERIFIED with code]

`PATCH /api/volunteers/:id` (server.ts ~10837–10910) does the following on a successful update:

```typescript
updateVolunteer(id, updates);
console.log(`[Volunteer] Updated volunteer ${id}`);
res.json({ success: true });
```

That `console.log` is the **only** record of the change. It logs to stdout (journalctl) with the volunteer id. It does NOT log:
- Which fields changed
- Before or after values
- Who made the edit
- The request body or payload

There is **no** write to any audit table, history table, changelog, or structured log. [VERIFIED]

## 2. Volunteer Audit Table [VERIFIED with schema]

**No volunteer audit/history table exists.** The database has these audit tables, none for volunteers:

| Table | Purpose |
|-------|---------|
| `feeding_audit` | Feeding record changes |
| `followup_eval_audit` | Follow-up evaluation transcripts |
| `matcher_audit` | Matcher search sessions |
| `sm_push_audit` | ShelterManager push events |
| `animal_bios_history` | Bio revision history |
| `activity_archive` | Archived activity sessions |

The volunteer-related tables are: `volunteers`, `volunteer_commitments`, `volunteer_declines`, `volunteer_timeclock`. None is an audit/history table. [VERIFIED]

## 3. Actor Capture [VERIFIED with code]

The PATCH handler does **not** capture who made the edit. There is:
- No `req.user`, `req.auth`, `req.identity`, `staffId`, or session info
- The X-Gate-Token is a **shared secret** — it authenticates that the caller has dashboard access, but does not identify which staff member. It's a single static token, not per-user.
- The `approvedBy` field is captured only on status→approved transitions (and stored in `approved_by`), not on general field edits
- No IP logging in the handler

**Actor is unknown for all non-approval edits.** [VERIFIED]

## 4. Before/After Values [VERIFIED with code]

The handler fetches `vol = getVolunteerById(id)` before applying updates, so the before-values ARE available in memory at the time of the edit. However, they are **not compared, logged, or stored** anywhere. The `updateVolunteer` function receives only the new values and overwrites them. No diff is computed or recorded.

The `last_modified_at` column is updated to `datetime('now')` on every PATCH — this gives a **timestamp** of the most recent change, but not what changed or who changed it. [VERIFIED]

## 5. Raw PATCH vs UI [VERIFIED with code]

The `console.log('[Volunteer] Updated volunteer ${id}')` is in the **server handler**, so both dashboard UI edits and raw curl PATCHes produce the same stdout line. However, since that line contains no field/value/actor info, it's equally uninformative for both paths.

There is no client-side audit logging in the dashboard either — the save function fires the PATCH and shows a success/failure toast. [VERIFIED]

## 6. Bottom Line

**(C) NOT logged at all.** An age field change (or any non-approval volunteer field change) leaves **no queryable trace** of who changed it, when the specific field changed, or what the before/after values were.

The only evidence is:
- `last_modified_at` column: timestamp of most recent edit (any field, not age-specific)
- `console.log` in journalctl: `[Volunteer] Updated volunteer <id>` (no fields, no values, no actor)

Neither constitutes an audit trail. A staff member could change a volunteer's age_18_or_older from 0 to 1 (minor→adult) via the dashboard or raw PATCH, and no record would exist of who did it or what the prior value was.
